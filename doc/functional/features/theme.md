# Theme

## Comportement

| État | Déclencheur | Action |
|------|-------------|--------|
| Initial (première visite) | `localStorage` vide | Détection automatique via `prefers-color-scheme: dark` |
| Basculé manuellement | Clic sur 🌙/☀️ dans le header | Sauvegarde dans `localStorage` + application immédiate |
| Retour | Visite suivante | `localStorage` lu, préféré manuelle utilisée |

## CSS

Fichier : `src/jsMain/resources/theme.css`.

Variables dark dans `[data-theme="dark"]` — 8 tokens, + 4 utilitaires (`--win`, `--loss`, `--warn`, `--danger-hover`).

Classes header : `theme-toggle-btn` dans `layout.css` (44×44, icône centrée).

## Code

| Fichier | Rôle |
|---------|------|
| `src/jsMain/.../ui/theme/ThemeManager.kt` | Composable `rememberThemeState()` — état, localStorage, `data-theme` sur `<html>` |
| `src/jsMain/kotlin/.../App.kt` | Appel de `rememberThemeState()` + bouton toggle |
| `src/jsTest/.../ui/theme/ThemeManagerTest.kt` | Tests unitaires : localStorage, system preference, DOM attributes |

Pas de Handler MVI (concern global, pas d'écran dédié).

## Tests

| Test | Vérification |
|------|---|
| `readSavedTheme returns null when localStorage is empty` | localStorage vide retourne null |
| `readSavedTheme returns true for dark theme` | localStorage "dark" retourne true |
| `readSavedTheme returns false for light theme` | localStorage "light" retourne false |
| `applyTheme sets data-theme attribute to dark` | data-theme="dark" est appliqué sur <html> |
| `applyTheme removes data-theme attribute for light theme` | data-theme est supprimé pour light |
| `theme persists in localStorage across toggles` | Les toggles sont persistés en localStorage |
| `system prefers-color-scheme is detectable` | window.matchMedia() retourne une MediaQueryList valide |
