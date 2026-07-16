# Reference — for the LLM

Exhaustive tables. Read before exploring `src/`.

## Reducers (MVI-style)

Each screen owns a pure `(state, action) => state` reducer, colocated with its screen under `src/ui/<screen>/`. Side-effecting work (use-case calls, repository reads) happens in `submit*`/`load*` helper functions called from the screen component, which then `dispatch()` the resulting action — the reducer itself never touches a repository.

| Screen | Reducer file | Action type | Actions | State file |
|---|---|---|---|---|
| Home (players) | `src/ui/home/playerReducer.ts` | `PlayerAction` | `loaded`, `updateInput`, `addSucceeded`, `addFailed`, `showDeleteConfirm`, `dismissDeleteConfirm`, `deleted`, `startRename`, `updateRenameInput`, `renameSucceeded`, `renameFailed`, `cancelRename`, `showCleanupConfirm`, `dismissCleanupConfirm`, `cleanupCompleted` | `src/ui/home/playerTypes.ts` (`PlayerState`) |
| Games | `src/ui/gametype/gameTypeReducer.ts` | `GameTypeAction` | `loaded`, `updateName`, `selectWinCondition`, `updateTieBreakRule`, `updateTieBreakCondition`, `updateTieBreakLabel`, `selectGame`, `deselectGame`, `addSucceeded`, `addFailed`, `editGameType`, `cancelEdit`, `updateSucceeded`, `updateFailed`, `showArchiveConfirm`, `archiveSucceeded`, `archiveFailed`, `dismissArchiveConfirm` | `src/ui/gametype/gameTypeTypes.ts` (`GameTypeState`) |
| Import | `src/ui/import/importReducer.ts` | `ImportAction` | `previewReady`, `previewFailed`, `importSucceeded`, `importFailed`, `fileError`, `reset` | `src/ui/import/importTypes.ts` (`ImportState`, `step: 'IDLE' \| 'READY' \| 'DONE'`) |
| ScoreDetail | `src/ui/scoredetail/scoreDetailReducer.ts` | `ScoreDetailAction` | `updateScore`, `addRound`, `removeRound`, `cancelImmediate`, `showCancelConfirm`, `confirmCancel`, `dismissCancelConfirm`, `validationFailed`, `openWinnerModal`, `openManualSelectionDialog`, `openSecondaryScoreDialog`, `saved`, `saveFailed`, `dismissModal`, `toggleModalWinner`, `confirmWinnersEmptyError`, `updateSecondaryScoreInput`, `secondaryScoreInvalid`, `secondaryScoreEscalate`, `toggleManualSelectionWinner`, `manualWinnersEmptyError`, `dismissTieBreak` | `src/ui/scoredetail/scoreDetailTypes.ts` (`ScoreDetailState`, `ScoreDetailMode` = `Create` \| `Edit`) |
| Stats | `src/ui/stats/statsReducer.ts` | `StatsAction` | `selectPlayer`, `backToLeaderboard`, `selectGameType`, `loaded` | `src/ui/stats/statsTypes.ts` (`StatsState`, `selectedPlayer()` helper) |
| History | `src/ui/history/historyReducer.ts` | `HistoryAction` | `loaded`, `showDeleteConfirm`, `deleteFailed`, `dismissDeleteConfirm`, `selectGameTypeFilter` | `src/ui/history/historyTypes.ts` (`HistoryState`, `MatchDisplay`) |
| Sync | `src/ui/sync/syncReducer.ts` | `SyncAction` | `restoringSession`, `restoreFinished`, `loginStarted`, `loginFailed`, `connected`, `synced`, `conflictDetected`, `syncFailed`, `loggedOut`, `resolvingConflict`, `conflictResolved`, `conflictResolveFailed`, `dismissError` | `src/ui/sync/syncTypes.ts` (`SyncState`, `phase: SyncPhase` — `Disconnected \| Restoring \| Connecting \| Detecting \| Syncing \| Resolved \| Conflict`) |

