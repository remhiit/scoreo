// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { VariantPicker } from './VariantPicker'

afterEach(cleanup)

function renderPicker(value: 'A' | 'B' | 'C', onChange = vi.fn()) {
  render(
    <VariantPicker
      name="variant-water"
      variants={['A', 'B', 'C']}
      value={value}
      onChange={onChange}
      ariaLabel={(variant) => `Water variant ${variant}`}
    />,
  )
  return onChange
}

it('checks the radio of the current variant only', () => {
  renderPicker('B')
  expect(screen.getByRole('radio', { name: 'Water variant B' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Water variant A' })).not.toBeChecked()
})

it('reports the variant picked', () => {
  const onChange = renderPicker('A')
  fireEvent.click(screen.getByRole('radio', { name: 'Water variant C' }))
  expect(onChange).toHaveBeenCalledWith('C')
})
