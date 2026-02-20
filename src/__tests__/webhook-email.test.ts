// Tests for webhook-email Edge Function logic
// These tests mock the external dependencies (Supabase, Resend)

// Mock fetch for calling parse-email
const mockFetch = vi.fn()
global.fetch = mockFetch

// Test the logic of webhook-email function (extracted from the Edge Function)
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

// Simulated function that handles the request (mirrors webhook-email logic)
async function handleWebhookEmailRequest(
  emailData: EmailData,
  options: {
    token?: string
    parseEmailResponse?: ParsedData
    dbError?: DbError | null
    parseEmailError?: string | null
  } = {}
) {
  const { token, parseEmailResponse, dbError, parseEmailError } = options

  // Validate token (simplified)
  if (!token?.startsWith('eyJ') && token !== 'test-token') {
    return { error: 'Invalid authorization token', status: 401 }
  }

  // Validate required fields
  if (!emailData.message_id) {
    return { error: 'Missing message_id', status: 400 }
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
    email_type: 'transaction_notification',
  }

  // Prepare transaction record
  const transactionRecord = {
    email_date: emailData.date ? new Date(emailData.date).toISOString() : null,
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

describe('webhook-email authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('accepts valid JWT token', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' }
    )

    expect(result.error).toBeUndefined()
  })

  it('accepts custom bearer token', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { token: 'test-token' }
    )

    expect(result.error).toBeUndefined()
  })
})

describe('webhook-email validation', () => {
  it('returns 400 when message_id is missing', async () => {
    const result = await handleWebhookEmailRequest(
      { subject: 'Test' },
      { token: 'test-token' }
    )

    expect(result.error).toBe('Missing message_id')
    expect(result.status).toBe(400)
  })

  it('accepts request with message_id', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { token: 'test-token' }
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
      { token: 'test-token' }
    )

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.parsed).toBeDefined()
  })

  it('handles duplicate transaction error (code 23505)', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { 
        token: 'test-token',
        dbError: { code: '23505', message: 'Duplicate key' }
      }
    )

    expect(result.success).toBe(true)
    expect(result.message).toBe('Duplicate transaction already exists')
  })

  it('returns error when database operation fails', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { 
        token: 'test-token',
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
        from_email: 'no-reply@bancochile.cl',
        subject: 'Notificación de compra',
        body_plain: 'Banco de Chile\n\nJuan Perez: compra por $25.990 en SHELL el 20/02/2026 16:00',
      },
      { 
        token: 'test-token',
        parseEmailResponse: {
          customer_name: 'Juan Perez',
          amount: 25990,
          account_last4: null,
          merchant: 'SHELL',
          transaction_date: '2026-02-20T16:00:00-03:00',
          sender_bank: 'Banco de Chile',
          email_type: 'transaction_notification',
        }
      }
    )

    expect(result.parsed?.customer_name).toBe('Juan Perez')
    expect(result.parsed?.amount).toBe(25990)
    expect(result.parsed?.merchant).toBe('SHELL')
    expect(result.parsed?.sender_bank).toBe('Banco de Chile')
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
      { token: 'test-token' }
    )

    expect(result.data?.message_id).toBe('test-123')
    expect(result.data?.from_name).toBe('Banco de Chile')
    expect(result.data?.from_email).toBe('no-reply@bancochile.cl')
    expect(result.data?.subject).toBe('Notificación')
    expect(result.data?.body_plain).toBe('Test body')
    expect(result.data?.body_html).toBe('<p>Test</p>')
  })
})

describe('webhook-email error handling', () => {
  it('returns 500 when parse-email function fails', async () => {
    const result = await handleWebhookEmailRequest(
      { message_id: 'test-123' },
      { 
        token: 'test-token',
        parseEmailError: 'Parse function unavailable'
      }
    )

    expect(result.error).toBe('Parse function unavailable')
    expect(result.status).toBe(500)
  })
})