Notable design choices:
- **Home/players**: UI-only state that was never captured by a reducer (multi-player selection, game-selection modal, inline add-game-type form, onboarding/resume-draft banners) lives in plain `useState` inside `HomeScreen.tsx`, not the reducer. `cleanupCandidates` (inactive players with no recorded match, from `CleanupInactivePlayersUseCase.preview()`) and `showCleanupConfirm` are recomputed by every `loadPlayers()` call, alongside `players`/`stats`, so the "Clean up (N)" button and its confirmation modal always reflect the current preview.
- **ScoreDetail**: `buildInitialState()` resolves `Create` vs `Edit` mode and restores a matching draft; a `useEffect` keyed on `state.rounds` autosaves the draft after each score change (skipped on the initial mount via a ref, so no draft is written before the first user edit).
- **Stats**: `StatsScreen` exposes an `onBackOverrideChange` prop so `App.tsx` can make the header's back button clear the player selection instead of navigating, when a player is selected (see App shell below).

## Use Cases

`src/application/*.ts` — one class per file, business logic with zero framework dependency, constructed with the ports (repositories) it needs. Validation/lookup failures either throw `ValidationError`/`NotFoundError` (`src/domain/model/errors.ts`) or, where the call site needs to branch on the outcome without try/catch, return `Result<T, E>` (`src/domain/result.ts` — `{ ok: true, value } | { ok: false, error }`).

| Use Case | Method | Returns |
|---|---|---|
| `AddPlayerUseCase` | `invoke(name: string)` | `Player` |
| `AddGameTypeUseCase` | `invoke(name, winCondition, options?: AddGameTypeOptions)` — options: `tieBreakRule`, `tieBreakCondition`, `tieBreakLabel` | `GameType` |
| `ArchiveGameTypeUseCase` | `invoke(gameTypeId: string)` | `void` |
| `CreateMatchUseCase` | `invoke(gameTypeId, playerScores, date, options?: CreateMatchOptions)` — options: `manualWinners`, `secondaryPlayerScores` | `Result<Match, DomainError>` |
| `UpdateMatchUseCase` | `invoke(match: Match)` | `void` |
| `DeleteMatchUseCase` | `invoke(matchId: string)` | `void` |
| `DeletePlayerUseCase` | `invoke(id: string, anonymize = false)` | `void` |
| `RenamePlayerUseCase` | `invoke(playerId: string, newName: string)` | `void` |
| `CleanupInactivePlayersUseCase` | `preview()`, `execute()` | `Player[]` (inactive players referenced by no match; `execute()` hard-deletes them and returns the same list) |
| `GetPlayersUseCase` | `invoke(includeInactive = false)` | `Player[]` |
| `GetPlayerStatsUseCase` | `invoke()` | `Map<string, PlayerStats>` |
| `GetHeadToHeadUseCase` | `invoke(gameTypeId?: string)` | `PlayerDetail[]` (sorted by ELO desc, ≥1 match only) |
| `EloCalculator` | `compute(matches, gameTypes: Map<string, GameType>)` | `Map<string, number>` |
| `FindGameTypeByIdUseCase` | `invoke(id: string)` | `GameType \| undefined` |
| `GetGameTypesUseCase` | `invoke(includeInactive = false)` | `GameType[]` |
| `GetMatchesUseCase` | `invoke()` | `Match[]` |
| `UpdateGameTypeUseCase` | `invoke(gameType: GameType)` | `void` |
| `ImportMatchesUseCase` | `preview(jsonString)`, `execute(jsonString)` | `Result<ImportPreview, Error>`, `Result<ImportResult, Error>` |
| `SyncUseCase` | `async autoSync()` | `Promise<SyncOutcome>` (`{kind:'Synced', result} \| {kind:'Conflict', conflict}`) |
| `SyncUseCase` | `async resolveConflict(keepLocal: boolean)` | `Promise<SyncResult>` |
| `SyncUseCase` | `async login()` / `async logout()` / `async status()` | `Promise<void>` / `Promise<void>` / `Promise<SyncStatus>` |

