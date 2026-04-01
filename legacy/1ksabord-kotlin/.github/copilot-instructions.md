# Copilot Instructions — 1000 Sabords

## Project overview

Score tracker for the "1000 Sabords" pirate dice game, built as a **Kotlin Multiplatform (KMP)** project.

- Active target: **web** via Kotlin/JS (IR compiler) — produces `app.js` bundled by webpack
- Prepared target: **Android native** (Compose) — skeleton in `androidMain`, activated once an Android SDK is available
- No external JS/CSS frameworks; no npm dependencies beyond the Kotlin/JS toolchain

To preview: `./gradlew jsBrowserDevelopmentRun` or serve `build/dist/js/productionExecutable/` with `python3 -m http.server`.

## Architecture

### Source sets

| Source set | Purpose |
|---|---|
| `commonMain` | Pure game logic shared by all platforms: `Constants`, `Models`, `GameState`, `DiceState`, `ScoreCalculator` |
| `commonTest` | 100 unit tests (ScoreCalculator + GameState + RulesTest) — run with `./gradlew jsNodeTest` |
| `jsMain` | Web UI only: `JsState` (DOM state), `Actions`, `Renderer`, `Main` |
| `androidMain` | Android skeleton (commented out, ready to activate) |

### Theming system (JS)

Two themes (dark/light) via CSS custom properties on `:root` and `[data-theme="light"]`. All colors must use `--bg`, `--surface`, `--surface2`, `--surface3`, `--primary`, `--text`, `--text-dim`, `--danger`, `--success`, `--accent` — never hardcode color values.

### State & rendering (JS)

- Game state lives in top-level `var`/`val` in `commonMain/GameState.kt` and `commonMain/DiceState.kt`
- JS-only UI state (active tab, manual multiplier, selected card) lives in `jsMain/JsState.kt`
- `render()` rebuilds the entire `#app` innerHTML on every state change — no virtual DOM
- Screens: `renderSetupScreen()`, `renderGameScreen()`, `renderEndScreen()` return HTML strings

### Event handling (JS)

Event delegation: a single `click` listener on `document` dispatches by `data-action` attribute — never use inline `onclick="fn()"`.

### Game flow

**Setup** (add 2–8 players) → **Game** (rounds of turns, score calculator or manual entry) → **End** (after a final round when any player reaches 6000+ points).

### Score calculation

`calculateScore(card: String): ScoreResult` in `commonMain/ScoreCalculator.kt` implements all game rules: skull busts, Skull Island penalties, set bonuses, sea battle cards, captain doubling, full chest bonus. Changes here must respect all rule interactions.

## Conventions

- **Language**: All UI text, comments, and variable names are in **French**.
- **No JS frameworks**: Vanilla Kotlin/JS only. Do not introduce npm/JS dependencies.
- **Inline HTML generation**: UI is built with Kotlin string templates and `innerHTML`. Follow the existing pattern — do not switch to DOM API (`createElement`) for new features.
- **`escHtml()`**: Always use this helper when injecting user-provided text (player names) into HTML strings.
- **Player colors**: Defined in `PLAYER_COLORS` (commonMain/Constants.kt, max 8) and mirrored in CSS custom properties.
- **README maintenance**: Always update `README.md` (root) and `kotlin/README.md` when making structural changes to the project (new source files, new build commands, architecture changes, activated targets, etc.).
- **Build after changes**: Always run `./gradlew jsBrowserDistribution --no-daemon -q` in `kotlin/` at the end of any task that modifies Kotlin source files or CSS/HTML resources. Verify the build succeeds before considering the task done.
