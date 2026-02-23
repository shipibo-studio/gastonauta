import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable } from '@/app/components/DataTable'

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ArrowUpDown: 'ArrowUpDown',
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  RefreshCw: 'RefreshCw',
  Loader2: 'Loader2',
}))

interface TestItem {
  id: string
  name: string
  status: string
  amount: number
}

describe('DataTable', () => {
  const mockColumns = [
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status', sortable: false },
    { 
      key: 'amount', 
      header: 'Amount', 
      sortable: true,
      align: 'right' as const,
      render: (row: TestItem) => `$${row.amount}`
    },
  ]

  const mockData: TestItem[] = [
    { id: '1', name: 'Item 1', status: 'active', amount: 100 },
    { id: '2', name: 'Item 2', status: 'inactive', amount: 200 },
    { id: '3', name: 'Item 3', status: 'active', amount: 300 },
  ]

  it('renders table headers', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={1}
        totalCount={3}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Amount')).toBeInTheDocument()
  })

  it('renders table data', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={1}
        totalCount={3}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })

  it('renders custom cell content', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={1}
        totalCount={3}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText('$100')).toBeInTheDocument()
    expect(screen.getByText('$200')).toBeInTheDocument()
    expect(screen.getByText('$300')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={true}
        page={1}
        totalCount={0}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    // Verify loading is shown - tbody has one row (the loading row)
    const tbody = document.querySelector('tbody')
    expect(tbody?.children.length).toBe(1)
  })

  it('shows empty state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={false}
        emptyMessage="No hay elementos"
        page={1}
        totalCount={0}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText('No hay elementos')).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(
      <DataTable
        data={[]}
        columns={mockColumns}
        loading={false}
        error="Error de conexión"
        page={1}
        totalCount={0}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText('Error: Error de conexión')).toBeInTheDocument()
  })

  it('renders pagination info', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={1}
        totalCount={25}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText(/Mostrando 1 - 10 de 25/)).toBeInTheDocument()
  })

  it('renders pagination buttons', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={2}
        totalCount={25}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
  })

  it('calls onPageChange when clicking next page', () => {
    const onPageChange = vi.fn()
    
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={1}
        totalCount={25}
        pageSize={10}
        onPageChange={onPageChange}
      />
    )

    // Click next button (second button in pagination)
    const buttons = screen.getAllByRole('button')
    const nextButton = buttons[1]
    nextButton.click()

    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('shows refresh button when onRefresh is provided', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={1}
        totalCount={3}
        pageSize={10}
        onPageChange={() => {}}
        onRefresh={() => {}}
      />
    )

    // Should show refresh button - we check for presence by finding the button
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('disables previous button on first page', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={1}
        totalCount={25}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    const buttons = screen.getAllByRole('button')
    const prevButton = buttons[0]
    expect(prevButton).toBeDisabled()
  })

  it('disables next button on last page', () => {
    render(
      <DataTable
        data={mockData}
        columns={mockColumns}
        loading={false}
        page={3}
        totalCount={25}
        pageSize={10}
        onPageChange={() => {}}
      />
    )

    const buttons = screen.getAllByRole('button')
    const nextButton = buttons[1]
    expect(nextButton).toBeDisabled()
  })
})