## Domain Models

`src/domain/model/*.ts` — plain interfaces, validated at the localStorage boundary by a matching `*.schema.ts` (zod, `.default()` per field added after the original release — see "Backward Compatibility" in `doc/technical/architecture.md`).

| Model | Fields | File |
|---|---|---|
| `Player` | `id: string`, `name: string`, `active: boolean` (default `true`) | `player.ts` / `player.schema.ts` |
| `GameType` | `id`, `name`, `winCondition: WinCondition`, `tieBreakRule: TieBreakRule` (default `'NONE'`), `tieBreakCondition: WinCondition` (default `'HIGHEST_SCORE'`), `tieBreakLabel: string \| null` (default `null`), `active: boolean` (default `true`) | `gameType.ts` / `gameType.schema.ts` — also exports `computeWinners(gameType, playerScores, condition?)` |
| `Match` | `id`, `date: number` (epoch ms), `gameTypeId`, `playerScores: PlayerScore[]`, `manualWinners: string[]` (default `[]`), `secondaryPlayerScores: PlayerScore[]` (default `[]`) | `match.ts` / `match.schema.ts` — also exports `isTieBreakIndeterminate(match, gameType)` |
| `MatchDraft` | `gameTypeId`, `playerIds: string[]`, `rounds: Record<string, string>[]`, `updatedAt: number` | `matchDraft.ts` / `matchDraft.schema.ts` |
| `PlayerScore` | `playerId: string`, `score: number` | `playerScore.ts` / `playerScore.schema.ts` |
| `WinCondition` | union `'HIGHEST_SCORE' \| 'LOWEST_SCORE' \| 'MANUAL'` + `winConditionLabel()` | `enums.ts` |
| `TieBreakRule` | union `'NONE' \| 'MANUAL_SELECTION' \| 'SECONDARY_SCORE'` + `tieBreakRuleLabel()` | `enums.ts` |
| `ValidationError` / `NotFoundError` | real `Error` subclasses (`kind: 'Validation' \| 'NotFound'`), union type `DomainError` | `errors.ts` |

## Ports (Repository Interfaces)

`src/domain/port/*.ts` — plain TypeScript interfaces.

| Interface | Methods |
|---|---|
| `PlayerRepository` | `getAll(includeInactive?)`, `save(player)`, `saveAll(players)`, `delete(id, anonymize?)`, `hardDelete(id)`, `deleteAll()` |
| `GameTypeRepository` | `getAll(includeInactive?)`, `save(gameType)`, `saveAll(gameTypes)`, `findById(id)`, `deleteAll()` |
| `MatchRepository` | `getAll()`, `save(match)`, `saveAll(matches)`, `findById(id)`, `delete(id)`, `deleteAll()` |
| `MatchDraftRepository` | `save(draft)`, `load(): MatchDraft \| undefined`, `clear()` |
| `CloudSyncRepository` | `push(data): Promise<void>`, `pull(): Promise<SyncData>`, `getStatus(): Promise<SyncStatus>`, `login(): Promise<void>`, `logout(): Promise<void>` — plus `SyncData`, `SyncStatus` (`connected`, `lastSync`, `isOnline` — no `email`), and the discriminated union `SyncException` (`NotAuthenticated`, `NetworkError`, `ApiError{code,message}`, `Conflict`, `RateLimited`), all in `cloudSyncRepository.ts` |

## Adapters (Implementations)

