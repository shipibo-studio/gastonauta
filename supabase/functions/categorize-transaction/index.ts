// Supabase Edge Function: categorize-transaction
// Uses OpenRouter AI to categorize transactions based on body_plain and merchant
// Categories are fetched from the database
// First tries to match keywords, then falls back to AI
const categorizeCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Fetch categories from database
async function fetchCategories(supabaseUrl, supabaseHeaders) {
  const response = await fetch(supabaseUrl + "/rest/v1/categories?is_active=eq.true&select=id,name,description,keywords&order=id", {
    headers: supabaseHeaders
  });
  const data = await response.json();
  return data || [];
}

// Build dynamic system prompt based on categories with keywords
function buildSystemPrompt(categories) {
  const categoryList = categories.map((cat)=>{
    let line = "- " + cat.name;
    if (cat.description) {
      line += ": " + cat.description;
    }
    if (cat.keywords && cat.keywords.length > 0) {
      line += " (keywords: " + cat.keywords.join(", ") + ")";
    }
    return line;
  }).join("\n");
  return "Eres un asistente de categorizacion de gastos bancarios chilenos.\nAnaliza el siguiente mensaje de transaccion bancaria y determina la categoria mas apropiada basandote en el contenido del email y las palabras clave de cada categoria.\n\nCategorias disponibles:\n" + categoryList + "\n\nResponde SOLO con el nombre de la categoria en espanol, sin puntuacion adicional.\nEjemplo de respuesta valida: \"Supermercado\"";
}

