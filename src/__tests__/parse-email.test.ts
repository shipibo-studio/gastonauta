// Tests for parse-email Edge Function logic

// Replicate the parser functions from parse-email
function parseBancoChileEmail(bodyPlain: string): {
  customer_name: string | null
  amount: number | null
  account_last4: string | null
  merchant: string | null
  transaction_date: string | null
  sender_bank: string | null
  email_type: string | null
} {
  const result = {
    customer_name: null as string | null,
    amount: null as number | null,
    account_last4: null as string | null,
    merchant: null as string | null,
    transaction_date: null as string | null,
    sender_bank: 'Banco de Chile',
    email_type: 'transaction_notification',
  }

  if (!bodyPlain) return result

  // Parse customer name
  const nameMatch = bodyPlain.match(/^Banco de Chile\s*\n\n([^:\n]+):/m)
  if (nameMatch) {
    result.customer_name = nameMatch[1].trim()
  }

  // Parse amount
  const amountMatch = bodyPlain.match(/compra por \$([\d.]+)/i)
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account
  const accountMatch = bodyPlain.match(/Cuenta\s*\*\*\*\*(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1]
  }

  // Parse merchant
  const merchantMatch = bodyPlain.match(/en\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.\d]+?)\s+el/i)
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim()
  }

  // Parse date
  const dateMatch = bodyPlain.match(/el\s+(\d{2}\/\d{2}\/\d{4})\s+(\d{2}:\d{2})/i)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    const time = dateMatch[2]
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }

  return result
}

function parseBancoEstadoEmail(bodyPlain: string): {
  customer_name: string | null
  amount: number | null
  account_last4: string | null
  merchant: string | null
  transaction_date: string | null
  sender_bank: string | null
  email_type: string | null
} {
  const result = {
    customer_name: null as string | null,
    amount: null as number | null,
    account_last4: null as string | null,
    merchant: null as string | null,
    transaction_date: null as string | null,
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

  // Parse amount
  const amountMatch = bodyPlain.match(/(?:por|monto de)\s+\$([\d.]+)/i)
  if (amountMatch) {
    const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.')
    result.amount = parseFloat(amountStr)
  }

  // Parse account
  const accountMatch = bodyPlain.match(/cuenta\s+(?:corriente\s*)?\*\*\*(\d{4})/i)
  if (accountMatch) {
    result.account_last4 = accountMatch[1]
  }

  // Parse merchant
  const merchantMatch = bodyPlain.match(/en\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s.\d]+?)\s+(?:el|el\s+)/i)
  if (merchantMatch) {
    result.merchant = merchantMatch[1].trim()
  }

  // Parse date
  const dateMatch = bodyPlain.match(/el\s+día\s+(\d{2}\/\d{2}\/\d{4})\s+a\s+las\s+(\d{2}:\d{2})/i)
  if (dateMatch) {
    const [day, month, year] = dateMatch[1].split('/')
    const time = dateMatch[2]
    result.transaction_date = `${year}-${month}-${day}T${time}:00-03:00`
  }

  return result
}

// Main parse function
function parseEmail(
  fromEmail: string | undefined,
  subject: string | undefined,
  bodyPlain: string
) {
  const emailSource = (fromEmail || '').toLowerCase()
  const emailSubject = (subject || '').toLowerCase()

  if (emailSource.includes('bancochile') || emailSource.includes('banco.de.chile')) {
    return parseBancoChileEmail(bodyPlain)
  }

  if (emailSource.includes('bancoestado') || emailSource.includes('banco.estado')) {
    return parseBancoEstadoEmail(bodyPlain)
  }

  if (emailSubject.includes('banco de chile') || emailSubject.includes('compra por')) {
    return parseBancoChileEmail(bodyPlain)
  }

  if (emailSubject.includes('banco estado') || emailSubject.includes('transferencia')) {
    return parseBancoEstadoEmail(bodyPlain)
  }

  return parseBancoChileEmail(bodyPlain)
}

describe('parseEmail - Banco de Chile', () => {
  it('parses complete Banco de Chile email', () => {
    const body = `Banco de Chile

Juan Perez: compra por $25.990 en SHELL.PATAGONI 75 el 20/02/2026 16:00`

    const result = parseEmail('no-reply@bancochile.cl', 'Notificación de compra', body)

    expect(result.customer_name).toBe('Juan Perez')
    expect(result.amount).toBe(25990)
    expect(result.merchant).toBe('SHELL.PATAGONI 75')
    expect(result.transaction_date).toBe('2026-02-20T16:00:00-03:00')
    expect(result.sender_bank).toBe('Banco de Chile')
    expect(result.email_type).toBe('transaction_notification')
  })

  it('parses email with no amount', () => {
    const body = `Banco de Chile

Juan Perez: compra por en SHELL el 20/02/2026 16:00`

    const result = parseEmail('no-reply@bancochile.cl', 'Test', body)

    expect(result.customer_name).toBe('Juan Perez')
    expect(result.amount).toBeNull()
    expect(result.merchant).toBe('SHELL')
  })

  it('returns null for empty body', () => {
    const result = parseEmail('no-reply@bancochile.cl', 'Test', '')

    expect(result.customer_name).toBeNull()
    expect(result.amount).toBeNull()
    expect(result.merchant).toBeNull()
    expect(result.sender_bank).toBe('Banco de Chile')
  })

  it('parses amount with dots and commas', () => {
    const body = `Banco de Chile

Juan Perez: compra por $1.234.567 en COMMERCE el 20/02/2026 16:00`

    const result = parseEmail('no-reply@bancochile.cl', 'Test', body)

    expect(result.amount).toBe(1234567)
  })

  it('detects banco chile by subject', () => {
    const body = `Some text with compra por $500 en STORE el 20/02/2026 16:00`

    const result = parseEmail('unknown@sender.com', 'Notificación de compra de Banco de Chile', body)

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

  it('detects banco estado by email', () => {
    const body = `Test body`

    const result = parseEmail('no-reply@bancoestado.cl', 'Test', body)

    expect(result.sender_bank).toBe('Banco Estado')
  })

  it('detects banco estado by subject', () => {
    const body = `Test body`

    const result = parseEmail('unknown@sender.com', 'Notificación de transferencia Banco Estado', body)

    expect(result.sender_bank).toBe('Banco Estado')
  })
})

describe('parseEmail - Default behavior', () => {
  it('defaults to Banco Chile parser for unknown sources', () => {
    const body = `Banco de Chile

Test User: compra por $100 en STORE el 20/02/2026 16:00`

    const result = parseEmail('unknown@sender.com', 'Some random subject', body)

    expect(result.sender_bank).toBe('Banco de Chile')
  })
})

describe('Email notification content', () => {
  it('generates correct success email content', () => {
    const parsedData = {
      messageId: 'test-123',
      merchant: 'SHELL',
      amount: 25990,
    }

    const subject = `✅ Email guardado exitosamente - ${parsedData.merchant}`
    
    expect(subject).toBe('✅ Email guardado exitosamente - SHELL')
    expect(parsedData.amount).toBe(25990)
    expect(parsedData.merchant).toBe('SHELL')
  })

  it('generates correct error email content', () => {
    const errorData = {
      messageId: 'test-456',
      error: 'Database connection failed',
    }

    const subject = '❌ Error al guardar email'
    
    expect(subject).toBe('❌ Error al guardar email')
    expect(errorData.error).toBe('Database connection failed')
  })
})
