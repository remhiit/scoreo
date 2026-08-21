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
    expect(screen.getByLabelText('Edit')).toBeInTheDocument()
    expect(screen.queryByLabelText('View details')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Delete')).not.toBeInTheDocument()
  })

  it('a click on an action button does not also trigger onSelect', () => {
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    render(<ListItemRow label="Alice" onSelect={onSelect} onDelete={onDelete} />)
    fireEvent.click(screen.getByLabelText('Delete'))
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('renders the optional players and date slots', () => {
    render(<ListItemRow label="Belote" players="Camille 101 · Malik 92" date="12 Jul 2026" />)
    expect(screen.getByText('Camille 101 · Malik 92')).toBeInTheDocument()
    expect(screen.getByText('12 Jul 2026')).toBeInTheDocument()
  })

  it('omits the players and date slots when not provided', () => {
    const { container } = render(<ListItemRow label="Belote" />)
    expect(container.querySelector('.list-item-players')).not.toBeInTheDocument()
    expect(container.querySelector('.list-item-date')).not.toBeInTheDocument()
  })

  it('renders the badge slot with its accessible label', () => {
    render(<ListItemRow label="Alice" badge={<>🏆3</>} badgeLabel="3 trophies" />)
    expect(screen.getByLabelText('3 trophies')).toHaveTextContent('🏆3')
  })

  it('omits the badge slot when not provided, even with a badgeLabel', () => {
    const { container } = render(<ListItemRow label="Alice" badgeLabel="0 trophies" />)
    expect(container.querySelector('.list-item-badge')).not.toBeInTheDocument()
  })

  it('a click on the badge still selects the row', () => {
    const onSelect = vi.fn()
    render(<ListItemRow label="Alice" onSelect={onSelect} badge={<>🏆3</>} badgeLabel="3 trophies" />)
    fireEvent.click(screen.getByLabelText('3 trophies'))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
