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
- **Storage adapter**: in-memory (dev); will be replaced by localStorage/IndexedDB adapter

## Web Target

`js(IR)` — Compose HTML generates real HTML DOM elements.
Entry point: `src/jsMain/kotlin/com/scoreo/Main.kt` → `renderComposable(rootElementId = "root")`.

## Source package structure

```
src/
  commonMain/kotlin/com/scoreo/
    domain/
      model/       # Entities: Player, GameType, Match, PlayerScore, WinCondition
      port/        # Repository interfaces (input/output ports)
    application/   # Use cases (domain orchestration, no framework deps)
    ui/
      navigation/  # AppNavigator, Screen sealed class, SetupSection enum
      player/      # PlayerHandler, PlayerState, PlayerIntent
      gametype/    # GameTypeHandler, GameTypeState, GameTypeIntent
      creatematch/ # CreateMatchHandler, CreateMatchState, CreateMatchIntent
      scoredetail/ # ScoreDetailHandler, ScoreDetailState, ScoreDetailIntent
      history/     # HistoryHandler, MatchDisplay
      import/      # ImportHandler, ImportState, ImportIntent
  jsMain/kotlin/com/scoreo/
    App.kt          # Root composable: HTML layout + 3-tab navigation bar
    Main.kt         # Entry point: renderComposable
    infrastructure/ # LocalStorage storage adapters
    ui/
      player/       # PlayerScreen (also used inside SetupScreen)
      gametype/     # GameTypeScreen (also used inside SetupScreen)
      creatematch/  # CreateMatchScreen — game & player selection
      scoredetail/  # ScoreDetailScreen — multi-round score table
      history/      # HistoryScreen
      import/       # ImportScreen — file upload, preview, execution, result
      setup/        # SetupScreen — merged Players + Games management with tabs
  jsMain/resources/
    index.html      # PWA shell (div#root entry point)
    styles.css      # Design system (layout, components, nav bar, tabs)
  commonTest/kotlin/com/scoreo/
    domain/         # Domain unit tests (GameTypeTest)
    application/    # Use case tests (CreateMatchUseCase, GetPlayerStats, etc.)
    ui/             # Handler tests (PlayerHandlerTest)
```

## Styling

Single `styles.css` file with CSS custom properties (design tokens), a fixed bottom navigation bar (`position: fixed; bottom: 0`), and minimal component styles (cards, inputs, buttons).

## Persistence

- **Current**: localStorage via `LocalStorage*Repository` (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)
- **Import**: `ImportMatchesUseCase` reads the same repositories and writes through `MatchRepository.save()`
- **Future**: optional sync to a remote backend (additional infrastructure adapter)

## CI/CD & Deployment

Two workflows run on every push to `main`, both build the same production artifact.

### Codeberg Pages — Forgejo Actions

File: `.forgejo/workflows/deploy.yml`

Steps:
1. Build: `gradle jsBrowserProductionWebpack` (container `gradle:8.12-jdk21`)
2. Copy `index.html` + `styles.css` into `build/kotlin-webpack/js/productionExecutable/`
3. Publish via [`git-pages/action@v2`](https://codeberg.org/git-pages/action)

URL: `https://<username>.codeberg.page/Scoreo/`

### GitHub Pages — GitHub Actions

File: `.github/workflows/deploy.yml`

Steps:
1. Set up JDK 21 (`actions/setup-java` temurin)
2. Set up Gradle via [`gradle/actions/setup-gradle@v4`](https://github.com/gradle/actions) with `gradle-version: wrapper` (reads version from `gradle-wrapper.properties`, no JAR needed)
3. Build: `gradle jsBrowserProductionWebpack`
4. Copy `index.html` + `styles.css` into `build/kotlin-webpack/js/productionExecutable/`
5. Publish via `actions/upload-pages-artifact` + `actions/deploy-pages`

URL: `https://<username>.github.io/Scoreo/`

> Enable in *Settings → Pages → Source: GitHub Actions*.

> Note: `gradle-wrapper.jar` is **not** committed to the repository. CI tools bootstrap Gradle directly from `gradle-wrapper.properties`.

## Backward Compatibility

Data stored in `localStorage` must remain readable after an app update.

**Rule**: any change to a serialized domain model must be backward compatible with at least the previous version.

In practice:
- **Adding a field**: always provide a default value (`= emptyList()`, `= null`, etc.) so old data deserializes cleanly. `Json { ignoreUnknownKeys = true }` is already configured.
- **Renaming / removing a field**: requires a migration step — read old key, transform, write to new key. Document the migration in a `doc/technical/migrations.md` file.
- **Never change the type of an existing field** without a migration.

This applies to: `Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`.

**Current entity formats:**

| Entity | Fields |
|---|---|
| `Player` | `id: String` (UUID v4), `name: String` |
| `GameType` | `id: String` (UUID v4), `name: String`, `winCondition: WinCondition` |
| `Match` | `id: String` (UUID v4), `date: Long` (epoch ms), `gameTypeId: String`, `playerScores: List<PlayerScore>`, `manualWinners: List<String>` |
| `PlayerScore` | `playerId: String`, `score: Int` |
| `WinCondition` | Enum: `HIGHEST_SCORE`, `LOWEST_SCORE`, `MANUAL` |

**Migration mechanism:** `LocalStorageMatchRepository.getAll()` runs a transparent migration on every read.
It detects old-format data (String dates, non-UUID ids) and converts them in-place.
See `doc/technical/migrations.md` for details.

