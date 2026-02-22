// Supabase Edge Function: webhook-email
// Receives email webhooks, uses parse-email to extract transaction data, and stores in Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bearer token for webhook authentication
const BEARER_TOKEN = Deno.env.get('WEBHOOK_BEARER_TOKEN') || 'chg-webhook-2026-secure-token'

// Resend configuration for email notifications
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const NOTIFICATION_EMAIL = Deno.env.get('NOTIFICATION_EMAIL') || 'notifications@gastonauta.com'

// Available categories for categorization
const CATEGORIES = [
  'Supermercado',
  'Combustible',
  'Restaurante',
  'Transporte',
  'Servicios',
  'Entretenimiento',
  'Otros',
]

// System prompt for AI categorization
const CATEGORIZATION_PROMPT = `Eres un asistente de categorización de gastos bancarios chilenos.
Analiza el siguiente mensaje de transacción bancaria y determina la categoría más apropiada.

Categorías disponibles:
- Supermercado: compras en supermarkets como Walmart, Tottus, Jumbo, Líder, etc.
- Combustible: bencinas en estaciones como Shell, Copec, Petrobras, etc.
- Restaurante: restaurants, cafés, delivery de comida
- Transporte: Uber, taxis, Metro, buses
- Servicios: cuentas de servicios como luz, agua, teléfono, internet, Netflix, Spotify
- Entretenimiento: cine, juegos, streaming, eventos
- Otros: cualquier gasto que no encaje en las categorías anteriores

Responde SOLO con el nombre de la categoría en español, sin puntuación adicional.`

