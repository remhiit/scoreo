import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LudoTextInput } from './LudoTextInput'

describe('LudoTextInput', () => {
  it('renders the label and controlled value', () => {
    render(<LudoTextInput value="Alice" onChange={() => {}} label="Name" />)
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument()
  })

  it('calls onChange with the new value', () => {
    const onChange = vi.fn()
    render(<LudoTextInput value="" onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Bob' } })
    expect(onChange).toHaveBeenCalledWith('Bob')
  })

  it('calls onEnter when Enter is pressed', () => {
    const onEnter = vi.fn()
    render(<LudoTextInput value="" onChange={() => {}} onEnter={onEnter} />)
    fireEvent.keyUp(screen.getByRole('textbox'), { key: 'Enter' })
    expect(onEnter).toHaveBeenCalledTimes(1)
  })

  it('does not call onEnter for other keys', () => {
    const onEnter = vi.fn()
    render(<LudoTextInput value="" onChange={() => {}} onEnter={onEnter} />)
    fireEvent.keyUp(screen.getByRole('textbox'), { key: 'a' })
    expect(onEnter).not.toHaveBeenCalled()
  })

  it('applies the invalid class', () => {
    render(<LudoTextInput value="" onChange={() => {}} invalid />)
    expect(screen.getByRole('textbox')).toHaveClass('ludo-input--invalid')
  })

  it('respects disabled', () => {
    render(<LudoTextInput value="" onChange={() => {}} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})
