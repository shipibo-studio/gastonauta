// Supabase Edge Function: parse-email
// Generic email parser that detects email type and extracts transaction data

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParsedTransaction {
  customer_name: string | null
  amount: number | null
  account_last4: string | null
  merchant: string | null
  transaction_date: string | null
  sender_bank: string | null
  email_type: string | null
}

// Parser for Banco de Chile emails
function parseBancoChileEmail(bodyPlain: string): ParsedTransaction {
  const result: ParsedTransaction = {
    customer_name: null,
    amount: null,
    account_last4: null,
    merchant: null,
    transaction_date: null,
    sender_bank: 'Banco de Chile',
    email_type: 'transaction_notification',
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
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }

  return result
}

// Parser for Banco Estado emails
function parseBancoEstadoEmail(bodyPlain: string): ParsedTransaction {
  const result: ParsedTransaction = {
    customer_name: null,
    amount: null,
    account_last4: null,
    merchant: null,
    transaction_date: null,
    sender_bank: 'Banco Estado',
    email_type: 'transaction_notification',
  }

  if (!bodyPlain) return result

  // Parse customer name - match only first line after "Estimado"
  // Only capture up to the first newline, not the entire rest of the email
  const nameMatch = bodyPlain.match(/^Estimado\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/m)
  if (nameMatch) {
    result.customer_name = nameMatch[1].trim()
  }

  // Parse amount: "por $45.690" or "monto de $100.000"
  const amountMatch = bodyPlain.match(/(?:por|monto de)\s+\$([\d.]+)/i)
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account: "Cuenta corriente ***1234"
  const accountMatch = bodyPlain.match(/cuenta\s+(?:corriente\s*)?\*\*\*(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1]
  }

  // Parse merchant: "en COMERCIO XXX el"
  const merchantMatch = bodyPlain.match(/en\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.\d]+?)\s+(?:el|el\s+)/i)
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim()
  }

  // Parse date: "el día 20/02/2026 a las 16:30"
  const dateMatch = bodyPlain.match(/el\s+día\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+las\s+(\d{2}:\d{2})/i)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    const time = dateMatch[2]
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }

  return result
}

// Parser for Santander Chile emails
function parseSantanderEmail(bodyPlain: string): ParsedTransaction {
  const result: ParsedTransaction = {
    customer_name: null,
    amount: null,
    account_last4: null,
    merchant: null,
    transaction_date: null,
    sender_bank: 'Santander Chile',
    email_type: 'transaction_notification',
  }

  if (!bodyPlain) return result

  // Parse customer name
  const nameMatch = bodyPlain.match(/Estimado\s+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)/i)
  if (nameMatch) {
    result.customer_name = nameMatch[1].trim()
  }

  // Parse amount: "de $50.000" or "monto $75.990"
  const amountMatch = bodyPlain.match(/(?:de|monto)\s+\$([\d.]+)/i)
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account: "Tarjeta ***1234" or "Cuenta ***5678"
  const accountMatch = bodyPlain.match(/(?:tarjeta|cuenta)\s+\*\*(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1]
  }

  // Parse merchant
  const merchantMatch = bodyPlain.match(/en\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.\d]+?)(?:\s+el|\s+el\s+)/i)
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim()
  }

  // Parse date: "20/02/2026 16:00 hrs"
  const dateMatch = bodyPlain.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})\s*hrs/i)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    const time = dateMatch[2]
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }

  return result
}

// Main parser function that detects email type and routes to appropriate parser
function parseEmail(
  fromEmail: string | undefined,
  subject: string | undefined,
  bodyPlain: string
): ParsedTransaction {
  const emailSource = (fromEmail || '').toLowerCase()
  const emailSubject = (subject || '').toLowerCase()

  // Detect bank by from email
  if (emailSource.includes('bancochile') || emailSource.includes('banco.de.chile')) {
    return parseBancoChileEmail(bodyPlain)
  }

  if (emailSource.includes('bancoestado') || emailSource.includes('banco.estado')) {
    return parseBancoEstadoEmail(bodyPlain)
  }

  if (emailSource.includes('santander')) {
    return parseSantanderEmail(bodyPlain)
  }

  // Detect by subject keywords as fallback
  if (emailSubject.includes('banco de chile') || emailSubject.includes('compra por')) {
    return parseBancoChileEmail(bodyPlain)
  }

  if (emailSubject.includes('banco estado') || emailSubject.includes('transferencia')) {
    return parseBancoEstadoEmail(bodyPlain)
  }

  if (emailSubject.includes('santander')) {
    return parseSantanderEmail(bodyPlain)
  }

  // Default: try Banco Chile parser as default
  return parseBancoChileEmail(bodyPlain)
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { from_email, subject, body_plain, body_raw } = await req.json()

    // Validate required fields
    if (!body_plain && !body_raw) {
      return new Response(
        JSON.stringify({ error: 'Missing body_plain or body_raw' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse the email
    const parsed = parseEmail(from_email, subject, body_plain || body_raw || '')

    return new Response(
      JSON.stringify({
        success: true,
        parsed: parsed,
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
