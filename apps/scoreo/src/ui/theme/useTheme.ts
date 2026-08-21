import { useContext } from 'react'
import { ThemeContext, type ThemeState } from './themeContext'

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext)
  if (!state) throw new Error('useTheme must be used within a ThemeProvider')
  return state
}
