import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LudoModal } from './LudoModal'

describe('LudoModal', () => {
  it('renders nothing when closed', () => {
    render(
      <LudoModal open={false}>
        <p>content</p>
      </LudoModal>,
    )
    expect(screen.queryByText('content')).not.toBeInTheDocument()
  })

  it('renders title, content, and footer when open', () => {
    render(
      <LudoModal open title="Confirm" footer={<span>footer</span>}>
        <p>content</p>
      </LudoModal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
    expect(screen.getByText('footer')).toBeInTheDocument()
  })

  it('calls onClose when the scrim is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <LudoModal open onClose={onClose}>
        <p>content</p>
      </LudoModal>,
    )
    fireEvent.click(container.querySelector('.ludo-modal-scrim')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when clicking inside the modal body', () => {
    const onClose = vi.fn()
    render(
      <LudoModal open onClose={onClose}>
        <p>content</p>
      </LudoModal>,
    )
    fireEvent.click(screen.getByText('content'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(
      <LudoModal open onClose={onClose}>
        <p>content</p>
      </LudoModal>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(
      <LudoModal open title="Confirm" onClose={onClose}>
        <p>content</p>
      </LudoModal>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
