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
│    (Local storage, future backend)  │
└─────────────────────────────────────┘
```

- **Domain layer**: pure Kotlin, no framework dependency — entities (`Player`, `GameType`, `Match`) and use cases
- **UI adapter**: Compose HTML screens in `jsMain`, wiring Intents to use cases
- **Storage adapter**: localStorage via `LocalStorage*Repository` classes (scoreo_players, scoreo_gametypes, scoreo_matches keys)
- **Cloud sync**: `CloudSyncRepository` port (commonMain), `GoogleDriveSyncAdapter` implementation (jsMain) via synchronous XMLHttpRequest, OAuth Token Model via Google Identity Services

## Web Target

`js(IR)` — Compose HTML generates real HTML DOM elements.
Entry point: `src/jsMain/kotlin/com/scoreo/Main.kt` → `renderComposable(rootElementId = "root")`.

## Source package structure

Sources suivent la convention Compose Multiplatform :

- **`commonMain/`** — code partagé (domaine, application, handlers/intents/states MVI)
- **`jsMain/`** — code spécifique au navigateur (écrans Compose HTML, infrastructure localStorage)
- **`commonTest/`** — tests unitaires JVM (use cases, handlers)

Voir `find src -type d` pour la liste exhaustive des packages.

## Styling

Single `styles.css` file with CSS custom properties (design tokens), a fixed top header bar, and minimal component styles (cards, inputs, buttons, modals, score table).

## Persistence

- **Current**: localStorage via `LocalStorage*Repository` (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)
- **Import**: `ImportMatchesUseCase` reads the same repositories and writes through `MatchRepository.save()`, `GameTypeRepository.save()`, and `PlayerRepository.save()`
- **Cloud Sync**: Google Drive via `GoogleDriveSyncAdapter`. Stores a single `scoreo-data.json` in the invisible App Data Folder. Syncs players, game types, and matches. Drive API v3, synchronous XMLHttpRequest, OAuth Token Model (GIS). See `SyncUseCase`, `SyncHandler`.
- **Import**: `ImportMatchesUseCase` reads the same repositories and writes through `MatchRepository.save()`, `GameTypeRepository.save()`, and `PlayerRepository.save()`

See [`deployment.md`](deployment.md) for CI/CD and deployment details.

## Backward Compatibility

Data stored in `localStorage` must remain readable after an app update.

**Rule**: any change to a serialized domain model must be backward compatible with at least the previous version.

**Soft-delete**: `Player.active = false` (défaut `true`) masque le joueur des écrans actifs (Home, Setup, ScoreDetail) mais le conserve dans l'historique. `getAll()` exclut les inactifs par défaut. `getAll(includeInactive = true)` les inclut pour le rendu historique. Le nom peut être optionnellement blanchi (`anonymize = true` dans `delete()`).

In practice:
- **Adding a field**: always provide a default value (`= emptyList()`, `= null`, etc.) so old data deserializes cleanly. `Json { ignoreUnknownKeys = true }` is already configured.
- **Renaming / removing a field**: requires a migration step — read old key, transform, write to new key. Document the migration in a `doc/technical/migrations.md` file.
- **Never change the type of an existing field** without a migration.

This applies to: `Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`.

**Current entity formats:**

| Entity | Fields |
|---|---|---|
| `Player` | `id: String` (UUID v4), `name: String`, `active: Boolean = true` |
| `GameType` | `id: String` (UUID v4), `name: String`, `winCondition: WinCondition` |
| `Match` | `id: String` (UUID v4), `date: Long` (epoch ms), `gameTypeId: String`, `playerScores: List<PlayerScore>`, `manualWinners: List<String>` |
| `PlayerScore` | `playerId: String`, `score: Int` |
| `WinCondition` | Enum: `HIGHEST_SCORE`, `LOWEST_SCORE`, `MANUAL` |

**Migration mechanism:** `LocalStorageMatchRepository.getAll()` runs a transparent migration on every read.
It detects old-format data (String dates, non-UUID ids) and converts them in-place.
See `doc/technical/migrations.md` for details.

