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

Pas de Handler MVI (concern global, pas d'écran dédié).
