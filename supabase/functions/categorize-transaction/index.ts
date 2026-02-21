// Supabase Edge Function: categorize-transaction
// Uses OpenRouter AI to categorize transactions based on body_plain and merchant

const categorizeCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Available categories for Chilean banking transactions
const CATEGORIES = [
  'Supermercado',
  'Combustible',
  'Restaurante',
  'Transporte',
  'Servicios',
  'Entretenimiento',
  'Otros',
]

// System prompt for the AI
const SYSTEM_PROMPT = `Eres un asistente de categorización de gastos bancarios chilenos.
Analiza el siguiente mensaje de transacción bancaria y determina la categoría más apropiada.

Categorías disponibles:
- Supermercado: compras en supermarkets como Walmart, Tottus, Jumbo, Líder, etc.
- Combustible: bencinas en estaciones como Shell, Copec, Petrobras, etc.
- Restaurante: restaurants, cafés, delivery de comida
- Transporte: Uber, taxis, Metro, buses, bencinas
- Servicios: cuentas de servicios como luz, agua, teléfono, internet, Netflix, Spotify
- Entretenimiento: cine, juegos, streaming, eventos
- Otros: cualquier gasto que no encaje en las categorías anteriores

Responde SOLO con el nombre de la categoría en español, sin puntuación adicional.
Ejemplo de respuesta válida: "Supermercado"`

interface CategorizationResult {
  category: string
  confidence: number
  model: string
}

async function callOpenRouter(
  bodyPlain: string,
  merchant: string | null,
  amount: number | null
): Promise<CategorizationResult> {
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
  
  if (!openRouterApiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }

  // Build the prompt with transaction details
  const userPrompt = `
Transaction Details:
- Merchant/Store: ${merchant || 'Unknown'}
- Amount: ${amount ? `$${amount.toLocaleString('es-CL')}` : 'Unknown'}
- Email Content:
${bodyPlain.substring(0, 2000)}

Determine the category:`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://gastonauta.supabase.co',
      'X-Title': 'Gastonauta',
    },
    body: JSON.stringify({
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 50,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenRouter API error: ${error}`)
  }

  const data = await response.json()
  const categoryRaw = data.choices?.[0]?.message?.content?.trim() || 'Otros'
  
  // Validate and normalize the category
  const category = CATEGORIES.find(c => 
    c.toLowerCase() === categoryRaw.toLowerCase()
  ) || 'Otros'

  // Extract confidence from usage if available
  const usage = data.usage || {}
  const confidence = usage.prompt_tokens && usage.completion_tokens
    ? Math.min(1, usage.completion_tokens / 100)
    : 0.8

  return {
    category,
    confidence,
    model: data.model || 'openrouter/free',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: categorizeCorsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase configuration' }),
        { status: 500, headers: { ...categorizeCorsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...categorizeCorsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { transaction_id, limit = 10 } = await req.json()

    const supabaseHeaders = {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
    }

    let transactions: Record<string, unknown>[] = []

    if (transaction_id) {
      // Categorize a single transaction
      const response = await fetch(
        `${supabaseUrl}/rest/v1/transactions?id=eq.${transaction_id}&select=*`,
        { headers: supabaseHeaders }
      )
      const data = await response.json()
      transactions = data || []
    } else {
      // Get uncategorized transactions (batch mode)
      const response = await fetch(
        `${supabaseUrl}/rest/v1/transactions?is_categorized=eq.false&category_id=is.null&body_plain=not.is.null&limit=${limit}`,
        { headers: supabaseHeaders }
      )
      const data = await response.json()
      transactions = data || []
    }

    const results = []

    for (const tx of transactions) {
      if (!tx.body_plain && !tx.merchant) {
        results.push({
          transaction_id: tx.id,
          success: false,
          error: 'No body_plain or merchant to analyze',
        })
        continue
      }

      try {
        const categorization = await callOpenRouter(
          (tx.body_plain as string) || '',
          tx.merchant as string | null,
          tx.amount as number | null
        )

        // Update transaction with category name directly
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/transactions?id=eq.${tx.id}`,
          {
            method: 'PATCH',
            headers: {
              ...supabaseHeaders,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              category_id: categorization.category,
              is_categorized: true,
              categorized_at: new Date().toISOString(),
              categorization_model: categorization.model,
              categorization_confidence: categorization.confidence,
            }),
          }
        )

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          throw new Error(`Failed to update: ${errorText}`)
        }

        results.push({
          transaction_id: tx.id,
          success: true,
          category: categorization.category,
          confidence: categorization.confidence,
          model: categorization.model,
        })

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        console.error(`Error categorizing transaction ${tx.id}:`, errMsg)
        results.push({
          transaction_id: tx.id,
          success: false,
          error: errMsg,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { ...categorizeCorsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Function error:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...categorizeCorsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