| Class | Implements | Storage | File |
|---|---|---|---|
| `LocalStoragePlayerRepository` | `PlayerRepository` | localStorage (`scoreo_players`) | `src/infrastructure/localStorage/localStoragePlayerRepository.ts` |
| `LocalStorageGameTypeRepository` | `GameTypeRepository` | localStorage (`scoreo_gametypes`) | `src/infrastructure/localStorage/localStorageGameTypeRepository.ts` |
| `LocalStorageMatchRepository` | `MatchRepository` | localStorage (`scoreo_matches`) — runs `migrateMatches()` once per instance before the first `getAll()` | `src/infrastructure/localStorage/localStorageMatchRepository.ts` |
| `LocalStorageMatchDraftRepository` | `MatchDraftRepository` | localStorage (`scoreo_match_draft`, single object) | `src/infrastructure/localStorage/localStorageMatchDraftRepository.ts` |
| `migrateMatches` | — (utility) | `migrateMatches(rawJson, generateId): string \| null` — v1 ISO date strings → epoch ms, non-UUID ids → `crypto.randomUUID()`, idempotent (returns `null` if nothing changed) | `src/infrastructure/migration/migrateMatches.ts` |
| `GoogleDriveClient` | — (Drive REST v3 wrapper) | find/create/update/read/upsert `scoreo-data.json`, exponential-backoff retry on `RateLimited`/`NetworkError` | `src/infrastructure/google/googleDriveClient.ts` (`Result<T, SyncException>`) |
| `GoogleDriveSyncAdapter` | `CloudSyncRepository` | Google Drive App Data Folder (async/await) — "cloud wins" on pull, no local merge | `src/infrastructure/google/googleDriveSyncAdapter.ts` |
| `GoogleAuthService` | — (GIS Token Model wrapper) | `accessToken`/`expiresAt`/`idToken` in memory; `login`/`refreshToken`/`logout` | `src/infrastructure/google/googleAuthService.ts` |
| `syncConfig` | — (functions, not a class) | localStorage (`scoreo_sync_config`, non-sensitive fields only): `loadSyncConfig()`, `saveSyncConfig()`, `clearSyncConfig()` | `src/infrastructure/google/syncConfig.ts` |
| `OAUTH_CLIENT_ID` | — (constant) | `import.meta.env.VITE_GOOGLE_CLIENT_ID`, empty string if unset | `src/infrastructure/google/oauthConfig.ts` |
| `InMemory*Repository` (×5: Player, GameType, Match, MatchDraft, CloudSync) | matching port | in-memory, used by tests only | `src/infrastructure/testing/inMemory*Repository.ts` |
| `mockGoogleDriveClient` | — (manual test double, no mock library) | in-memory | `src/infrastructure/testing/mockGoogleDriveClient.ts` |

## Services (root DI)

`src/services/createServices.ts` builds the concrete repositories + use cases once; `src/services/ServicesContext.tsx` exposes them via `ServicesProvider`/`useServices()`. Sync is conditional: if `VITE_GOOGLE_CLIENT_ID` is empty, `cloudSyncRepository` and `syncUseCase` are `undefined` — this is what hides the Sync entry in the burger menu. `ScoreDetail`'s use cases are deliberately **not** in this bag — they're constructed ad hoc per-screen from route params (see App shell below).

## Navigation

`src/ui/navigation/screen.ts` — discriminated union `Screen`: `Home | History | Import | Stats | Games | Sync | { type: 'ScoreDetail', gameTypeId, playerIds, matchId? }` (`matchId` absent = create mode, present = edit mode). `src/ui/navigation/hash.ts` exports pure `parseHash(hash)`/`screenToHash(screen)` functions (both imported by `useHashRouter.ts` and by their own test file — a single implementation is under test, unlike a duplicated-in-the-test-file approach). `src/ui/navigation/useHashRouter.ts` is a hook syncing a `Screen` with `window.location.hash` via `pushState`/`popstate`.

| Screen | Parameters | Destination |
|---|---|---|
| `Home` | — | `HomeScreen` — onboarding banner, resume-draft banner, player list with multi-select, game selection modal with inline game-type creation |
| `History` | — | `HistoryScreen` — past matches list, delete with confirmation, filter by game type |
| `Import` | — | `ImportScreen` — JSON import, 3-step wizard: select file → preview → result |
| `Stats` | — | `StatsScreen` — ELO leaderboard, head-to-head. Contextual back clears the player selection when set, else navigates Home |
| `Games` | — | `GameTypeScreen` — game type management: create, edit, archive with confirmation |
| `Sync` | — | `SyncScreen` — Google Drive cloud backup, only reachable when `services.syncUseCase` is defined |
| `ScoreDetail` | `gameTypeId`, `playerIds`, `matchId?` | `ScoreDetailScreen` — round entry, create or edit mode via `ScoreDetailMode`. gameType/players/mode resolution and the screen's `initialState` are built ad hoc in `App.tsx`'s `ScoreDetailRoute` via `useMemo` keyed on the route params |

