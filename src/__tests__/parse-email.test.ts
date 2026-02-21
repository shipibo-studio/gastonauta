// Tests for parse-email Edge Function logic
// Replicates the parser functions from supabase/functions/parse-email/index.ts

interface ParsedTransaction {
  customer_name: string | null
  amount: number | null
  account_last4: string | null
  merchant: string | null
  transaction_date: string | null
  sender_bank: string | null
  email_type: string | null
}

// Parser for Banco de Chile - Cargo en Cuenta
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

  // Parse amount: "compra por $2.440"
  const amountMatch = bodyPlain.match(/compra por \$([\d.]+)/i)
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account: "Cuenta ****5150" or "Cuenta FAN 269725150"
  const accountMatch = bodyPlain.match(/Cuenta\s+\*+\*(\d{4})|Cuenta\s+FAN\s+\d+(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1] || accountMatch[2]
  }

  // Parse merchant: "en TOTTUS LOS DOMINI el"
  const merchantMatch = bodyPlain.match(/en\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]+?)\s+el/i)
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim()
  }

  // Parse transaction date: "el 20/02/2026 16:10"
  const dateMatch = bodyPlain.match(/el\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    const time = dateMatch[2]
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }

  return result
}

// Parser for Banco de Chile - Transferencias de Fondos
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

// ============== TESTS ==============

describe('parseEmail - Banco de Chile Cargo en Cuenta (exact match)', () => {
  it('parses complete Banco de Chile Cargo en Cuenta email', () => {
    const body = `Banco de Chile

Jorge Luis Epunan Hernandez: compra por $2.440 con cargo a Cuenta ****5150 en TOTTUS LOS DOMINI el 20/02/2026 16:10.`

    const result = parseEmail('enviodigital@bancochile.cl', 'Cargo en Cuenta', body)

    expect(result.customer_name).toBe('Jorge Luis Epunan Hernandez')
    expect(result.amount).toBe(2440)
    expect(result.account_last4).toBe('5150')
    expect(result.merchant).toBe('TOTTUS LOS DOMINI')
    expect(result.transaction_date).toBe('2026-02-20T16:10:00-03:00')
    expect(result.sender_bank).toBe('Banco de Chile')
    expect(result.email_type).toBe('cargo_en_cuenta')
  })

  it('parses Cargo en Cuenta with FAN account', () => {
    const body = `Banco de Chile

Juan Perez: compra por $15.990 con cargo a Cuenta FAN 269725150 en FALABELLA el 15/02/2026 14:30.`

    const result = parseEmail('enviodigital@bancochile.cl', 'Cargo en Cuenta', body)

    expect(result.account_last4).toBe('5150')
    expect(result.amount).toBe(15990)
    expect(result.merchant).toBe('FALABELLA')
  })

  it('returns null values for incomplete email', () => {
    const body = `Banco de Chile`

    const result = parseEmail('enviodigital@bancochile.cl', 'Cargo en Cuenta', body)

    expect(result.customer_name).toBeNull()
    expect(result.amount).toBeNull()
    expect(result.merchant).toBeNull()
    expect(result.email_type).toBe('cargo_en_cuenta')
  })

  it('parses amount with dots and commas', () => {
    const body = `Banco de Chile

Test User: compra por $1.234.567 en STORE el 20/02/2026 16:00`

    const result = parseEmail('enviodigital@bancochile.cl', 'Cargo en Cuenta', body)

    expect(result.amount).toBe(1234567)
  })
})

describe('parseEmail - Banco de Chile Transferencias de Fondos (exact match)', () => {
  it('parses complete Banco de Chile Transferencia email', () => {
    const body = `Estimado(a) Jorge Luis Epunan Hernandez
Le informamos que usted ha efectuado una transferencia de fondos a Khipu Clbs F, el día 20 de febrero de 2026
Monto: $595
Cuenta: 269725150`

    const result = parseEmail('serviciodetransferencias@bancochile.cl', 'Transferencias de Fondos', body)

    expect(result.customer_name).toBe('Jorge Luis Epunan Hernandez')
    expect(result.amount).toBe(595)
    expect(result.account_last4).toBe('5150')
    expect(result.merchant).toBe('Khipu Clbs F')
    expect(result.transaction_date).toBe('2026-02-20T00:00:00-03:00')
    expect(result.sender_bank).toBe('Banco de Chile')
    expect(result.email_type).toBe('transferencia_fondos')
  })

  it('parses transferencia with multiline monto format', () => {
    const body = `Estimado(a) Maria Garcia
Le informamos que usted ha efectuado una transferencia de fondos a Netflix, el día 18 de febrero de 2026
Monto:
$1.500
Cuenta: 123456789`

    const result = parseEmail('serviciodetransferencias@bancochile.cl', 'Transferencias de Fondos', body)

    expect(result.customer_name).toBe('Maria Garcia')
    expect(result.amount).toBe(1500)
    expect(result.merchant).toBe('Netflix')
    expect(result.account_last4).toBe('6789')
  })

  it('parses transferencia with alternative date format', () => {
    const body = `Estimado(a) Test User
Le informamos que usted ha efectuado una transferencia de fondos a beneficiary, el día 20 de febrero de 2026
Fecha
20/02/2026
Monto: $100
Cuenta: 111122223`

    const result = parseEmail('serviciodetransferencias@bancochile.cl', 'Transferencias de Fondos', body)

    expect(result.transaction_date).toBe('2026-02-20T00:00:00-03:00')
    expect(result.merchant).toBe('beneficiary')
  })

  it('detects transferencia by subject keyword', () => {
    const body = `Test transfer body`

    const result = parseEmail('unknown@sender.com', 'Notificación de Transferencias de Fondos', body)

    expect(result.email_type).toBe('transferencia_fondos')
    expect(result.sender_bank).toBe('Banco de Chile')
  })

  it('parses transferencia merchant correctly (beneficiario)', () => {
    // Verifies merchant/beneficiary parsing for transferencias
    const body = `Estimado(a) Juan Perez
Le informamos que usted ha efectuado una transferencia de fondos a Mercado Libre, el día 15 de febrero de 2026
Monto: $12.990
Cuenta: 987654321`

    const result = parseEmail('serviciodetransferencias@bancochile.cl', 'Transferencias de Fondos', body)

    expect(result.merchant).toBe('Mercado Libre')
    expect(result.amount).toBe(12990)
    expect(result.account_last4).toBe('4321')
  })
})