// Helper function to escape regex special characters
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Categorize by keywords - returns category if match found, null otherwise
// Categories are sorted by a priority order to ensure specific categories are checked first
function categorizeByKeywords(bodyPlain, merchant, categories) {
  // Combine body and merchant for searching
  const searchText = ((bodyPlain || '') + ' ' + (merchant || '')).toLowerCase();
  console.log('=== Starting keyword categorization ===');
  console.log('Search text:', searchText.substring(0, 200));
  
  // Define priority order - specific commerce categories first, then generic ones
  // Lower number = higher priority (checked first)
  // Categories NOT in this list get medium priority (10)
  const priorityOrder: Record<string, number> = {
    'Supermercado': 1,
    'Retail': 2,
    'E-Commerce': 3,
    'Restaurante': 4,
    'Combustible': 5,
    'Transporte': 6,
    'Entretenimiento': 7,
    'Alimentos': 8,
    'Servicios': 9,
    'Otros': 99  // Otros siempre al final
  };
  
  // Sort categories by priority order
  const sortedCategories = [...categories].sort((a, b) => {
    const aPriority = priorityOrder[a.name] ?? 99;
    const bPriority = priorityOrder[b.name] ?? 99;
    return aPriority - bPriority;
  });
  
  console.log('Categories sorted by priority:', sortedCategories.map((c)=>c.name));
  
  for (const cat of sortedCategories){
    if (cat.keywords && cat.keywords.length > 0) {
      console.log(`\nChecking category: ${cat.name}`);
      for (const keyword of cat.keywords){
        try {
          const escapedKeyword = escapeRegex(keyword.toLowerCase());
          console.log(`  Testing keyword: "${keyword}"`);
          // First try exact word boundary match (case-insensitive)
          const regexExact = new RegExp('\\b' + escapedKeyword + '\\b', 'i');
          if (regexExact.test(searchText)) {
            console.log('  -> EXACT word boundary match:', keyword, '->', cat.name);
            return {
              category: cat.name,
              confidence: 1.0,
              model: 'keyword'
            };
          }
          // Then try case-insensitive partial match (keyword appears anywhere)
          // Also check for word boundaries at start/end to avoid partial matches within words
          const regexPartial = new RegExp(escapedKeyword, 'i');
          if (regexPartial.test(searchText)) {
            console.log('  -> PARTIAL match:', keyword, '->', cat.name);
            return {
              category: cat.name,
              confidence: 0.9,
              model: 'keyword'
            };
          }
        } catch (err) {
          console.log('Invalid keyword regex:', keyword, err);
        }
      }
    }
  }
  console.log('=== No keyword match found ===');
  return null;
}
async function callOpenRouter(bodyPlain, merchant, amount, categories, supabaseUrl, supabaseServiceKey) {
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openRouterApiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }
  // Fetch LLM model from settings table
  let llmModel = 'openrouter/free';
  try {
    const settingsResponse = await fetch(supabaseUrl + "/rest/v1/settings?key=eq.llm_model&select=value", {
      headers: {
        'Authorization': 'Bearer ' + supabaseServiceKey,
        'apikey': supabaseServiceKey
      }
    });
    const settingsData = await settingsResponse.json();
    if (settingsData && settingsData.length > 0 && settingsData[0].value) {
      llmModel = settingsData[0].value;
    }
  } catch (err) {
    console.log('Error fetching LLM model from settings, using default:', err);
  }
  // Build dynamic system prompt
  const systemPrompt = buildSystemPrompt(categories);
  // Build the prompt with transaction details
  const userPrompt = `
Transaction Details:
- Merchant/Store: ${merchant || 'Unknown'}
- Amount: ${amount ? "$" + amount.toLocaleString('es-CL') : 'Unknown'}
- Email Content:
${bodyPlain.substring(0, 2000)}

Determine the category:`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + openRouterApiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://gastonauta.supabase.co',
      'X-Title': 'Gastonauta'
    },
    body: JSON.stringify({
      model: llmModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 50
    })
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error('OpenRouter API error: ' + error);
  }
  const data = await response.json();
  const categoryRaw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content ? data.choices[0].message.content.trim() : 'Otros') || 'Otros';
  // Validate and normalize the category against database categories
  const categoryNames = categories.map((c)=>c.name);
  const normalizedCategory = categoryNames.find((c)=>c.toLowerCase() === categoryRaw.toLowerCase()) || 'Otros';
  // Extract confidence from usage if available
  const usage = data.usage || {};
  const confidence = usage.prompt_tokens && usage.completion_tokens ? Math.min(1, usage.completion_tokens / 100) : 0.8;
  return {
    category: normalizedCategory,
    confidence,
    model: data.model || 'openrouter/free'
  };
}
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: categorizeCorsHeaders
    });
  }
  try {
    // Note: This function uses service role key for database operations
    // No user authentication required since it performs server-side categorization
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: 'Missing Supabase configuration'
      }), {
        status: 500,
        headers: {
          ...categorizeCorsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: 'Method not allowed'
      }), {
        status: 405,
        headers: {
          ...categorizeCorsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { transaction_id, limit = 10 } = await req.json();
    const supabaseHeaders = {
      'Authorization': 'Bearer ' + supabaseServiceKey,
      'apikey': supabaseServiceKey
    };
    // Fetch categories from database
    const categories = await fetchCategories(supabaseUrl, supabaseHeaders);
    console.log('=== Categories loaded from database ===');
    console.log('Total categories:', categories.length);
    for (const cat of categories){
      console.log(`- ${cat.name}: keywords = ${cat.keywords ? cat.keywords.join(', ') : '(none)'}`);
    }
    console.log('========================================\n');
    if (categories.length === 0) {
      return new Response(JSON.stringify({
        error: 'No categories configured. Please add categories in Settings.'
      }), {
        status: 400,
        headers: {
          ...categorizeCorsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    let transactions = [];
    if (transaction_id) {
      // Categorize a single transaction
      const response = await fetch(supabaseUrl + "/rest/v1/transactions?id=eq." + transaction_id + "&select=*", {
        headers: supabaseHeaders
      });
      const data = await response.json();
      transactions = data || [];
    } else {
      // Get uncategorized transactions (batch mode)
      const response = await fetch(supabaseUrl + "/rest/v1/transactions?is_categorized=eq.false&category_id=is.null&body_plain=not.is.null&limit=" + limit, {
        headers: supabaseHeaders
      });
      const data = await response.json();
      transactions = data || [];
    }
    const results = [];
    for (const tx of transactions){
      if (!tx.body_plain && !tx.merchant) {
        results.push({
          transaction_id: tx.id,
          success: false,
          error: 'No body_plain or merchant to analyze'
        });
        continue;
      }
      try {
        // First, try to categorize by keywords
        const keywordResult = categorizeByKeywords(tx.body_plain || '', tx.merchant, categories);
        let categorization;
        if (keywordResult) {
          // Keyword match found, use it
          categorization = keywordResult;
          console.log('Using keyword-based category:', categorization.category);
        } else {
          // No keyword match, use AI
          console.log('No keyword match found, falling back to AI');
          categorization = await callOpenRouter(tx.body_plain || '', tx.merchant, tx.amount, categories, supabaseUrl, supabaseServiceKey);
        }
        // Find category ID by name (case-insensitive)
        const matchedCategory = categories.find((c)=>c.name.toLowerCase() === categorization.category.toLowerCase());
        const categoryIdToSave = matchedCategory ? matchedCategory.id : categorization.category;
        // Update transaction with category ID
        const updateResponse = await fetch(supabaseUrl + "/rest/v1/transactions?id=eq." + tx.id, {
          method: 'PATCH',
          headers: {
            ...supabaseHeaders,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            category_id: categoryIdToSave,
            is_categorized: true,
            categorized_at: new Date().toISOString(),
            categorization_model: categorization.model,
            categorization_confidence: categorization.confidence
          })
        });
        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          throw new Error('Failed to update: ' + errorText);
        }
        results.push({
          transaction_id: tx.id,
          success: true,
          category: categorization.category,
          confidence: categorization.confidence,
          model: categorization.model
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error("Error categorizing transaction " + tx.id + ":", errMsg);
        results.push({
          transaction_id: tx.id,
          success: false,
          error: errMsg
        });
      }
    }
    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results
    }), {
      status: 200,
      headers: {
        ...categorizeCorsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Function error:', errorMessage);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: {
        ...categorizeCorsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
