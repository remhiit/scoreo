import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from './ThemeContext'
import { useTheme } from './useTheme'

function ThemePanel() {
  const { flavor, accent, setFlavor, setAccent } = useTheme()
  return (
    <div>
      <span data-testid="flavor">{flavor}</span>
      <span data-testid="accent">{accent}</span>
      <button onClick={() => setFlavor('mocha')}>set mocha</button>
      <button onClick={() => setAccent('teal')}>set teal</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-accent')
  })

  it('applies the initial theme to <html> and persists it on first render', () => {
    localStorage.setItem('scoreo_flavor', 'latte')
    localStorage.setItem('scoreo_accent', 'blue')

    render(
      <ThemeProvider>
        <ThemePanel />
      </ThemeProvider>,
    )

    expect(document.documentElement.getAttribute('data-theme')).toBe('latte')
    expect(document.documentElement.getAttribute('data-accent')).toBe('blue')
    expect(screen.getByTestId('flavor')).toHaveTextContent('latte')
  })

  it('setFlavor/setAccent update the DOM, localStorage, and re-render', () => {
    render(
      <ThemeProvider>
        <ThemePanel />
      </ThemeProvider>,
    )

    fireEvent.click(screen.getByText('set mocha'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('mocha')
    expect(localStorage.getItem('scoreo_flavor')).toBe('mocha')
    expect(screen.getByTestId('flavor')).toHaveTextContent('mocha')

    fireEvent.click(screen.getByText('set teal'))
    expect(document.documentElement.getAttribute('data-accent')).toBe('teal')
    expect(localStorage.getItem('scoreo_accent')).toBe('teal')
  })
})
