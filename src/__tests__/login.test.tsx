import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { AuthError } from '@supabase/supabase-js'
import LoginPage from '@/app/page'

// Create mock functions
const mockSignInWithPassword = vi.fn()
const mockGetSession = vi.fn()

// Mock Supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}))

// Mock Next.js router
const mockPush = vi.fn()
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
    mockReplace.mockClear()
    mockSignInWithPassword.mockReset()
    mockGetSession.mockReset()
    mockGetSession.mockResolvedValue({ data: { session: null } })
  })

  it('redirects to /dashboard when there is an active session', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, expires_at: 123456789 }
      },
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('renders login form with email and password fields', async () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(await screen.findByLabelText(/contraseña/i)).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /entrar/i })).toBeInTheDocument()
  })

  it('shows validation error when fields are empty', async () => {
    const user = userEvent.setup()

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    const submitButton = await screen.findByRole('button', { name: /entrar/i })
    await user.click(submitButton)

    // Form should have required validation
    const emailInput = await screen.findByLabelText(/email/i)
    expect(emailInput).toBeInvalid()
  })

  it('calls signInWithPassword with correct credentials on submit', async () => {
    const user = userEvent.setup()

    // Mock successful login
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: '123', app_metadata: {}, user_metadata: {}, aud: '', created_at: '' },
        session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, expires_at: 123456789 }
      },
      error: null,
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    const emailInput = await screen.findByLabelText(/email/i)
    const passwordInput = await screen.findByLabelText(/contraseña/i)
    const submitButton = await screen.findByRole('button', { name: /entrar/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('redirects to /dashboard on successful login', async () => {
    const user = userEvent.setup()

    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: '123', app_metadata: {}, user_metadata: {}, aud: '', created_at: '' },
        session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, expires_at: 123456789 }
      },
      error: null,
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    const emailInput = await screen.findByLabelText(/email/i)
    const passwordInput = await screen.findByLabelText(/contraseña/i)
    const submitButton = await screen.findByRole('button', { name: /entrar/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    }, { timeout: 1000 })
  })

  it('displays error message on failed login', async () => {
    const user = userEvent.setup()

    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthError('Invalid login credentials'),
    })

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    const emailInput = await screen.findByLabelText(/email/i)
    const passwordInput = await screen.findByLabelText(/contraseña/i)
    const submitButton = await screen.findByRole('button', { name: /entrar/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while logging in', async () => {
    const user = userEvent.setup()

    // Mock a slow login that we can track
    mockSignInWithPassword.mockImplementation(() =>
      new Promise((resolve) => setTimeout(() => resolve({
        data: {
          user: { id: '123', app_metadata: {}, user_metadata: {}, aud: '', created_at: '' },
          session: { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, expires_at: 123456789 }
        },
        error: null,
      }), 100))
    )

    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    )

    const emailInput = await screen.findByLabelText(/email/i)
    const passwordInput = await screen.findByLabelText(/contraseña/i)
    const submitButton = await screen.findByRole('button', { name: /entrar/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)

    // Should show loading state immediately after click
    expect(screen.getByText(/ingresando/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })
})
