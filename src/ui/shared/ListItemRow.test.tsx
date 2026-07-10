import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListItemRow } from './ListItemRow'

describe('ListItemRow', () => {
  it('renders the label and optional subtitle', () => {
    render(<ListItemRow label="Alice" subtitle="3 wins" />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('3 wins')).toBeInTheDocument()
  })

  it('shows the selection picto only when isSelectable', () => {
    const { rerender } = render(<ListItemRow label="Alice" isSelectable isSelected={false} />)
    expect(screen.getByText('○')).toBeInTheDocument()

    rerender(<ListItemRow label="Alice" isSelectable isSelected />)
    expect(screen.getByText('●')).toBeInTheDocument()

    rerender(<ListItemRow label="Alice" />)
    expect(screen.queryByText('○')).not.toBeInTheDocument()
  })

  it('calls onSelect when the label zone is clicked', () => {
    const onSelect = vi.fn()
    render(<ListItemRow label="Alice" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Alice'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('only renders action buttons whose handler is provided', () => {
    render(<ListItemRow label="Alice" onEdit={() => {}} />)
    expect(screen.getByTitle('Edit')).toBeInTheDocument()
    expect(screen.queryByTitle('View details')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument()
  })

  it('action buttons stop propagation so onSelect is not also triggered', () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    render(<ListItemRow label="Alice" onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByTitle('Delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })
})
