# Reference — for the LLM

Exhaustive tables. Read before exploring `src/`.

## Reducers (MVI-style)

| Screen         | Reducer file                               | Action type         | Actions                                                                                                                                                      | State file                                                                                            |
| -------------- | ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Home (players) | `src/ui/home/homeReducer.ts`               | `HomeAction`        | `loaded`, `updateInput`, `addSucceeded`, `addFailed`, `togglePlayerSelection`, `showDeleteConfirm`, `dismissDeleteConfirm`, `deleted`                        | `src/ui/home/homeTypes.ts` (`HomeState`)                                                              |
| MatchSetup     | `src/ui/matchsetup/matchSetupReducer.ts`   | `MatchSetupAction`  | `selectVariant`                                                                                                                                              | `src/ui/matchsetup/matchSetupTypes.ts` (`MatchSetupState`)                                            |
| ScoreDetail    | `src/ui/scoredetail/scoreDetailReducer.ts` | `ScoreDetailAction` | `updateToriiCount`, `updateParchemin`, `setPinceauHolder`, `updateObjectifPoints`, `updateObjectifInput`, `setObjectifManual`, `saveSucceeded`, `saveFailed` | `src/ui/scoredetail/scoreDetailTypes.ts` (`ScoreDetailState`, `ScoreDetailMode` = `Create` \| `Edit`) |

History (`src/ui/history/HistoryScreen.tsx`) has no reducer — it's simple enough to use plain `useState`/`useEffect` (match list, players, and the post-export notice).

## Use Cases

`src/application/*.ts` — one class per file, business logic with zero framework dependency, constructed with the ports (repositories) it needs. Validation/lookup failures throw `ValidationError`/`NotFoundError` (`src/domain/model/errors.ts`).

| Use Case              | Method                                                 | Returns    |
| --------------------- | ------------------------------------------------------ | ---------- |
| `AddPlayerUseCase`    | `invoke(name: string)`                                 | `Player`   |
| `DeletePlayerUseCase` | `invoke(id, anonymize = false)`                        | `void`     |
| `RenamePlayerUseCase` | `invoke(playerId, newName)`                            | `void`     |
| `GetPlayersUseCase`   | `invoke(includeInactive = false)`                      | `Player[]` |
| `CreateMatchUseCase`  | `invoke(playerIds, results, playedAt, objectifCards?)` | `Match`    |
| `UpdateMatchUseCase`  | `invoke(matchId, results, objectifCards?)`             | `Match`    |
| `GetMatchesUseCase`   | `invoke()`                                             | `Match[]`  |
| `DeleteMatchUseCase`  | `invoke(matchId)`                                      | `void`     |
| `ExportMatchesUseCase` | `invoke()`                                            | `ExportMatchesResult` (Scoreo import payload + count of skipped solo matches — see [`functional/features/export.md`](functional/features/export.md)) |

## Domain Models

`src/domain/model/*.ts` — plain interfaces, validated at the localStorage boundary by a matching `*.schema.ts` (zod).

