import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  Pencil: 'Pencil',
  Trash2: 'Trash2',
  X: 'X',
  Check: 'Check',
  ArrowUpDown: 'ArrowUpDown',
  Filter: 'Filter',
}))

// Mock supabase
const mockTransactions = [
  {
    id: 'tx-001',
    email_date: '2026-02-20T10:00:00Z',
    from_name: 'Banco de Chile',
    from_email: 'enviodigital@bancochile.cl',
    message_id: 'msg-001',
    subject: 'Cargo en Cuenta',
    customer_name: 'Jorge Epunan',
    amount: 2440,
    account_last4: '5150',
    merchant: 'TOTTUS LOS DOMINI',
    transaction_date: '2026-02-20T16:10:00Z',
    sender_bank: 'Banco de Chile',
    email_type: 'cargo_en_cuenta',
    is_expense: true,
    category_id: 'Supermercado',
    is_categorized: true,
    categorized_at: '2026-02-20T17:00:00Z',
    categorization_model: 'openrouter/free',
    categorization_confidence: 0.5,
    created_at: '2026-02-20T10:00:00Z',
  },
]

vi.mock('@/lib/supabase', () => {
  const transactions = [
    {
      id: 'tx-001',
      email_date: '2026-02-20T10:00:00Z',
      from_name: 'Banco de Chile',
      from_email: 'enviodigital@bancochile.cl',
      message_id: 'msg-001',
      subject: 'Cargo en Cuenta',
      customer_name: 'Jorge Epunan',
      amount: 2440,
      account_last4: '5150',
      merchant: 'TOTTUS LOS DOMINI',
      transaction_date: '2026-02-20T16:10:00Z',
      sender_bank: 'Banco de Chile',
      email_type: 'cargo_en_cuenta',
      is_expense: true,
      category_id: 'Supermercado',
      is_categorized: true,
      categorized_at: '2026-02-20T17:00:00Z',
      categorization_model: 'openrouter/free',
      categorization_confidence: 0.5,
      created_at: '2026-02-20T10:00:00Z',
    },
  ]

  return {
    supabase: {
      from: () => ({
        select: () => ({
          or: () => ({
            order: () => ({
              range: () => Promise.resolve({ data: transactions, count: 1, error: null }),
            }),
          }),
          order: () => ({
            range: () => Promise.resolve({ data: transactions, count: 1, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ error: null }),
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
    
    expect(screen.getByText('Logs de Transacciones')).toBeInTheDocument()
  })

  it('has a search input', () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    expect(screen.getByPlaceholderText(/buscar/i)).toBeInTheDocument()
  })

  it('displays transaction merchant in table', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('TOTTUS LOS DOMINI')).toBeInTheDocument()
    })
  })

  it('displays transaction amount', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('$2.440')).toBeInTheDocument()
    })
  })

  it('displays category badge', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      expect(screen.getByText('Supermercado')).toBeInTheDocument()
    })
  })

  it('has edit button with title attribute', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      const editButton = screen.getByTitle('Editar')
      expect(editButton).toBeInTheDocument()
    })
  })

  it('has delete button with title attribute', async () => {
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      const deleteButton = screen.getByTitle('Eliminar')
      expect(deleteButton).toBeInTheDocument()
    })
  })

  it('opens edit modal when edit button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      const editButton = screen.getByTitle('Editar')
      return editButton
    })
    
    const editButton = screen.getByTitle('Editar')
    await user.click(editButton)
    
    expect(screen.getByText('Editar Transacción')).toBeInTheDocument()
  })

  it('opens delete confirmation when delete button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      const deleteButton = screen.getByTitle('Eliminar')
      return deleteButton
    })
    
    const deleteButton = screen.getByTitle('Eliminar')
    await user.click(deleteButton)
    
    expect(screen.getByText('Confirmar Eliminación')).toBeInTheDocument()
  })

  it('edit modal has merchant input field', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      const editButton = screen.getByTitle('Editar')
      return editButton
    })
    
    const editButton = screen.getByTitle('Editar')
    await user.click(editButton)
    
    // Modal should show merchant input with value
    const merchantInput = screen.getByDisplayValue('TOTTUS LOS DOMINI')
    expect(merchantInput).toBeInTheDocument()
  })

  it('edit modal has cancel and save buttons', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      const editButton = screen.getByTitle('Editar')
      return editButton
    })
    
    const editButton = screen.getByTitle('Editar')
    await user.click(editButton)
    
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    expect(screen.getByText('Guardar')).toBeInTheDocument()
  })

  it('delete confirmation has cancel and delete buttons', async () => {
    const user = userEvent.setup()
    
    render(
      <BrowserRouter>
        <LogsPage />
      </BrowserRouter>
    )
    
    await waitFor(() => {
      const deleteButton = screen.getByTitle('Eliminar')
      return deleteButton
    })
    
    const deleteButton = screen.getByTitle('Eliminar')
    await user.click(deleteButton)
    
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    // Delete button in delete modal has different text
    const deleteConfirmButtons = screen.getAllByText('Eliminar')
    expect(deleteConfirmButtons.length).toBeGreaterThan(0)
  })
})
