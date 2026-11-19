import { createContext } from 'react'
import type { Hue } from '@scoreboards/design-system'

export type CatalogFlavor = 'latte' | 'frappe' | 'macchiato' | 'mocha'

export interface CatalogTheme {
  flavor: CatalogFlavor
  accent: Hue
  setFlavor: (flavor: CatalogFlavor) => void
  setAccent: (accent: Hue) => void
}

/**
 * The catalog's theme bar, readable from inside a frame: the app screens of
 * the Écrans page hand it to Scoreo's own theme context, so the app's theme
 * dialog and the catalog's bar drive the same flavor and accent.
 */
export const CatalogThemeContext = createContext<CatalogTheme>({
  flavor: 'mocha',
  accent: 'mauve',
  setFlavor: () => {},
  setAccent: () => {},
})
