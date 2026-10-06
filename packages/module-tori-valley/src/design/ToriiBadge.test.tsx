// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { ToriiBadge } from './ToriiBadge'

afterEach(cleanup)

it('carries its colour as a modifier next to its label', () => {
  render(<ToriiBadge color="red">Rouge</ToriiBadge>)
  expect(screen.getByText('Rouge')).toHaveClass('tv-torii-badge', 'tv-torii-badge--red')
})
