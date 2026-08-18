# Reference — for the LLM

Exhaustive tables. Read before exploring `src/`.

## Reducers (MVI-style)

| Screen         | Reducer file                               | Action type         | Actions                                                                                                                               | State file                                                                                            |
| -------------- | ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Home (players) | `src/ui/home/homeReducer.ts`               | `HomeAction`        | `loaded`, `updateInput`, `addSucceeded`, `addFailed`, `togglePlayerSelection`, `showDeleteConfirm`, `dismissDeleteConfirm`, `deleted` | `src/ui/home/homeTypes.ts` (`HomeState`)                                                              |
| ScoreDetail    | `src/ui/scoredetail/scoreDetailReducer.ts` | `ScoreDetailAction` | `updateToriiCount`, `updateParchemin`, `setPinceauHolder`, `updateObjectifPoints`, `saveSucceeded`, `saveFailed`                      | `src/ui/scoredetail/scoreDetailTypes.ts` (`ScoreDetailState`, `ScoreDetailMode` = `Create` \| `Edit`) |

History (`src/ui/history/HistoryScreen.tsx`) has no reducer — it's simple enough to use plain `useState`/`useEffect`.

## Use Cases

`src/application/*.ts` — one class per file, business logic with zero framework dependency, constructed with the ports (repositories) it needs. Validation/lookup failures throw `ValidationError`/`NotFoundError` (`src/domain/model/errors.ts`).

| Use Case              | Method                                 | Returns    |
| --------------------- | -------------------------------------- | ---------- |
| `AddPlayerUseCase`    | `invoke(name: string)`                 | `Player`   |
| `DeletePlayerUseCase` | `invoke(id, anonymize = false)`        | `void`     |
| `RenamePlayerUseCase` | `invoke(playerId, newName)`            | `void`     |
| `GetPlayersUseCase`   | `invoke(includeInactive = false)`      | `Player[]` |
| `CreateMatchUseCase`  | `invoke(playerIds, results, playedAt)` | `Match`    |
| `UpdateMatchUseCase`  | `invoke(matchId, results)`             | `Match`    |
| `GetMatchesUseCase`   | `invoke()`                             | `Match[]`  |
| `DeleteMatchUseCase`  | `invoke(matchId)`                      | `void`     |

## Domain Models

`src/domain/model/*.ts` — plain interfaces, validated at the localStorage boundary by a matching `*.schema.ts` (zod).

| Model                               | Fields                                                                                                                  | File                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `Player`                            | `id`, `name`, `active` (default `true`)                                                                                 | `player.ts` / `player.schema.ts`                                          |
| `ToriiColor` / `ToriiCounts`        | union `'green' \| 'red' \| 'blue' \| 'yellow' \| 'purple'`; `Record<ToriiColor, number>` (0–7 each)                     | `torii.ts` — also exports `scoreTorii(counts)`                            |
| `LandscapeType` / `ObjectifPoints`  | union `'bamboo' \| 'cherryBlossom' \| 'mountain' \| 'water' \| 'village'`; `Record<LandscapeType, number>`              | `landscape.ts` — also exports `landscapeTypeLabel()`                      |
| `PlayerResult`                      | `playerId`, `toriiCounts`, `parcheminValue: 0\|3\|4\|5` (default `0`), `hasPinceau` (default `false`), `objectifPoints` | `match.ts` / `match.schema.ts` — also exports `scorePlayerResult(result)` |
| `Match`                             | `id`, `playedAt` (epoch ms), `playerIds: string[]`, `results: PlayerResult[]` (default `[]`)                            | `match.ts` / `match.schema.ts` — also exports `matchWinners(match)`       |
| `ValidationError` / `NotFoundError` | real `Error` subclasses (`kind: 'Validation' \| 'NotFound'`), union type `DomainError`                                  | `errors.ts`                                                               |

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

`src/ui/navigation/screen.ts` — discriminated union `Screen`: `Home | History | { type: 'ScoreDetail', playerIds, matchId? }` (`matchId` absent = create mode, present = edit mode). `src/ui/navigation/hash.ts` exports pure `parseHash(hash)`/`screenToHash(screen)`. `src/ui/navigation/useHashRouter.ts` syncs a `Screen` with `window.location.hash` via `pushState`/`popstate`.

| Screen        | Parameters              | Destination                                                 |
| ------------- | ----------------------- | ----------------------------------------------------------- |
| `Home`        | —                       | `HomeScreen` — player list, multi-select (1–4), start match |
| `History`     | —                       | `HistoryScreen` — past matches, edit/delete                 |
| `ScoreDetail` | `playerIds`, `matchId?` | `ScoreDetailScreen` — score entry, create or edit mode      |

## Shared Components

| Component   | Props                                                                                                                                           | Usage                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `AppButton` | `text`, `variant?` (`'primary' \| 'secondary' \| 'ghost' \| 'danger'`, default `primary`), `iconOnly?`, `ariaLabel?`, `...ButtonHTMLAttributes` | The single interactive-action primitive. |

## Tests

Colocated `*.test.ts(x)` next to the file they cover, running under Vitest + `jsdom`. Every screen has a component test on top of its reducer's pure-function tests; `src/App.test.tsx` covers the full add-player → start-match → save → view-in-history flow end to end.

## localStorage Keys

| Key                    | Content                              |
| ---------------------- | ------------------------------------ |
| `tori_valley_players`  | JSON `Player[]`                      |
| `tori_valley_matches`  | JSON `Match[]`                       |
| `tori_valley_language` | Selected UI language (`'en'`/`'fr'`) |

## Internationalization

`src/i18n/index.ts` — i18next instance (English/French), initialized once from `main.tsx` (and `src/test/setup.ts` for tests). Resource dictionaries: `src/i18n/locales/en.ts` / `fr.ts`. `App.tsx` renders the language `<select>` in the app header. `ValidationError`/`NotFoundError` (`src/domain/model/errors.ts`) carry an optional `code` (+ `params`) i18n key, translated by the `ui` layer.
