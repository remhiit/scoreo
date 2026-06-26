# Theme

## Behavior

| State | Trigger | Action |
|-------|---------|--------|
| Initial (first visit) | Empty `localStorage` | Auto-detection via `prefers-color-scheme: dark` |
| Manually toggled | Click on 🌙/☀️ in the header | Saved to `localStorage` + applied immediately |
| On return | Subsequent visit | `localStorage` read, manual preference used |

## CSS

File: `src/jsMain/resources/theme.css`.

Dark variables in `[data-theme="dark"]` — all light tokens redefined as dark (`--primary`, `--surface`, `--on-surface`, etc.), + 4 utility tokens (`--win`, `--loss`, `--warn`, `--danger-hover`), + 4 technical tokens (`--primary-rgb`, `--white`, `--overlay`, `--overlay-light`, `--overlay-medium`, `--warn-rgb`).

Header class: `theme-toggle-btn` in `layout.css` (44×44, centred icon).

## Code

| File | Role |
|------|------|
| `src/jsMain/.../ui/theme/ThemeManager.kt` | Composable `rememberThemeState()` — state, localStorage, `data-theme` on `<html>` |
| `src/jsMain/kotlin/.../App.kt` | Calls `rememberThemeState()` + toggle button |
| `src/jsTest/.../ui/theme/ThemeManagerTest.kt` | Unit tests: localStorage, system preference, DOM attributes |

No MVI Handler (global concern, no dedicated screen).

## Tests

| Test | Assertion |
|------|-----------|
| `readSavedTheme returns null when localStorage is empty` | Returns null when localStorage is empty |
| `readSavedTheme returns true for dark theme` | Returns true when localStorage is "dark" |
| `readSavedTheme returns false for light theme` | Returns false when localStorage is "light" |
| `applyTheme sets data-theme attribute to dark` | `data-theme="dark"` is applied on `<html>` |
| `applyTheme removes data-theme attribute for light theme` | `data-theme` is removed for light theme |
| `theme persists in localStorage across toggles` | Toggles are persisted in localStorage |
| `system prefers-color-scheme is detectable` | `window.matchMedia()` returns a valid `MediaQueryList` |
