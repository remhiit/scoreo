import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useTheme } from './useTheme'

function ThemePanel() {
  useTheme()
  return null
}

describe('useTheme', () => {
  it('throws when used outside a ThemeProvider', () => {
    expect(() => render(<ThemePanel />)).toThrow('useTheme must be used within a ThemeProvider')
  })
})
