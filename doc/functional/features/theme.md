# Theme

Catppuccin design system (Ludo): 4 flavors + an independently
swappable accent hue, replacing the previous binary dark/light toggle.

## Behavior

| State | Trigger | Action |
|-------|---------|--------|
| Initial (first visit, no `localStorage`) | Empty `localStorage` | Auto-detection via `prefers-color-scheme: dark` → `mocha` if dark, `latte` if light. Accent defaults to `mauve`. |
| Initial (returning user from before this feature) | `scoreo_theme` present, `scoreo_flavor` absent | Migrated once: `"dark"` → `mocha`, `"light"` → `latte`. Accent defaults to `mauve`. `scoreo_theme` is left in place but never read again once `scoreo_flavor` exists. |
| Flavor/accent picked | Burger menu → "🎨 Theme" → pick a flavor chip and/or accent swatch | Saved to `localStorage` (`scoreo_flavor`/`scoreo_accent`) + applied immediately via `data-theme`/`data-accent` on `<html>` |
| On return | Subsequent visit | `scoreo_flavor`/`scoreo_accent` read from `localStorage` |

Flavors: `latte` (light, default), `frappe`, `macchiato`, `mocha` (dark).
Accent: 14 Catppuccin hues (`mauve` default) — see `tokens/semantic.css`.

## CSS

Files (`public/css/`):
- `tokens/` — Catppuccin flavor palettes
  (`colors-latte.css`, `colors-frappe.css`, `colors-macchiato.css`,
  `colors-mocha.css`) + the semantic alias/accent layer
  (`semantic.css`).
- `theme-picker.css` — `.theme-chip`,
  `.accent-swatch` and their `--active` variants, for the picker
  dialog.

Burger menu entry: `"🎨 Theme"` (in `src/App.tsx`) opens
`ThemePickerDialog`, which uses `LudoModal`/`LudoButton` (the chips/
swatches themselves stay custom — Ludo has no "color swatch"
primitive).

## Code

| File | Role |
|------|------|
| `src/ui/theme/themeManager.ts` | `readInitialFlavor`/`readInitialAccent`/`applyTheme`/`saveFlavor`/`saveAccent` — pure functions, localStorage, `data-theme`/`data-accent` on `<html>`, legacy migration |
| `src/ui/theme/themeContext.ts` | `ThemeContext` (`createContext`) + `ThemeState` type — no component, so importing it doesn't break Fast Refresh |
| `src/ui/theme/ThemeContext.tsx` | `ThemeProvider` — wraps `themeManager.ts`, provides `ThemeContext` so the picker and the rest of the app share live state |
| `src/ui/theme/useTheme.ts` | `useTheme()` hook, reads `ThemeContext` |
| `src/ui/theme/ThemePickerDialog.tsx` | Flavor chips + accent swatches, rendered via `LudoModal` |
| `src/App.tsx` | Renders the burger menu entry + dialog |

No dedicated reducer (global concern, no dedicated screen) — state lives in `ThemeContext`.

## Tests

| Test | Assertion |
|------|-----------|
| `flavor and accent keys are empty by default` | `scoreo_flavor`/`scoreo_accent` are null when cleared |
| `flavor persists in localStorage across changes` | `scoreo_flavor` updates are persisted |
| `accent persists in localStorage across changes` | `scoreo_accent` updates are persisted |
| `legacy scoreo_theme key is still readable for migration` | Old `"dark"`/`"light"` values remain readable |
| `applyTheme sets both data-theme and data-accent attributes` | Both attributes applied on `<html>` |
| `data-theme switches between all 4 flavors` | Each of `FLAVORS` applies correctly |
| `system prefers-color-scheme is detectable` | `window.matchMedia()` returns a valid `MediaQueryList` |