## Shared Components

`src/ui/shared/*.tsx` — one component per file.

| Component | Props | Usage |
|---|---|---|
| `ListContainer` | `className?`, `children` | Generic wrapper for `ListItemRow` lists: `display:flex; flex-direction:column; gap:8px`. |
| `ListItemRow` | `label`, `subtitle?`, `isSelectable?`, `isSelected?`, `onSelect?`, `onView?`, `onEdit?`, `onDelete?` | Uniform list display: players (Home), game types (Games), match history (History). |
| `LudoButton` | `text`, `variant?` (`'primary' \| 'secondary' \| 'ghost' \| 'danger'`, default `primary`), `size?` (`'sm' \| 'md' \| 'lg'`, default `md`), `iconOnly?`, `disabled?`, `ariaLabel?`, `className?` (layout-only escape hatch), `onClick` | The single interactive-action primitive. Some interactive elements deliberately aren't `LudoButton` (Stats tabs, burger menu items, theme swatches) since they don't fit its centered-content model. |
| `LudoTextInput` | `value`, `onChange`, `label?`, `placeholder?`, `size?`, `disabled?`, `invalid?`, `autofocus?`, `onEnter?` | Controlled text field. |
| `LudoNumberInput` | `value`, `onChange`, `min?`, `max?`, `step?`, `stepper?` (default `true`), `size?`, `disabled?` | Controlled number field, `-`/`+` stepper by default. |
| `LudoTable<T>` | `columns: LudoColumn<T>[]` (`header`, `align?`, `render: (row: T) => ReactNode`), `rows: T[]`, `rowKey: (row: T) => string`, `footer?`, `striped?` (default `true`), `dense?` | Scoreboard grid. `ScoreDetailScreen`'s own table (pinned totals row above the rounds, per-round delete column, free-text editable cells) doesn't fit this shape and stays hand-rolled with `.score-table*` classes instead. |
| `LudoModal` | `open`, `title?`, `onClose?`, `footer?`, `children` | Centered dialog with scrim; closes on scrim click or Escape. Used by every dialog in the app, including the theme picker. |

## Tests

60 test files, 656 tests, all colocated `*.test.ts(x)` next to the file they cover, running under Vitest + `jsdom` (no real browser needed for any of them, including the Google Drive/OAuth and theme tests that historically required one).

Notable coverage that goes beyond a 1:1 port of business logic:
- **Component tests** (`*Screen.test.tsx`) for every screen, on top of each reducer's own pure-function tests.
- **`src/domain/model/serialization.contract.test.ts`** (27 tests) — the backward-compat guarantee: old-format JSON (missing fields added later) always decodes with the documented defaults. See "Backward Compatibility" in `doc/technical/architecture.md`.
- **`src/infrastructure/crossMigration.test.ts`** — replays a realistic old-format `localStorage` export (pre-archive players/game types, v1 matches, legacy `scoreo_theme` key) through the real adapters and asserts no data loss. See `doc/technical/migrations.md`.
- **`src/infrastructure/google/googleAuthService.test.ts`** and **`googleDriveSyncAdapter.test.ts`** mock `window.google.accounts.oauth2` / the Drive client to exercise real success/error/retry/conflict paths without a browser or a live Google account.
- **`src/ui/theme/themeManager.test.ts`** covers `readInitialFlavor`/`readInitialAccent` (including the `scoreo_theme` legacy-key migration) directly with `jsdom`'s native `localStorage`/`matchMedia`.

