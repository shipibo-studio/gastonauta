// Supabase Edge Function: parse-email
// Generic email parser that detects email type and extracts transaction data
// Routes to specific parsers based on from_email + subject

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

// Parser for Banco de Chile - Cargo en Cuenta (from enviodigital@bancochile.cl)
// Real email format:
// Banco de Chile
// Jorge Luis Epunan Hernandez:
// Te informamos que se ha realizado una compra por $2.440 con cargo a Cuenta ****5150 en TOTTUS LOS DOMINI el 20/02/2026 16:10.
// OR (newer format with dashes and p. m.):
// Fecha Transacción	18-02-2026, 4:40:00 p. m.
// Monto	30.680
function parseBancoChileCargoEnCuenta(bodyPlain: string): ParsedTransaction {
  const result: ParsedTransaction = {
    customer_name: null,
    amount: null,
    account_last4: null,
    merchant: null,
    transaction_date: null,
    sender_bank: 'Banco de Chile',
    email_type: 'cargo_en_cuenta',
  }

  if (!bodyPlain) return result

  // Parse customer name: "Jorge Luis Epunan Hernandez:"
  const nameMatch = bodyPlain.match(/^Banco de Chile\s*\n\n([^:\n]+):/m)
  if (nameMatch) {
    result.customer_name = nameMatch[1].trim()
  }

  // Parse amount: "compra por $2.440" or "Monto	30.680" (no $ sign in newer format)
  const amountMatch = bodyPlain.match(/compra por \$([\d.]+)|Monto\s+([\d.]+)/i)
  if (amountMatch) {
    const amountStr = (amountMatch[1] || amountMatch[2]).replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account: "Cuenta ****5150" or "Cuenta FAN 269725150"
  const accountMatch = bodyPlain.match(/Cuenta\s+\*+\*(\d{4})|Cuenta\s+FAN\s+\d+(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1] || accountMatch[2]
  }

  // Parse merchant: "en TOTTUS LOS DOMINI el" OR "Comercio MERPAGO*ARTICULOS"
  // Handles uppercase, lowercase, asterisks, dots, numbers
  // Examples: MERPAGO*ARTICULOS, Red Movilidad San, PAYU *UBER TRIP, SHELL.PATAGONI 75
  let merchantMatch = bodyPlain.match(/en\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ\s.*\d]+?)\s+(?:el\b|el\s)/i)
  
  // Also try to match "Comercio" field format: "Comercio\tMERPAGO*ARTICULOS" or "Comercio MERPAGO"
  if (!merchantMatch) {
    merchantMatch = bodyPlain.match(/Comercio\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9][A-Za-zÁÉÍÓÚÑáéíóúñ\s.*\d]+)/i)
  }
  
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim()
  }

  // Parse transaction date: "el 20/02/2026 16:10" OR "18-02-2026, 4:40:00 p. m."
  // Format 1: dd/mm/yyyy HH:MM
  let dateMatch = bodyPlain.match(/el\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    const time = dateMatch[2]
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }
  
  // Format 2: dd-mm-yyyy, H:MM:SS p. m. (12-hour with period)
  dateMatch = bodyPlain.match(/(\d{2})-(\d{2})-(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(p\.\s*m\.|a\.\s*m\.)/i)
  if (dateMatch) {
    const day = dateMatch[1]
    const month = dateMatch[2]
    const year = dateMatch[3]
    let hours = parseInt(dateMatch[4])
    const minutes = dateMatch[5]
    const seconds = dateMatch[6]
    const period = dateMatch[7].toLowerCase()
    
    // Convert 12-hour to 24-hour
    if (period.startsWith('p') && hours < 12) {
      hours += 12
    } else if (period.startsWith('a') && hours === 12) {
      hours = 0
    }
    
    result.transaction_date = `${year}-${month}-${day}T${hours.toString().padStart(2, '0')}:${minutes}:${seconds}-03:00`
  }

  return result
}