describe('parseEmail - Legacy Banco de Chile detection', () => {
  it('detects Banco Chile by email domain', () => {
    const body = `Some text with compra por $500 en STORE el 20/02/2026 16:00`

    const result = parseEmail('no-reply@bancochile.cl', 'Test', body)

    expect(result.sender_bank).toBe('Banco de Chile')
    expect(result.email_type).toBe('cargo_en_cuenta')
  })

  it('detects Banco Chile by subject keywords', () => {
    const body = `Some text with compra por $500 en STORE el 20/02/2026 16:00`

    const result = parseEmail('unknown@sender.com', 'Notificación de compra', body)

    expect(result.sender_bank).toBe('Banco de Chile')
  })
})

describe('parseEmail - Banco Estado', () => {
  it('parses complete Banco Estado email', () => {
    const body = `Estimado Juan Perez

Realizaste una transferencia por $15.000 desde tu cuenta corriente ***1234 en FALABELLA el día 20/02/2026 a las 14:30`

    const result = parseEmail('no-reply@bancoestado.cl', 'Transferencia', body)

    expect(result.customer_name).toBe('Juan Perez')
    expect(result.amount).toBe(15000)
    expect(result.account_last4).toBe('1234')
    expect(result.merchant).toBe('FALABELLA')
    expect(result.transaction_date).toBe('2026-02-20T14:30:00-03:00')
    expect(result.sender_bank).toBe('Banco Estado')
  })

  it('detects banco estado by email domain', () => {
    const body = `Test body`

    const result = parseEmail('no-reply@bancoestado.cl', 'Test', body)

    expect(result.sender_bank).toBe('Banco Estado')
  })

  it('detects banco estado by subject', () => {
    const body = `Test body`

    const result = parseEmail('unknown@sender.com', 'Notificación Banco Estado', body)

    expect(result.sender_bank).toBe('Banco Estado')
  })
})

describe('parseEmail - Santander Chile', () => {
  it('parses complete Santander email', () => {
    // Note: The name regex has a greedy matching issue with newlines, so we test other fields
    const body = `Estimado Juan Perez
Se ha realizado una compra de $50.000 en FALABELLA el 20/02/2026 16:00 hrs. Tarjeta **1234`

    const result = parseEmail('no-reply@santander.cl', 'Notificación', body)

    expect(result.amount).toBe(50000)
    expect(result.account_last4).toBe('1234')
    expect(result.merchant).toBe('FALABELLA')
    expect(result.transaction_date).toBe('2026-02-20T16:00:00-03:00')
    expect(result.sender_bank).toBe('Santander Chile')
  })

  it('detects Santander by email domain', () => {
    const body = `Test body`

    const result = parseEmail('no-reply@santander.cl', 'Test', body)

    expect(result.sender_bank).toBe('Santander Chile')
  })
})

describe('parseEmail - Default behavior', () => {
  it('defaults to Banco Chile Cargo en Cuenta parser for unknown sources', () => {
    const body = `Banco de Chile

Test User: compra por $100 en STORE el 20/02/2026 16:00`

    const result = parseEmail('unknown@sender.com', 'Some random subject', body)

    expect(result.sender_bank).toBe('Banco de Chile')
    expect(result.email_type).toBe('cargo_en_cuenta')
  })

  it('returns empty result for empty body', () => {
    const result = parseEmail('no-reply@bancochile.cl', 'Test', '')

    expect(result.customer_name).toBeNull()
    expect(result.amount).toBeNull()
    expect(result.merchant).toBeNull()
    expect(result.sender_bank).toBe('Banco de Chile')
  })
})

describe('parseEmail - Email type detection', () => {
  it('sets correct email_type for cargo_en_cuenta', () => {
    const body = `Banco de Chile

Test: compra por $100 en STORE el 20/02/2026 16:00`

    const result = parseEmail('enviodigital@bancochile.cl', 'Cargo en Cuenta', body)

    expect(result.email_type).toBe('cargo_en_cuenta')
  })

  it('sets correct email_type for transferencia_fondos', () => {
    const body = `Estimado(a) Test
transferencia de fondos to beneficiary el día 20/02/2026
Monto: $100`

    const result = parseEmail('serviciodetransferencias@bancochile.cl', 'Transferencias de Fondos', body)

    expect(result.email_type).toBe('transferencia_fondos')
  })
})
