import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  applyTheme,
  readInitialAccent,
  readInitialFlavor,
  saveAccent,
  saveFlavor,
  type Accent,
  type Flavor,
} from './themeManager'

export interface ThemeState {
  flavor: Flavor
  accent: Accent
  setFlavor: (flavor: Flavor) => void
  setAccent: (accent: Accent) => void
}

const ThemeContext = createContext<ThemeState | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer runs exactly once, covering first paint and the legacy-key
  // migration (scoreo_flavor/scoreo_accent get written even if the user never
  // opens the theme picker) — equivalent of the `remember { ... }` block in
  // Kotlin's rememberThemeState().
  const [state, setState] = useState<{ flavor: Flavor; accent: Accent }>(() => {
    const flavor = readInitialFlavor()
    const accent = readInitialAccent()
    applyTheme(flavor, accent)
    saveFlavor(flavor)
    saveAccent(accent)
    return { flavor, accent }
  })

  const setFlavor = (next: Flavor) => {
    saveFlavor(next)
    applyTheme(next, state.accent)
    setState((s) => ({ ...s, flavor: next }))
  }

  const setAccent = (next: Accent) => {
    saveAccent(next)
    applyTheme(state.flavor, next)
    setState((s) => ({ ...s, accent: next }))
  }

  return (
    <ThemeContext.Provider value={{ flavor: state.flavor, accent: state.accent, setFlavor, setAccent }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeState {
  const state = useContext(ThemeContext)
  if (!state) throw new Error('useTheme must be used within a ThemeProvider')
  return state
}