| Model                                           | Fields                                                                                                                                                                                            | File                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Player`                                        | `id`, `name`, `active` (default `true`)                                                                                                                                                           | `player.ts` / `player.schema.ts` — both re-export `@scoreboards/shared-domain`, the host's definition                 |
| `ToriiColor` / `ToriiCounts`                    | union `'green' \| 'red' \| 'blue' \| 'yellow' \| 'purple'`; `Record<ToriiColor, number>` (0–7 each)                                                                                               | `torii.ts` — also exports `scoreTorii(counts)`                                                                       |
| `LandscapeType` / `ObjectifPoints`              | union `'bamboo' \| 'cherryBlossom' \| 'mountain' \| 'water' \| 'village'`; `Record<LandscapeType, number>`                                                                                        | `landscape.ts` — also exports `landscapeTypeLabel()`                                                                 |
| `ObjectifVariant` / `ObjectifCardSelection`     | union `'A' \| 'B' \| 'C'`; `Record<LandscapeType, ObjectifVariant>` — one card dealt per landscape at setup                                                                                       | `landscape.ts` — also exports `defaultObjectifCardSelection()` (all `A`), `isObjectifVariant()`                      |
| `PlayerResult`                                  | `playerId`, `toriiCounts`, `parcheminValue: 0\|3\|4\|5` (default `0`), `hasPinceau` (default `false`), `objectifPoints`, `objectifInputs` (default empty), `objectifManual` (default all `false`) | `match.ts` / `match.schema.ts` — also exports `scorePlayerResult(result)`                                            |
| `Match`                                         | `id`, `playedAt` (epoch ms), `playerIds: string[]`, `results: PlayerResult[]` (default `[]`), `objectifCards: ObjectifCardSelection` (default all `A`)                                            | `match.ts` / `match.schema.ts` — also exports `matchWinners(match)`                                                  |
| `ObjectifCardDefinition` / `ObjectifInputField` | per-card `fields` descriptor (`key`, `labelKey`, `min`, `max`, `kind: 'count' \| 'flag'`) plus a `score(inputs)` function; `computable: false` for the two neighbour-dependent cards              | `objectifCard.ts` — also exports `objectifCard(landscape, variant)`, `scoreObjectifCard(landscape, variant, inputs)` |
| `ValidationError` / `NotFoundError`             | real `Error` subclasses (`kind: 'Validation' \| 'NotFound'`), union type `DomainError`                                                                                                            | `errors.ts`                                                                                                          |

## Hosted module

The package is both a standalone app and a scoring module Scoreo loads. What the host uses:

| Export | File | Role |
| --- | --- | --- |
| `toriValleyManifest` | `src/module.ts` | Read eagerly by Scoreo's registry, so this file imports nothing but its type |
| `toriValleyModule` | `src/module.ts` | `{ manifest, load }` — `load` holds a dynamic import, which is what puts the screen in its own chunk |
| `ToriValleyModuleScreen` | `src/ui/module/ToriValleyModuleScreen.tsx` | Default export, implements `ScoringModuleScreenProps`. Reads players from `host.getPlayers()`, saves through `host.saveMatch()`, and **never touches `tori_valley_*`** — the host owns the storage |
| `toModuleMatchResult` | `src/domain/model/moduleResult.ts` | The single description of a finished match, keyed by `playerId`. The v1.1 file export maps ids to names on top of it, so file and module can never disagree about a rank or a category |
| `ToriValleyModuleDataSchema` | `src/domain/model/moduleResult.ts` | Validates the opaque payload the host hands back when a match is reopened; an unreadable one starts a fresh grid |

`ScoreDetailScreen` takes a `save(results, objectifCards)` callback rather than use cases: standalone writes to the repository, hosted hands the result to Scoreo.

## Ports (Repository Interfaces)

`src/domain/port/*.ts` — plain TypeScript interfaces.

| Interface          | Methods                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `PlayerRepository` | `getAll(includeInactive?)`, `save(player)`, `delete(id, anonymize?)` |
| `MatchRepository`  | `getAll()`, `findById(id)`, `save(match)`, `delete(id)`              |

## Adapters (Implementations)

| Class                                                  | Implements         | Storage                              | File                                                              |
| ------------------------------------------------------ | ------------------ | ------------------------------------ | ----------------------------------------------------------------- |
| `LocalStoragePlayerRepository`                         | `PlayerRepository` | localStorage (`tori_valley_players`) | `src/infrastructure/localStorage/localStoragePlayerRepository.ts` |
| `LocalStorageMatchRepository`                          | `MatchRepository`  | localStorage (`tori_valley_matches`) | `src/infrastructure/localStorage/localStorageMatchRepository.ts`  |
| `InMemoryPlayerRepository` / `InMemoryMatchRepository` | matching port      | in-memory, tests only                | `src/infrastructure/testing/inMemory*Repository.ts`               |

## Services (root DI)

`src/services/createServices.ts` builds the concrete repositories once; `src/services/ServicesContext.tsx` exposes them via `ServicesProvider`/`useServices()`. `ScoreDetail`'s use cases are constructed ad hoc per-screen in `App.tsx`'s `ScoreDetailRoute` (`useMemo` keyed on route params), matching scoreo's pattern.

## Navigation

`src/ui/navigation/screen.ts` — discriminated union `Screen`: `Home | History | MatchSetup | ScoreDetail` (`matchId` absent = create mode, present = edit mode). `src/ui/navigation/hash.ts` exports pure `parseHash(hash)`/`screenToHash(screen)`. `src/ui/navigation/useHashRouter.ts` syncs a `Screen` with `window.location.hash` via `pushState`/`popstate`.

| Screen        | Parameters                                | Hash                                       | Destination                                                 |
| ------------- | ----------------------------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| `Home`        | `selectedPlayerIds?`                      | `#/` or `#/players/<ids>`                  | `HomeScreen` — player list, multi-select (1–4), start match |
| `History`     | —                                         | `#/history`                                | `HistoryScreen` — past matches, edit/delete                 |
| `MatchSetup`  | `playerIds`, `matchId?`                   | `#/setup/<ids>[/<matchId>]`                | `MatchSetupScreen` — one Objectif variant per landscape     |
| `ScoreDetail` | `playerIds`, `matchId?`, `objectifCards?` | `#/score/<ids>[/<matchId or ->][/<cards>]` | `ScoreDetailScreen` — score entry, create or edit mode      |

`Home` carries `selectedPlayerIds` so backing out of `MatchSetup` returns to a still-ticked player list. `ScoreDetail`'s cards are encoded as one variant letter per landscape in `LANDSCAPE_TYPES` order (e.g. `AABCA`); `-` stands in for an absent `matchId` so the card segment keeps a fixed position. A malformed card segment is ignored rather than failing the route.

## Shared Components

| Component   | Props                                                                                                                                           | Usage                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `AppButton` | `text`, `variant?` (`'primary' \| 'secondary' \| 'ghost' \| 'danger'`, default `primary`), `iconOnly?`, `ariaLabel?`, `...ButtonHTMLAttributes` | The single interactive-action primitive. |

`src/ui/shared/downloadJson.ts` — not a component: `downloadJson(filename, content)` hands the user a `.json` file through the browser's download flow (used by History's Scoreo export).

## Tests

Two suites, answering different questions — see [`technical/visual-testing.md`](technical/visual-testing.md).

**Behaviour** (`pnpm test`) — colocated `*.test.ts(x)` next to the file they cover, running under Vitest + `jsdom`. Every screen has a component test on top of its reducer's pure-function tests; `src/App.test.tsx` covers the full add-player → start-match → save → view-in-history flow end to end. One exception to colocation: `src/test/sw.test.ts` covers `public/sw.js` (loaded through `?raw` and evaluated with fake `self`/`caches`), because Vitest only collects `src/**`.

**Visual regression** (`pnpm test:visual`) — Playwright + Chromium against the production build, in `tests/visual/`. Two viewport projects (`phone` 412×839, `desktop` 1280×800), so every row below is two committed PNGs. State is seeded straight into `localStorage` by `openApp()` and each screen is reached by its hash route, never by clicking through the previous one.

| Spec file                                | Screen      | Captures                                                                       |
| ---------------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| `tests/visual/home.visual.spec.ts`        | Home        | empty state, with players, an overlong player name, French labels               |
| `tests/visual/matchSetup.visual.spec.ts`  | MatchSetup  | variant picker at defaults, and pre-filled from a stored match                  |
| `tests/visual/scoreDetail.visual.spec.ts` | ScoreDetail | create mode (3 players and solo), edit mode populated from a stored match       |
| `tests/visual/history.visual.spec.ts`     | History     | empty state, two matches incl. the winner highlight, a deleted-player fallback  |
| `tests/visual/darkMode.visual.spec.ts`    | Home + ScoreDetail | the `prefers-color-scheme: dark` palette                                |

Support files: `tests/visual/support/app.ts` (`openApp`, `expectScreenshot`, `routes`) and `tests/visual/support/fixtures.ts` (fixed `Player[]`/`Match[]`, typed against the domain models). Baselines live in `tests/visual/*-snapshots/` and **must be recorded through `pnpm test:visual:container`**, never on a developer machine.

## localStorage Keys

| Key                    | Content                              |
| ---------------------- | ------------------------------------ |
| `tori_valley_players`  | JSON `Player[]`                      |
| `tori_valley_matches`  | JSON `Match[]`                       |
| `scoreo_lang` | Selected UI language (`'en'`/`'fr'`), shared with Scoreo. Replaces `tori_valley_language`, still read once for a language chosen before the merge |

## Internationalization

`src/i18n/index.ts` — the module's dictionaries as the `tori-valley` i18next namespace, added to a host instance by `registerTranslations()`. `src/i18n/standalone.ts` — the instance used when the app runs on its own, initialized once from `main.tsx` (and `src/test/setup.ts` for tests). Resource dictionaries: `src/i18n/locales/en.ts` / `fr.ts`. `App.tsx` renders the language `<select>` in the app header. `ValidationError`/`NotFoundError` (`src/domain/model/errors.ts`) carry an optional `code` (+ `params`) i18n key, translated by the `ui` layer.
