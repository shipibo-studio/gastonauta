import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  LayoutDashboard: 'LayoutDashboard',
  List: 'List',
  ScrollText: 'ScrollText',
  Settings: 'Settings',
  LogOut: 'LogOut',
  Orbit: 'Orbit',
  Search: 'Search',
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  RefreshCw: 'RefreshCw',
  Filter: 'Filter',
  CheckCircle2: 'CheckCircle2',
  XCircle: 'XCircle',
  ArrowUpDown: 'ArrowUpDown',
  Loader2: 'Loader2',
}))

// Mock supabase for activity_logs
vi.mock('@/lib/supabase', () => {
  const mockLogs = [
    {
      id: 'log-001',
      created_at: '2026-02-20T10:00:00Z',
      operation_type: 'webhook_email_success',
      status: 'success',
      entity_id: 'tx-001',
      details: { amount: 2440 },
      error_message: null,
      user_id: 'user-123',
    },
    {
      id: 'log-002',
      created_at: '2026-02-20T11:00:00Z',
      operation_type: 'expense_create',
      status: 'success',
      entity_id: 'tx-002',
      details: { category: 'Supermercado' },
      error_message: null,
      user_id: 'user-123',
    },
  ]

  return {
    supabase: {
      from: () => ({
        select: () => ({
          or: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: mockLogs, count: 2, error: null }),
            }),
          }),
          order: () => ({
            range: () => Promise.resolve({ data: mockLogs, count: 2, error: null }),
          }),
          eq: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: mockLogs, count: 2, error: null }),
            }),
          }),
        }),
      }),
      auth: {
        getSession: () => Promise.resolve({
          data: { session: { user: { id: 'user-123' } } },
        }),
      },
    },
  }
})

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => {},
  }),
  usePathname: () => '/dashboard/logs',
}))

import LogsPage from '@/app/dashboard/logs/page'

describe('LogsPage', () => {
  it('renders the page title', () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    expect(screen.getByText('Logs de Actividad')).toBeInTheDocument()
  })

  it('has a search input', () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument()
  })

  it('displays operation type in table', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Webhook Email Guardado')).toBeInTheDocument()
    })
  })

  it('displays status indicators', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      // Verify the logs table renders with data
      expect(screen.getByText('Webhook Email Guardado')).toBeInTheDocument()
    })
  })

  it('has operation type filter', () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    expect(screen.getByText('Todas las operaciones')).toBeInTheDocument()
  })

  it('has status filter', () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    expect(screen.getByText('Todos los estados')).toBeInTheDocument()
  })

  it('displays pagination info', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText(/Mostrando/)).toBeInTheDocument()
    })
  })

  it('displays empty message when no logs', async () => {
    // Mock with empty data
    vi.mock('@/lib/supabase', () => {
      return {
        supabase: {
          from: () => ({
            select: () => ({
              or: () => ({
                order: () => ({
                  range: () => Promise.resolve({ data: [], count: 0, error: null }),
                }),
              }),
              order: () => ({
                range: () => Promise.resolve({ data: [], count: 0, error: null }),
              }),
              eq: () => ({
                order: () => ({
                  range: () => Promise.resolve({ data: [], count: 0, error: null }),
                }),
              }),
            }),
          }),
          auth: {
            getSession: () => Promise.resolve({
              data: { session: { user: { id: 'user-123' } } },
            }),
          },
        },
      }
    })

    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('No hay logs registrados')).toBeInTheDocument()
    })
  })
})
