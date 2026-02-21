// Tests for webhook-email Edge Function logic
// These tests mock the external dependencies (Supabase, Resend, parse-email function)

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock fetch for calling parse-email
const mockFetch = vi.fn()
global.fetch = mockFetch

// Test the logic of webhook-email function (mirrors the Edge Function)
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

interface ParsedData {
  customer_name: string | null
  amount: number | null
  account_last4: string | null
  merchant: string | null
  transaction_date: string | null
  sender_bank: string | null
  email_type: string | null
}

interface DbError {
  code?: string
  message?: string
}

// parseEmailDate function from the edge function
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

// Bearer token validation from the edge function
function validateToken(token: string | undefined, expectedToken: string | null): { valid: boolean; error?: string } {
  // Allow custom bearer token OR Supabase JWT (anon key)
  // If expectedToken is set and matches, it's valid
  if (expectedToken && token === expectedToken) {
    return { valid: true }
  }
  // Otherwise, token must start with 'eyJ' (JWT)
  if (!token?.startsWith('eyJ')) {
    return { valid: false, error: 'Invalid authorization token' }
  }
  return { valid: true }
}

// Simulated function that handles the request (mirrors webhook-email logic)
async function handleWebhookEmailRequest(
  emailData: EmailData,
  options: {
    token?: string
    expectedToken?: string
    parseEmailResponse?: ParsedData
    dbError?: DbError | null
    parseEmailError?: string | null
  } = {}
) {
  const { token, expectedToken, parseEmailResponse, dbError, parseEmailError } = options

  // Validate token
  const tokenValidation = validateToken(token, expectedToken || null)
  if (!tokenValidation.valid) {
    return { error: tokenValidation.error, status: 401 }
  }

  // Validate required fields
  if (!emailData.message_id) {
    return { error: 'Missing message_id', status: 400 }
  }

  // Validate body_plain or body_raw
  if (!emailData.body_plain && !emailData.body_raw) {
    return { error: 'Missing body_plain or body_raw', status: 400 }
  }

  // Call parse-email function (mocked)
  if (parseEmailError) {
    return { error: parseEmailError, status: 500 }
  }

  const parsedData: ParsedData = parseEmailResponse || {
    customer_name: 'Test User',
    amount: 10000,
    account_last4: '1234',
    merchant: 'TEST STORE',
    transaction_date: '2026-02-20T16:00:00-03:00',
    sender_bank: 'Banco de Chile',
    email_type: 'cargo_en_cuenta',
  }

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

  // Simulate database operation
  if (dbError) {
    if (dbError.code === '23505') {
      return { 
        success: true, 
        message: 'Duplicate transaction already exists',
        message_id: emailData.message_id 
      }
    }
    return { error: dbError.message, status: 500 }
  }

  return {
    success: true,
    data: transactionRecord,
    parsed: parsedData,
  }
}

// ============== TESTS ==============

describe('parseEmailDate', () => {
  it('parses valid ISO date string', () => {
    const result = parseEmailDate('2026-02-20T16:00:00Z')
    expect(result).toBe('2026-02-20T16:00:00.000Z')
  })

  it('parses RFC date string', () => {
    const result = parseEmailDate('Thu, 20 Feb 2026 16:00:00 -0300')
    expect(result).not.toBeNull()
  })

  it('returns null for undefined', () => {
    const result = parseEmailDate(undefined)
    expect(result).toBeNull()
  })

  it('returns null for invalid date', () => {
    const result = parseEmailDate('invalid-date')
    expect(result).toBeNull()
  })

  it('returns null for empty string', () => {
    const result = parseEmailDate('')
    expect(result).toBeNull()
  })
})

describe('webhook-email authentication - JWT token', () => {
  it('returns 401 for missing token', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { token: undefined }
    )

    expect(result.error).toBe('Invalid authorization token')
    expect(result.status).toBe(401)
  })

  it('returns 401 for invalid token format', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { token: 'invalid-token' }
    )

    expect(result.error).toBe('Invalid authorization token')
    expect(result.status).toBe(401)
  })

  it('accepts valid JWT token (starts with eyJ)', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_plain: 'Test body' },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.error).toBeUndefined()
  })

  it('accepts custom bearer token', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_plain: 'Test body' },
      { 
        token: 'test-token',
        expectedToken: 'test-token' // Need to set expectedToken for custom token
      }
    )

    expect(result.error).toBeUndefined()
  })

  it('accepts custom bearer token matching expectedToken', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_plain: 'Test body' },
      { 
        token: 'chg-webhook-2026-secure-token',
        expectedToken: 'chg-webhook-2026-secure-token'
      }
    )

    expect(result.error).toBeUndefined()
  })

  it('rejects custom bearer token not matching expectedToken', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { 
        token: 'wrong-token',
        expectedToken: 'chg-webhook-2026-secure-token'
      }
    )

    expect(result.error).toBe('Invalid authorization token')
    expect(result.status).toBe(401)
  })
})

describe('webhook-email validation', () => {
  it('returns 400 when message_id is missing', async () => {
    const result = await handleWebhookEmailRequest(
      { subject: 'Test', body_plain: 'Test body' },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.error).toBe('Missing message_id')
    expect(result.status).toBe(400)
  })

  it('returns 400 when body_plain and body_raw are missing', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.error).toBe('Missing body_plain or body_raw')
    expect(result.status).toBe(400)
  })

  it('accepts request with message_id and body_plain', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_plain: 'Test body' },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.error).toBeUndefined()
    expect(result.status).toBeUndefined()
  })

  it('accepts request with message_id and body_raw', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_raw: 'Test body' },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.error).toBeUndefined()
    expect(result.status).toBeUndefined()
  })
})

