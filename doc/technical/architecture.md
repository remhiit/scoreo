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
      navigation/  # AppNavigator, Screen sealed class
      player/      # PlayerHandler, PlayerState, PlayerIntent
      gametype/    # GameTypeHandler, GameTypeState, GameTypeIntent
      creatematch/ # CreateMatchHandler, CreateMatchState, CreateMatchIntent
      history/     # HistoryHandler, MatchDisplay
  jsMain/kotlin/com/scoreo/
    App.kt          # Root composable: HTML layout + navigation bar
    Main.kt         # Entry point: renderComposable
    infrastructure/ # In-memory storage adapters
    ui/             # Compose HTML screens (PlayerScreen, GameTypeScreen, etc.)
  jsMain/resources/
    index.html      # PWA shell (div#root entry point)
    styles.css      # Design system (layout, components, nav bar)
  commonTest/kotlin/com/scoreo/
    domain/         # Domain unit tests (GameTypeTest)
    application/    # Use case tests (CreateMatchUseCase, GetPlayerStats, etc.)
    ui/             # Handler tests (PlayerHandlerTest)
```

## Styling

Single `styles.css` file with CSS custom properties (design tokens), a fixed bottom navigation bar (`position: fixed; bottom: 0`), and minimal component styles (cards, inputs, buttons).

## Persistence

- **Current**: localStorage via `LocalStorage*Repository` (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)
- **Future**: optional sync to a remote backend (additional infrastructure adapter)

## CI/CD & Deployment

**Forgejo Actions** (`.forgejo/workflows/deploy.yml`) — runs on every push to `main`.

Steps:
1. Build the production bundle: `./gradlew jsBrowserProductionWebpack`
2. Copy static assets (`index.html`, `styles.css`) into `build/kotlin-webpack/js/productionExecutable/`
3. Publish to **Codeberg Pages** via [`git-pages/action@v2`](https://codeberg.org/git-pages/action)

Published URL: `https://<username>.codeberg.page/Scoreo/`

Runner image: `eclipse-temurin:21-jdk`. Gradle wrapper cache is preserved across runs.

## Backward Compatibility

Data stored in `localStorage` must remain readable after an app update.

**Rule**: any change to a serialized domain model must be backward compatible with at least the previous version.

In practice:
- **Adding a field**: always provide a default value (`= emptyList()`, `= null`, etc.) so old data deserializes cleanly. `Json { ignoreUnknownKeys = true }` is already configured.
- **Renaming / removing a field**: requires a migration step — read old key, transform, write to new key. Document the migration in a `doc/technical/migrations.md` file.
- **Never change the type of an existing field** without a migration.

This applies to: `Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`.