## CSS

Files (`public/css/`): `tokens/*.css` (Catppuccin design tokens, see Styling in `doc/technical/architecture.md`), `theme.css`, `layout.css`, `home.css`, `scoring.css`, `history.css`, `stats.css`, `import.css`, `sync.css`, `theme-picker.css`, `components.css`, `styles.css` (entry point, `@import`s the rest).

Key classes: `.btn-icon`, `.btn-icon--danger`, `.modal-body`, `.modal-row`, `.modal-title`, `.detail-row`, `.detail-label`, `.detail-value`, `.splash`, `.splash-content`, `.spinner`, `.onboarding-guide`, `.fab-position`, `.list-container`, `.list-container--spaced`, `.list-item-row`, `.list-item-label`, `.list-item-label--selectable`, `.list-item-label--selected`, `.list-item-name`, `.list-item-subtitle`, `.list-item-actions`, `.list-item-select-picto`.

Sync classes (`sync.css`): `.sync-icon`, `.sync-status`, `.sync-conflict-container`, `.sync-card`, `.sync-card-title`, `.sync-card-stat`, `.sync-actions`.

Theme picker classes (`theme-picker.css`): `.theme-picker-label`, `.theme-picker-row`, `.theme-chip`, `.theme-chip--active`, `.accent-swatch`, `.accent-swatch--active`.

Theme: Catppuccin tokens (`tokens/colors-*.css` + `tokens/semantic.css`), 4 flavors + 14-hue accent. `data-theme`/`data-accent` attributes on `<html>` are managed by `src/ui/theme/themeManager.ts` (`readInitialFlavor`/`readInitialAccent`/`applyTheme`/`saveFlavor`/`saveAccent`) and `src/ui/theme/ThemeContext.tsx` (`useTheme()` hook), picked from the burger menu's "🎨 Theme" entry (`ThemePickerDialog.tsx`).

## App shell

`src/App.tsx` (`AppShell`) dispatches by `useHashRouter().current` and wraps content in `ServicesProvider`/`ThemeProvider`. The header, contextual back button, and burger menu are the app's chrome:

- **Header**: back button hidden on Home; for `ScoreDetail` goes to `History` if `matchId` is set else `Home`; for `Stats` clears the player selection instead of navigating while a player is selected, else goes `Home`; all other screens go `Home`. The title text is clickable and navigates `Home` unless already there.
- **Burger menu**: Home/Stats/History/Import/Games, + Sync only when `services.syncUseCase` is defined, + a non-navigating "🎨 Theme" item opening `ThemePickerDialog`.
- **Stats back-override wiring**: `StatsScreen` accepts an `onBackOverrideChange: (override: (() => void) | null) => void` prop and calls it (from a `useEffect` on `selectedPlayerId`) with a clear-selection callback when a player is selected, or `null` otherwise. `AppShell` stores the latest value in `statsBackOverride` state (reset on every screen change) and uses it in place of the default `Home` navigation when set.

## localStorage Keys

| Key | Content |
|---|---|
| `scoreo_players` | JSON `Player[]` |
| `scoreo_gametypes` | JSON `GameType[]` |
| `scoreo_matches` | JSON `Match[]` |
| `scoreo_match_draft` | JSON `MatchDraft` (gameTypeId, playerIds, rounds, updatedAt) |
| `scoreo_sync_config` | JSON `SyncConfig` (lastSyncTimestamp, lastSyncFileId) — no OAuth token and no email (kept in memory only / not tracked, see #51 and #108) |
| `scoreo_flavor` | `"latte"` \| `"frappe"` \| `"macchiato"` \| `"mocha"` (Catppuccin flavor, optional) |
| `scoreo_accent` | one of the 14 Catppuccin hues, e.g. `"mauve"` (optional) |
| `scoreo_theme` | **legacy**, pre-Catppuccin: `"dark"` or `"light"`. Only read once as a migration fallback when `scoreo_flavor` is absent (see `doc/technical/migrations.md`) — never written anymore. |
