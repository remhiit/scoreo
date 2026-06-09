# Copilot Instructions — Scoreo

## Project

PWA for tracking game/match results between friends, built with Kotlin/JS.

## Repository structure

- `src/commonMain` — domain, application, MVI handlers/intents/states, navigation (pure Kotlin, shared)
- `src/jsMain` — Compose HTML screens, infrastructure adapters, entry point (`Main.kt`)
- `doc/functional/` — functional documentation (features, user flows)
- `doc/technical/` — technical documentation (architecture, design decisions)

## Stack

- **Platform:** Progressive Web App (PWA) — Android & iOS targets planned later
- **Language:** Kotlin (`js(IR)` target)
- **UI framework:** Compose HTML (`org.jetbrains.compose.html:html-core`) — generates real HTML DOM
- **Build system:** Gradle (Kotlin DSL)
- **UI pattern:** MVI (Model-View-Intent)
- **Application architecture:** Hexagonal (Ports & Adapters)
- **Styling:** `src/jsMain/resources/styles.css` — CSS custom properties, fixed top header
- **Storage:** localStorage via `LocalStorage*Repository` (scoreo_players, scoreo_gametypes, scoreo_matches keys)

See [`doc/technical/architecture.md`](../doc/technical/architecture.md) for the full architecture description.
See [`doc/functional/features.md`](../doc/functional/features.md) for the feature list.

## Backward Compatibility

Any change to a serialized domain model (`Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`) must be backward compatible with at least the previous version.

- **Adding a field**: provide a default value so old localStorage data deserializes without error.
- **Renaming or removing a field**: write a migration step and document it in `doc/technical/migrations.md`.
- **Never change the type of an existing field** without a migration.

`Json { ignoreUnknownKeys = true }` is already configured in all repositories.

## Documentation maintenance

When implementing a new feature, update `doc/functional/` with the relevant user-facing behavior.
When making a technical decision (architecture, library choice, data model, etc.), document it in `doc/technical/`.
When adding a new handler or use case, add a corresponding test file in `src/commonTest/` under the matching package.

## Build Commands

```bash
# Dev server (hot reload, port 9191)
./gradlew jsBrowserDevelopmentRun --continuous

# Production build
./gradlew jsBrowserProductionWebpack
# Then copy assets and serve:
# cp src/jsMain/resources/{index.html,styles.css} build/kotlin-webpack/js/productionExecutable/
# cd build/kotlin-webpack/js/productionExecutable && python3 -m http.server 9191

# Run all tests (JVM — fast, no browser needed)
./gradlew jvmTest

# Run a single test class
./gradlew jvmTest --tests "com.scoreo.ui.player.PlayerHandlerTest"
```
