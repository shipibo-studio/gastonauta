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

    // Send success notification
    await sendNotificationEmail('success', {
      messageId: emailData.message_id,
      merchant: parsedData.merchant,
      amount: parsedData.amount,
      emailType: parsedData.email_type,
      customerName: parsedData.customer_name,
      accountLast4: parsedData.account_last4,
      transactionDate: parsedData.transaction_date,
      senderBank: parsedData.sender_bank,
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: data?.[0] || null,
        parsed: parsedData 
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
