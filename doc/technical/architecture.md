# Architecture

## UI Framework

**Compose HTML** (JetBrains) — `org.jetbrains.compose.html:html-core`

- Generates real HTML DOM elements (no canvas renderer)
- Kotlin/JS (`js(IR)` target) compiled to JavaScript
- Architecture is designed to support Android and iOS targets later: domain and application layers are pure Kotlin in `commonMain`, only the UI rendering layer is platform-specific

## UI Pattern

**MVI — Model-View-Intent**

- Unidirectional data flow: `View → Intent → Handler → State → View`
- State is immutable; each Intent produces a new State
- Predictable, easy to unit-test in isolation
- Handlers use `androidx.compose.runtime.mutableStateOf` (available in `commonMain` via compose-runtime)

## Application Architecture

**Hexagonal Architecture (Ports & Adapters)**

```
┌─────────────────────────────────────┐
│               UI Layer              │  ← Compose HTML composables (jsMain adapter)
│         (Intents & State)           │
└───────────────┬─────────────────────┘
                │ ports
┌───────────────▼─────────────────────┐
│            Domain Layer             │  ← Entities, Use Cases
│   (Players, Games, Results, Stats)  │
└───────────────┬─────────────────────┘
                │ ports
┌───────────────▼─────────────────────┐
│         Infrastructure Layer        │  ← Storage adapter (local/remote)
│    (Local storage, Google Drive)    │
└─────────────────────────────────────┘
```

- **Domain layer**: pure Kotlin, no framework dependency — entities (`Player`, `GameType`, `Match`) and use cases
- **UI adapter**: Compose HTML screens in `jsMain`, wiring Intents to use cases
- **Storage adapter**: localStorage via `LocalStorage*Repository` classes (scoreo_players, scoreo_gametypes, scoreo_matches keys)
- **Cloud sync**: `CloudSyncRepository` port (commonMain), `GoogleDriveSyncAdapter` implementation (jsMain) via async `fetch()` + coroutines, OAuth Token Model via Google Identity Services
- **DI helpers**: `createSyncHandlerIfAvailable` in `commonMain/di/` — builds `SyncHandler` only if a `CloudSyncRepository` is provided. Allows the app to run without cloud sync (e.g. GitHub Pages without OAuth configured). Unit-tested in `commonTest/di/`.

## Web Target

`js(IR)` — Compose HTML generates real HTML DOM elements.
Entry point: `src/jsMain/kotlin/com/scoreo/Main.kt` → `renderComposable(rootElementId = "root")`.

## Source package structure

Sources follow the Compose Multiplatform convention:

- **`commonMain/`** — shared code (domain, application, MVI handlers/intents/states, DI helpers)
- **`jsMain/`** — browser-specific code (Compose HTML screens, localStorage infrastructure, DI wiring)
- **`commonTest/`** — JVM unit tests (use cases, handlers, DI wiring)

Run `find src -type d` for the exhaustive package list.

## Styling

Several `.css` files in `src/jsMain/resources/` (`theme.css`, `layout.css`, `home.css`, etc.) are imported by `styles.css` via `@import`. During the production build, all CSS files are copied to the output directory, and the browser resolves `@import` directives natively.
Uses CSS custom properties (design tokens), a fixed top header bar, and minimal component styles (cards, inputs, buttons, modals, score table).

### Design tokens — Catppuccin (Ludo design system)

`src/jsMain/resources/tokens/` holds the color/type/spacing/radius
tokens, imported first from `styles.css` (before `theme.css` and the
per-screen CSS files):

- `colors-latte.css` / `colors-frappe.css` / `colors-macchiato.css` /
  `colors-mocha.css` — the 4 Catppuccin flavors, raw `--ctp-*` values,
  each scoped to `[data-theme="…"]` (`latte` is also the `:root`
  default). Never referenced directly outside `semantic.css`.
- `semantic.css` — the only layer components/screens should read:
  semantic aliases (`--surface-app`, `--surface-card`, `--text-body`,
  `--border-subtle`, …) plus the independently swappable primary accent
  (`--color-primary`, default Mauve) and its 14 presets, opted into via
  `[data-accent="…"]` on `<html>`.
- `typography.css`, `spacing.css`, `radius-shadow.css` — type scale,
  4px spacing scale, radius/shadow/motion tokens.

Flavor and accent are switched by setting `data-theme`/`data-accent`
attributes on `<html>` (see `ui/theme/ThemeManager.kt`).

Every screen references the semantic tokens directly — the shared
`Ludo*` composables (`ui/shared/Button.kt`, `Input.kt`, `Table.kt`,
`Modal.kt`) and each screen's own CSS all read `--color-primary`,
`--surface-card`, `--text-body`, etc. The historical Material-era
variable names (`--primary`, `--surface`, `--on-surface`, `--outline`,
`--win`/`--loss`/`--warn`, `--radius`, …) that used to live in
`theme.css` as a transitional alias layer are gone entirely — nothing
in the codebase reads them anymore. `theme.css` now holds only the
splash screen, a couple of shared layout classes (`.card`, `.form-row`,
`.select`, `.error-msg`, `.empty`, `.section-label`), and the one
non-color layout constant that's still a plain custom property,
`--header-height`.

