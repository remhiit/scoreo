import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LudoButton } from './LudoButton'

describe('LudoButton', () => {
  it('renders the label and default classes', () => {
    render(<LudoButton text="Save" onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveClass('ludo-btn', 'ludo-btn--primary', 'ludo-btn--md')
  })

  it('applies variant, size, and icon-only classes', () => {
    render(<LudoButton text="X" variant="danger" size="sm" iconOnly onClick={() => {}} />)
    const button = screen.getByRole('button', { name: 'X' })
    expect(button).toHaveClass('ludo-btn--danger', 'ludo-btn--sm', 'ludo-btn--icon')
  })

  it('calls onClick when enabled', () => {
    const onClick = vi.fn()
    render(<LudoButton text="Save" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn()
    render(<LudoButton text="Save" disabled onClick={onClick} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('sets aria-label when provided', () => {
    render(<LudoButton text="+" ariaLabel="Increase" onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Increase' })).toBeInTheDocument()
  })
})
