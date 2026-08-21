import { createContext } from 'react'
import type { Accent, Flavor } from './themeManager'

export interface ThemeState {
  flavor: Flavor
  accent: Accent
  setFlavor: (flavor: Flavor) => void
  setAccent: (accent: Accent) => void
}

export const ThemeContext = createContext<ThemeState | undefined>(undefined)
