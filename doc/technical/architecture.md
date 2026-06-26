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
| `GameType` | `id: String` (UUID v4), `name: String`, `winCondition: WinCondition`, `tieBreakRule: TieBreakRule = NONE`, `tieBreakCondition: WinCondition = HIGHEST_SCORE`, `tieBreakLabel: String? = null` |
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

