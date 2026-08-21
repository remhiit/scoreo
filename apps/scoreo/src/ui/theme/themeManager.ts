const FLAVOR_KEY = 'scoreo_flavor'
const ACCENT_KEY = 'scoreo_accent'
/** Pre-Catppuccin binary toggle. Read once for migration, never written again. */
const LEGACY_THEME_KEY = 'scoreo_theme'
const DEFAULT_ACCENT: Accent = 'mauve'

/** The 4 Catppuccin flavors, light -> dark. */
export const FLAVORS = ['latte', 'frappe', 'macchiato', 'mocha'] as const
export type Flavor = (typeof FLAVORS)[number]

/** The 14 Catppuccin hues usable as `data-accent`, see tokens/semantic.css. */
export const ACCENTS = [
  'rosewater',
  'flamingo',
  'pink',
  'mauve',
  'red',
  'maroon',
  'peach',
  'yellow',
  'green',
  'teal',
  'sky',
  'sapphire',
  'blue',
  'lavender',
] as const
export type Accent = (typeof ACCENTS)[number]

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

/**
 * Reads the saved flavor, migrating from the old binary dark/light toggle
 * (`scoreo_theme`) the first time a user without the new key loads the app.
 * `scoreo_theme` is left untouched (no cleanup needed) — `scoreo_flavor`
 * takes precedence once written.
 */
export function readInitialFlavor(): Flavor {
  const saved = window.localStorage.getItem(FLAVOR_KEY)
  if (saved) return saved as Flavor
  const legacy = window.localStorage.getItem(LEGACY_THEME_KEY)
  if (legacy === 'dark') return 'mocha'
  if (legacy === 'light') return 'latte'
  return systemPrefersDark() ? 'mocha' : 'latte'
}

export function readInitialAccent(): Accent {
  return (window.localStorage.getItem(ACCENT_KEY) as Accent | null) ?? DEFAULT_ACCENT
}

export function applyTheme(flavor: Flavor, accent: Accent): void {
  const html = document.documentElement
  html.setAttribute('data-theme', flavor)
  html.setAttribute('data-accent', accent)
}

export function saveFlavor(flavor: Flavor): void {
  window.localStorage.setItem(FLAVOR_KEY, flavor)
}

export function saveAccent(accent: Accent): void {
  window.localStorage.setItem(ACCENT_KEY, accent)
}