// Parser for Banco de Chile - Transferencias de Fondos (from serviciodetransferencias@bancochile.cl)
// Real email format:
// Estimado(a) Jorge Luis Epunan Hernandez
// Le informamos que usted ha efectuado una transferencia de fondos a Khipu Clbs F, el día 20 de febrero de 2026
// Monto: $595
// Cuenta: 269725150 (last 4 = 5150)
function parseBancoChileTransferencia(bodyPlain: string): ParsedTransaction {
  const result: ParsedTransaction = {
    customer_name: null,
    amount: null,
    account_last4: null,
    merchant: null,
    transaction_date: null,
    sender_bank: 'Banco de Chile',
    email_type: 'transferencia_fondos',
  }

  if (!bodyPlain) return result

  // Parse customer name: "Estimado(a) Jorge Luis Epunan Hernandez"
  const nameMatch = bodyPlain.match(/Estimado\(a\)\s+([^\n]+)/i)
  if (nameMatch) {
    result.customer_name = nameMatch[1].trim()
  }

  // Parse recipient/merchant (transfer to): "transferencia de fondos a Khipu Clbs F"
  const recipientMatch = bodyPlain.match(/transferencia de fondos a\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)(?:,|el)/im)
  if (recipientMatch) {
    result.merchant = recipientMatch[1].trim()
  }

  // Parse amount: "Monto:\n$595" (with newlines in real email)
  const amountMatch = bodyPlain.match(/Monto\s*\n\s*\$([\d.]+)|Monto\s*:\s*\$([\d.]+)/i)
  if (amountMatch) {
    const amountStr = (amountMatch[1] || amountMatch[2]).replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account: "Cuenta: 269725150" - get last 4 digits
  const accountMatch = bodyPlain.match(/Cuenta\s*:\s*\d+(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1]
  }

  // Parse date: "el día 20 de febrero de 2026" or "20/02/2026"
  const dateMatch = bodyPlain.match(/el\s+día\s+(\d{2})\s+de\s+\w+\s+de\s+(\d{4})/i)
  if (dateMatch) {
    const day = dateMatch[1]
    const monthMap: Record<string, string> = {
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12'
    }
    const year = dateMatch[2]
    // Find month in body
    const monthMatch = bodyPlain.match(/el\s+día\s+\d+\s+de\s+(\w+)\s+de\s+\d{4}/i)
    const month = monthMatch ? (monthMap[monthMatch[1].toLowerCase()] || '01') : '01'
    result.transaction_date = `${year}-${month}-${day}T00:00:00-03:00`
  }

  // Alternative: "Fecha\n20/02/2026"
  const dateMatchAlt = bodyPlain.match(/Fecha\s*\n\s*(\d{2}\/\d{2}\/\d{4})/i)
  if (dateMatchAlt) {
    const [day, month, year] = dateMatchAlt[1].split('/')
    result.transaction_date = `${year}-${month}-${day}T00:00:00-03:00`
  }

  // Parse sender bank: "Banco: Banco Security"
  const senderBankMatch = bodyPlain.match(/Banco\s*\n\s*([^\n]+)/i)
  if (senderBankMatch) {
    result.sender_bank = senderBankMatch[1].trim()
  }

  return result
}

// Parser for Banco Estado emails (legacy support)
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

// Parser for Santander Chile emails (legacy support)
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

// Main parser function that routes to specific parsers based on from_email + subject
function parseEmail(
  fromEmail: string | undefined,
  subject: string | undefined,
  bodyPlain: string
): ParsedTransaction {
  const emailSource = (fromEmail || '').toLowerCase()
  const emailSubject = (subject || '').toLowerCase()

  // === Banco de Chile: Cargo en Cuenta ===
  // Filter: from_email = "enviodigital@bancochile.cl" AND subject = "Cargo en Cuenta"
  if (
    emailSource === 'enviodigital@bancochile.cl' && 
    emailSubject === 'cargo en cuenta'
  ) {
    return parseBancoChileCargoEnCuenta(bodyPlain)
  }

  // === Banco de Chile: Transferencias de Fondos ===
  // Filter: from_email = "serviciodetransferencias@bancochile.cl" AND subject contains "Transferencias de Fondos"
  if (
    emailSource === 'serviciodetransferencias@bancochile.cl' && 
    emailSubject.includes('transferencias de fondos')
  ) {
    return parseBancoChileTransferencia(bodyPlain)
  }

  // === Legacy detection by from_email domain ===
  if (emailSource.includes('bancochile') || emailSource.includes('banco.de.chile')) {
    // Default to Cargo en Cuenta parser for Banco Chile
    return parseBancoChileCargoEnCuenta(bodyPlain)
  }

  if (emailSource.includes('bancoestado') || emailSource.includes('banco.estado')) {
    return parseBancoEstadoEmail(bodyPlain)
  }

  if (emailSource.includes('santander')) {
    return parseSantanderEmail(bodyPlain)
  }

  // === Legacy detection by subject keywords ===
  if (emailSubject.includes('cargo en cuenta') || emailSubject.includes('compra por')) {
    return parseBancoChileCargoEnCuenta(bodyPlain)
  }

  if (emailSubject.includes('transferencia') || emailSubject.includes('transferencias de fondos')) {
    return parseBancoChileTransferencia(bodyPlain)
  }

  if (emailSubject.includes('banco estado')) {
    return parseBancoEstadoEmail(bodyPlain)
  }

  if (emailSubject.includes('santander')) {
    return parseSantanderEmail(bodyPlain)
  }

  // Default: try Banco Chile Cargo en Cuenta parser
  return parseBancoChileCargoEnCuenta(bodyPlain)
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