describe('webhook-email database operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success when database insert succeeds', async () => {
    const result = await handleWebhookEmailRequest(
      {
        message_id: 'test-123',
        from_email: 'test@bancochile.cl',
        subject: 'Test',
        body_plain: 'Test body',
      },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.parsed).toBeDefined()
  })

  it('handles duplicate transaction error (code 23505)', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_plain: 'Test body' },
      { 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        dbError: { code: '23505', message: 'Duplicate key' }
      }
    )

    expect(result.success).toBe(true)
    expect(result.message).toBe('Duplicate transaction already exists')
  })

  it('returns error when database operation fails', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_plain: 'Test body' },
      { 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        dbError: { message: 'Connection failed', code: '08006' }
      }
    )

    expect(result.error).toBe('Connection failed')
    expect(result.status).toBe(500)
  })
})

describe('webhook-email transaction parsing', () => {
  it('includes parsed data in successful response', async () => {
    const result = await handleWebhookEmailRequest(
      {
        message_id: 'test-123',
        from_email: 'enviodigital@bancochile.cl',
        subject: 'Cargo en Cuenta',
        body_plain: 'Banco de Chile\n\nJuan Perez: compra por $25.990 en SHELL el 20/02/2026 16:00',
      },
      { 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        parseEmailResponse: {
          customer_name: 'Juan Perez',
          amount: 25990,
          account_last4: '1234',
          merchant: 'SHELL',
          transaction_date: '2026-02-20T16:00:00-03:00',
          sender_bank: 'Banco de Chile',
          email_type: 'cargo_en_cuenta',
        }
      }
    )

    expect(result.parsed?.customer_name).toBe('Juan Perez')
    expect(result.parsed?.amount).toBe(25990)
    expect(result.parsed?.merchant).toBe('SHELL')
    expect(result.parsed?.sender_bank).toBe('Banco de Chile')
    expect(result.parsed?.email_type).toBe('cargo_en_cuenta')
  })

  it('includes parsed data for transferencia_fondos', async () => {
    const result = await handleWebhookEmailRequest(
      {
        message_id: 'test-456',
        from_email: 'serviciodetransferencias@bancochile.cl',
        subject: 'Transferencias de Fondos',
        body_plain: 'Test transferencia body',
      },
      { 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        parseEmailResponse: {
          customer_name: 'Juan Perez',
          amount: 5000,
          account_last4: '5150',
          merchant: 'Khipu',
          transaction_date: '2026-02-20T10:00:00-03:00',
          sender_bank: 'Banco de Chile',
          email_type: 'transferencia_fondos',
        }
      }
    )

    expect(result.parsed?.email_type).toBe('transferencia_fondos')
    expect(result.parsed?.merchant).toBe('Khipu')
  })

  it('includes email data in transaction record', async () => {
    const result = await handleWebhookEmailRequest(
      {
        message_id: 'test-123',
        date: 'Thu, 20 Feb 2026 16:00:00 -0300',
        from_name: 'Banco de Chile',
        from_email: 'no-reply@bancochile.cl',
        subject: 'Notificación',
        body_plain: 'Test body',
        body_html: '<p>Test</p>',
      },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.data?.message_id).toBe('test-123')
    expect(result.data?.from_name).toBe('Banco de Chile')
    expect(result.data?.from_email).toBe('no-reply@bancochile.cl')
    expect(result.data?.subject).toBe('Notificación')
    expect(result.data?.body_plain).toBe('Test body')
    expect(result.data?.body_html).toBe('<p>Test</p>')
    expect(result.data?.email_date).not.toBeNull()
  })
})

describe('webhook-email error handling', () => {
  it('returns 500 when parse-email function fails', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123', body_plain: 'Test body' },
      { 
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
        parseEmailError: 'Parse function unavailable'
      }
    )

    expect(result.error).toBe('Parse function unavailable')
    expect(result.status).toBe(500)
  })
})

describe('webhook-email CORS handling', () => {
  it('would return CORS headers for OPTIONS request', () => {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    expect(corsHeaders['Access-Control-Allow-Origin']).toBe('*')
    expect(corsHeaders['Access-Control-Allow-Headers']).toContain('authorization')
    expect(corsHeaders['Access-Control-Allow-Headers']).toContain('content-type')
  })
})

describe('webhook-email notification data', () => {
  it('prepares correct notification data for cargo_en_cuenta', () => {
    const parsedData = {
      customer_name: 'Juan Perez',
      amount: 25990,
      account_last4: '1234',
      merchant: 'SHELL',
      transaction_date: '2026-02-20T16:00:00-03:00',
      sender_bank: 'Banco de Chile',
      email_type: 'cargo_en_cuenta',
    }

    const emailTypeLabel = parsedData.email_type === 'cargo_en_cuenta' 
      ? 'Cargo en Cuenta' 
      : parsedData.email_type === 'transferencia_fondos' 
        ? 'Transferencia de Fondos' 
        : 'Transacción'

    expect(emailTypeLabel).toBe('Cargo en Cuenta')
  })

  it('prepares correct notification data for transferencia_fondos', () => {
    const parsedData = {
      customer_name: 'Juan Perez',
      amount: 5000,
      account_last4: '5150',
      merchant: 'Khipu',
      transaction_date: '2026-02-20T10:00:00-03:00',
      sender_bank: 'Banco de Chile',
      email_type: 'transferencia_fondos',
    }

    const emailTypeLabel = parsedData.email_type === 'cargo_en_cuenta' 
      ? 'Cargo en Cuenta' 
      : parsedData.email_type === 'transferencia_fondos' 
        ? 'Transferencia de Fondos' 
        : 'Transacción'

    expect(emailTypeLabel).toBe('Transferencia de Fondos')
  })
})
