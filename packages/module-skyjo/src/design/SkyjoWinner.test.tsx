// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { SkyjoWinner } from './SkyjoWinner'

afterEach(cleanup)

it('renders its announcement next to a decorative trophy', () => {
  render(<SkyjoWinner>Alice remporte la partie !</SkyjoWinner>)
  expect(screen.getByText('Alice remporte la partie !')).toBeInTheDocument()
  expect(screen.getByText('🏆')).toHaveAttribute('aria-hidden', 'true')
})
