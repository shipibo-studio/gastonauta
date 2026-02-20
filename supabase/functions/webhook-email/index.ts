// Supabase Edge Function: webhook-email
// Receives Banco de Chile email webhooks and stores parsed transactions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bearer token for webhook authentication
// Set this in Supabase secrets: supabase secrets set WEBHOOK_BEARER_TOKEN=your-secret-token
const BEARER_TOKEN = Deno.env.get('WEBHOOK_BEARER_TOKEN') || 'chg-webhook-2026-secure-token'

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

function parseBancoChileEmail(bodyPlain: string): {
  customer_name: string | null
  amount: number | null
  account_last4: string | null
  merchant: string | null
  transaction_date: string | null
} {
  const result = {
    customer_name: null as string | null,
    amount: null as number | null,
    account_last4: null as string | null,
    merchant: null as string | null,
    transaction_date: null as string | null,
  }

  if (!bodyPlain) return result

  // Parse customer name (first line after "Banco de Chile\n\n")
  const nameMatch = bodyPlain.match(/^Banco de Chile\s*\n\n([^:\n]+):/m)
  if (nameMatch) {
    result.customer_name = nameMatch[1].trim()
  }

  // Parse amount: "compra por $4.380" or "compra por $123.456"
  const amountMatch = bodyPlain.match(/compra por \$([\d.]+)/i)
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account: "Cuenta ****5150"
  const accountMatch = bodyPlain.match(/Cuenta\s*\*\*\*\*(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1]
  }

  // Parse merchant: "en SHELL.PATAGONI 75"
  const merchantMatch = bodyPlain.match(/en\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.\d]+?)\s+el/i)
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim()
  }

  // Parse transaction date: "el 18/02/2026 17:57"
  const dateMatch = bodyPlain.match(/el\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    const time = dateMatch[2]
    // Convert to ISO format with timezone
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }

  return result
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
    // For production, prefer using a custom token set in Supabase secrets
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

    // Parse transaction data from email body
    const parsedData = parseBancoChileEmail(emailData.body_plain || emailData.body_raw || '')

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
      sender_bank: 'Banco de Chile',
      email_type: 'transaction_notification',
    }

    // Initialize Supabase client with service role (for server-side operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
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
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