## PWA (Progressive Web App)

Scoreo is installable as a native app on mobile and desktop.

Static assets in `src/jsMain/resources/`:

| Fichier | Rôle |
|---|---|
| `manifest.json` | App name, icons, `display: standalone`, theme `#6750a4` |
| `sw.js` | Service worker — cache-first for offline shell |
| `icon-192.png` | Home screen icon (Android, iOS) |
| `icon-512.png` | Splash screen icon |

`index.html` registers the service worker via `navigator.serviceWorker.register('./sw.js')`.

All PWA assets are copied to the production output alongside CSS files (see [`deployment.md`](deployment.md)).

**Shared UI composables** (`src/jsMain/kotlin/com/scoreo/ui/shared/`):
- `ListContainer` — wraps any list of `ListItemRow` items; applies `display:flex; flex-direction:column; gap:8px`. Accepts an optional `className` parameter (e.g. `"list-container--spaced"` for `margin-top:16px`). Used by HomeScreen, GameTypeScreen, HistoryScreen.
- `ListItemRow` — single row with label, optional subtitle, and optional action buttons (view/edit/delete). Supports selectable mode (○/●).

## Persistence

- **Current**: localStorage via `LocalStorage*Repository` (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)
- **Import**: `ImportMatchesUseCase` reads the same repositories and writes through `MatchRepository.save()`, `GameTypeRepository.save()`, and `PlayerRepository.save()`
- **Cloud Sync**: Google Drive via `GoogleDriveSyncAdapter`. Stores a single `scoreo-data.json` in the invisible App Data Folder. Syncs players, game types, and matches. Drive API v3, async `fetch()` + coroutines, OAuth Token Model (GIS). See `SyncUseCase`, `SyncHandler`.

See [`deployment.md`](deployment.md) for CI/CD and deployment details.

## Backward Compatibility

Data stored in `localStorage` must remain readable after an app update.

**Rule**: any change to a serialized domain model must be backward compatible with at least the previous version.

**Soft-delete**: `Player.active = false` (default `true`) hides the player from active screens (Home, Setup, ScoreDetail) but keeps them in match history. `getAll()` excludes inactive players by default. `getAll(includeInactive = true)` includes them for history rendering. The name can optionally be blanked (`anonymize = true` in `delete()`).

In practice:
- **Adding a field**: always provide a default value (`= emptyList()`, `= null`, etc.) so old data deserializes cleanly. `Json { ignoreUnknownKeys = true }` is already configured.
- **Renaming / removing a field**: requires a migration step — read old key, transform, write to new key. Document the migration in a `doc/technical/migrations.md` file.
- **Never change the type of an existing field** without a migration.

This applies to: `Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`.

**Current entity formats:**

| Entity | Fields |
|---|---|---|
| `Player` | `id: String` (UUID v4), `name: String`, `active: Boolean = true` |
| `GameType` | `id: String` (UUID v4), `name: String`, `winCondition: WinCondition`, `tieBreakRule: TieBreakRule = NONE`, `tieBreakCondition: WinCondition = HIGHEST_SCORE`, `tieBreakLabel: String? = null`, `active: Boolean = true` |
| `Match` | `id: String` (UUID v4), `date: Long` (epoch ms), `gameTypeId: String`, `playerScores: List<PlayerScore>`, `manualWinners: List<String>`, `secondaryPlayerScores: List<PlayerScore> = emptyList()` |
| `PlayerScore` | `playerId: String`, `score: Int` |
| `WinCondition` | Enum: `HIGHEST_SCORE`, `LOWEST_SCORE`, `MANUAL` |

**Migration mechanism:** `LocalStorageMatchRepository.getAll()` runs a transparent migration on every read.
It detects old-format data (String dates, non-UUID ids) and converts them in-place.
See `doc/technical/migrations.md` for details.

## Technical choice: async fetch + coroutines for Google Drive

`GoogleDriveClient` uses `window.fetch()` (standard browser REST API) with Kotlin coroutines (`kotlinx-coroutines-core`).

### Architecture

- `CloudSyncRepository` (port): all methods are `suspend`
- `GoogleDriveClient`: wraps Drive REST calls via `window.fetch()` + `await()` (bridging `Promise`)
- `SyncUseCase`: `suspend` method for each operation (autoSync, resolveConflict, login, logout)
- `SyncHandler`: receives a `CoroutineScope` and launches sync calls in `scope.launch { ... }`
- `SyncScreen`: remains synchronous (no change) — coroutines are launched by the handler

### Why this approach

- No blocking of the main thread (network calls are async)
- Uses standard browser APIs (`fetch`), no third-party library
- `kotlinx-coroutines-core` available in multiplatform (commonMain + jsMain)
- `SuspendCancellableCoroutine` enables fine-grained cancellation control