// Email notification function using Resend API directly
async function sendNotificationEmail(
  type: 'success' | 'error',
  data: {
    messageId?: string
    merchant?: string | null
    amount?: number | null
    emailType?: string | null
    customerName?: string | null
    accountLast4?: string | null
    transactionDate?: string | null
    senderBank?: string | null
    category?: string | null
    categorizationModel?: string | null
    error?: string
  }
) {
  if (!RESEND_API_KEY) {
    console.log('RESEND_API_KEY not configured, skipping notification')
    return
  }

  const isSuccess = type === 'success'
  
  // Determine email type label
  const emailTypeLabel = data.emailType === 'cargo_en_cuenta' 
    ? 'Cargo en Cuenta' 
    : data.emailType === 'transferencia_fondos' 
      ? 'Transferencia de Fondos' 
      : 'Transacción'
  
  const subject = isSuccess 
    ? `${emailTypeLabel} guardado - ${data.merchant || data.customerName || 'Transacción'}` 
    : `Error al guardar email`

  const htmlContent = isSuccess
    ? `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">✅ ${emailTypeLabel} guardado exitosamente</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Tipo</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${emailTypeLabel}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>${data.emailType === 'transferencia_fondos' ? 'Beneficiario' : 'Comercio'}</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${data.merchant || 'No detectado'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Monto</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${data.amount ? `${data.amount.toLocaleString('es-CL')}` : 'No detectado'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Banco</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${data.senderBank || 'Banco de Chile'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Fecha Transacción</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${data.transactionDate ? new Date(data.transactionDate).toLocaleString('es-CL') : 'No detectada'}</td>
          </tr>
          ${data.category ? `
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Categoría</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; color: #8b5cf6; font-weight: bold;">${data.category}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Fecha Recepción</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toLocaleString('es-CL')}</td>
          </tr>
        </table>
        <p style="color: #6b7280; margin-top: 20px;">
          Este es un notification automático de <strong>Gastonauta</strong>
        </p>
      </div>
    `
    : `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">❌ Error al guardar email</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Message ID</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${data.messageId || 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Error</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb; color: #ef4444;">${data.error || 'Error desconocido'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #e5e7eb;"><strong>Fecha</strong></td>
            <td style="padding: 8px; border: 1px solid #e5e7eb;">${new Date().toLocaleString('es-CL')}</td>
          </tr>
        </table>
        <p style="color: #6b7280; margin-top: 20px;">
          Este es un notification automático de <strong>Gastonauta</strong>
        </p>
      </div>
    `

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Gastonauta <onboarding@resend.dev>',
        to: [NOTIFICATION_EMAIL],
        subject: subject,
        html: htmlContent,
      }),
    })
    
    const result = await response.json()
    console.log('Notification email sent:', result)
  } catch (error) {
    console.error('Failed to send notification email:', error)
  }
}

// AI categorization function using OpenRouter
async function categorizeTransaction(
  bodyPlain: string,
  merchant: string | null,
  amount: number | null,
  transactionId?: string
): Promise<{ category: string; confidence: number; model: string } | null> {
  const openRouterApiKey = Deno.env.get('OPENROUTER_API_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!openRouterApiKey || !supabaseUrl || !supabaseServiceKey) {
    console.log('Missing API keys for categorization, skipping')
    return null
  }

  // Fetch LLM model from settings table
  let llmModel = 'openrouter/free'
  try {
    const settingsResponse = await fetch(
      `${supabaseUrl}/rest/v1/settings?key=eq.llm_model&select=value`,
      {
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'apikey': supabaseServiceKey,
        },
      }
    )
    const settingsData = await settingsResponse.json()
    if (settingsData && settingsData.length > 0 && settingsData[0].value) {
      llmModel = settingsData[0].value
    }
  } catch (err) {
    console.log('Error fetching LLM model from settings, using default:', err)
  }

  try {
    const userPrompt = `
Transaction Details:
- Merchant/Store: ${merchant || 'Unknown'}
- Amount: ${amount ? `${amount.toLocaleString('es-CL')}` : 'Unknown'}
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
        model: llmModel,
        messages: [
          { role: 'system', content: CATEGORIZATION_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 50,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenRouter API error:', error)
      // Log error
      if (supabaseUrl && supabaseServiceKey) {
        const logSupabase = createClient(supabaseUrl, supabaseServiceKey)
        await logSupabase.from('activity_logs').insert({
          operation_type: 'categorize_transaction_error',
          status: 'error',
          entity_id: transactionId || null,
          details: { merchant, amount, error: error.substring(0, 500) },
          error_message: error.substring(0, 1000),
        })
      }
      return null
    }

    const data = await response.json()
    const categoryRaw = data.choices?.[0]?.message?.content?.trim() || 'Otros'

    // Validate and normalize the category
    const category = CATEGORIES.find(c =>
      c.toLowerCase() === categoryRaw.toLowerCase()
    ) || 'Otros'

    const usage = data.usage || {}
    const confidence = usage.prompt_tokens && usage.completion_tokens
      ? Math.min(1, usage.completion_tokens / 100)
      : 0.5

    // Log success
    if (supabaseUrl && supabaseServiceKey) {
      const logSupabase = createClient(supabaseUrl, supabaseServiceKey)
      await logSupabase.from('activity_logs').insert({
        operation_type: 'categorize_transaction_success',
        status: 'success',
        entity_id: transactionId || null,
        details: { merchant, amount, category, model: data.model || llmModel, confidence },
      })
    }

    return {
      category,
      confidence,
      model: data.model || 'openrouter/free',
    }
  } catch (error) {
    console.error('Error in categorization:', error)
    // Log error
    if (supabaseUrl && supabaseServiceKey) {
      const logSupabase = createClient(supabaseUrl, supabaseServiceKey)
      await logSupabase.from('activity_logs').insert({
        operation_type: 'categorize_transaction_error',
        status: 'error',
        entity_id: transactionId || null,
        details: { merchant, amount },
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
    return null
  }
}

interface EmailData {
  date?: string
  from_name?: string
  from_email?: string
  message_id?: string
  body_raw?: string
  body_plain?: string
  subject?: string
  body_html?: string
}

// Updated interface to include category
interface NotificationData {
  messageId?: string
  merchant?: string | null
  amount?: number | null
  emailType?: string | null
  customerName?: string | null
  accountLast4?: string | null
  transactionDate?: string | null
  senderBank?: string | null
  category?: string | null
  categorizationModel?: string | null
  error?: string
}

function parseEmailDate(dateStr: string | undefined): string | null {
  if (!dateStr) return null
  
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return null
    return date.toISOString()
  } catch {
    return null
  }
}

// Call the parse-email Edge Function to extract transaction data
async function parseEmailWithFunction(
  supabaseUrl: string,
  serviceKey: string,
  emailData: EmailData
): Promise<{
  customer_name: string | null
  amount: number | null
  account_last4: string | null
  merchant: string | null
  transaction_date: string | null
  sender_bank: string | null
  email_type: string | null
  is_expense: boolean
}> {
  const parseUrl = `${supabaseUrl}/functions/v1/parse-email`
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4d2pibHV2eGV1c3h0cHN0dnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzU5MDQsImV4cCI6MjA4NzAxMTkwNH0.R_EG2M_mkupDymZzcmj1HWOScHk_12V9WqML0uy053w'
  
  const response = await fetch(parseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
    },
    body: JSON.stringify({
      from_email: emailData.from_email,
      subject: emailData.subject,
      body_plain: emailData.body_plain,
      body_raw: emailData.body_raw,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Parse function failed: ${error}`)
  }

  const result = await response.json()
  return result.parsed
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get headers
    const apikey = req.headers.get('apikey')
    const authHeader = req.headers.get('authorization')
    
    // Extract token from Authorization header
    const token = authHeader?.replace('Bearer ', '')
    
    // Check for custom bearer token (more secure than using anon key)
    const expectedToken = Deno.env.get('WEBHOOK_BEARER_TOKEN')
    
    // Allow custom bearer token OR Supabase JWT (anon key)
    if (expectedToken && token === expectedToken) {
      // Valid custom bearer token - OK
    } else if (!token?.startsWith('eyJ')) {
      // No valid token provided
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const emailData: EmailData = await req.json()

    // Validate required fields
    if (!emailData.message_id) {
      return new Response(
        JSON.stringify({ error: 'Missing message_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client with service role (for server-side operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Call parse-email function to extract transaction data
    const parsedData = await parseEmailWithFunction(supabaseUrl, supabaseServiceKey, emailData)

    // Prepare transaction record
    const transactionRecord = {
      email_date: parseEmailDate(emailData.date),
      from_name: emailData.from_name,
      from_email: emailData.from_email,
      message_id: emailData.message_id,
      subject: emailData.subject,
      body_raw: emailData.body_raw,
      body_plain: emailData.body_plain,
      body_html: emailData.body_html,
      customer_name: parsedData.customer_name,
      amount: parsedData.amount,
      account_last4: parsedData.account_last4,
      merchant: parsedData.merchant,
      transaction_date: parsedData.transaction_date,
      sender_bank: parsedData.sender_bank,
      email_type: parsedData.email_type,
      is_expense: parsedData.is_expense,
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Insert into transactions table (upsert to handle duplicates)
    const { data, error } = await supabase
      .from('transactions')
      .upsert([transactionRecord], { onConflict: 'message_id' })
      .select()

    if (error) {
      // Check if it's a duplicate error
      if (error.code === '23505') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Duplicate transaction already exists',
            message_id: emailData.message_id 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.error('Database error:', error)
      
      // Log to activity_logs
      await supabase.from('activity_logs').insert({
        operation_type: 'webhook_email_error',
        status: 'error',
        entity_id: emailData.message_id,
        details: { 
          merchant: parsedData?.merchant, 
          amount: parsedData?.amount,
          email_type: parsedData?.email_type,
          sender_bank: parsedData?.sender_bank
        },
        error_message: error.message,
      })
      
      // Send error notification
      await sendNotificationEmail('error', {
        messageId: emailData.message_id,
        error: error.message,
      })
      
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log success
    await supabase.from('activity_logs').insert({
      operation_type: 'webhook_email_success',
      status: 'success',
      entity_id: emailData.message_id,
      details: { 
        merchant: parsedData.merchant, 
        amount: parsedData.amount,
        email_type: parsedData.email_type,
        sender_bank: parsedData.sender_bank,
        customer_name: parsedData.customer_name,
        account_last4: parsedData.account_last4,
        transaction_date: parsedData.transaction_date
      },
    })

    // Get the inserted transaction ID
    const transactionId = data?.[0]?.id

    // Categorize the transaction using AI
    let categorizationResult = null
    if (transactionId && emailData.body_plain) {
      categorizationResult = await categorizeTransaction(
        emailData.body_plain,
        parsedData.merchant,
        parsedData.amount,
        transactionId
      )

      // Update transaction with categorization if successful
      if (categorizationResult && transactionId) {
        await supabase
          .from('transactions')
          .update({
            category_id: categorizationResult.category,
            is_categorized: true,
            categorized_at: new Date().toISOString(),
            categorization_model: categorizationResult.model,
            categorization_confidence: categorizationResult.confidence,
          })
          .eq('id', transactionId)
      }
    }

    // Send success notification with category
    await sendNotificationEmail('success', {
      messageId: emailData.message_id,
      merchant: parsedData.merchant,
      amount: parsedData.amount,
      emailType: parsedData.email_type,
      customerName: parsedData.customer_name,
      accountLast4: parsedData.account_last4,
      transactionDate: parsedData.transaction_date,
      senderBank: parsedData.sender_bank,
      category: categorizationResult?.category || null,
      categorizationModel: categorizationResult?.model || null,
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data?.[0] || null,
        parsed: parsedData,
        categorization: categorizationResult
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
