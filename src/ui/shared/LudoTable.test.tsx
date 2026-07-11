import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LudoTable } from './LudoTable'

interface Row {
  id: string
  name: string
  score: number
}

const rows: Row[] = [
  { id: 'p1', name: 'Alice', score: 10 },
  { id: 'p2', name: 'Bob', score: 5 },
]

describe('LudoTable', () => {
  it('renders headers and cell content', () => {
    render(
      <LudoTable
        columns={[
          { header: 'Name', render: (r: Row) => r.name },
          { header: 'Score', render: (r: Row) => r.score },
        ]}
        rows={rows}
        rowKey={(r) => r.id}
      />,
    )
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Score')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders a footer row when provided', () => {
    render(
      <LudoTable
        columns={[{ header: 'Name', render: (r: Row) => r.name }]}
        rows={rows}
        rowKey={(r) => r.id}
        footer={<td>Total</td>}
      />,
    )
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('applies striped/dense/no-footer classes', () => {
    const { container, rerender } = render(
      <LudoTable columns={[{ header: 'Name', render: (r: Row) => r.name }]} rows={rows} rowKey={(r) => r.id} dense />,
    )
    const table = container.querySelector('table')!
    expect(table).toHaveClass('ludo-table--striped', 'ludo-table--dense', 'ludo-table--no-footer')

    rerender(
      <LudoTable
        columns={[{ header: 'Name', render: (r: Row) => r.name }]}
        rows={rows}
        rowKey={(r) => r.id}
        striped={false}
        footer={<td>Total</td>}
      />,
    )
    expect(table).not.toHaveClass('ludo-table--striped')
    expect(table).not.toHaveClass('ludo-table--no-footer')
  })
})
