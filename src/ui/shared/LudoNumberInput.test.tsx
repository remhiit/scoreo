import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LudoNumberInput } from './LudoNumberInput'

describe('LudoNumberInput', () => {
  it('renders stepper buttons and the current value by default', () => {
    render(<LudoNumberInput value={5} onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Increase' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('5')).toBeInTheDocument()
  })

  it('increments and decrements via stepper buttons', () => {
    const onChange = vi.fn()
    render(<LudoNumberInput value={5} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }))
    expect(onChange).toHaveBeenCalledWith(6)
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(onChange).toHaveBeenCalledWith(4)
  })

  it('clamps to min/max', () => {
    const onChange = vi.fn()
    render(<LudoNumberInput value={10} onChange={onChange} min={0} max={10} />)
    expect(screen.getByRole('button', { name: 'Increase' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }))
    expect(onChange).toHaveBeenCalledWith(9)
  })

  it('disables decrease at min', () => {
    render(<LudoNumberInput value={0} onChange={() => {}} min={0} max={10} />)
    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
  })

  it('renders a plain field without stepper buttons when stepper=false', () => {
    render(<LudoNumberInput value={3} onChange={() => {}} stepper={false} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('3')).toBeInTheDocument()
  })

  it('updates via direct input change, clamped', () => {
    const onChange = vi.fn()
    render(<LudoNumberInput value={5} onChange={onChange} min={0} max={10} stepper={false} />)
    fireEvent.change(screen.getByDisplayValue('5'), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith(10)
  })
})
