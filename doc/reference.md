# Reference — for the LLM

Exhaustive tables. Read before exploring `src/`.

## Handlers (MVI)

| Handler | Intent | Intent subclasses | State | Handler file |
|---|---|---|---|---|
| `PlayerHandler` | `PlayerIntent` | `UpdateInput(name: String)`, `AddPlayer`, `DeletePlayer(id, anonymize)`, `ShowDeleteConfirm(id)`, `DismissDeleteConfirm`, `StartRename(playerId)`, `UpdateRenameInput(name)`, `ConfirmRename`, `CancelRename` | `PlayerState` | `src/commonMain/.../ui/player/PlayerHandler.kt` (**TS (TS-055)**: `src/ui/home/{playerTypes,playerReducer,HomeScreen}.ts(x)` — `playerReducer` mirrors every intent 1:1; `submitAddPlayer`/`submitDeletePlayer`/`submitConfirmRename` call the use cases and dispatch the resulting action, same idiom as the other screens. `startRename` looks up the player directly in `state.players` (already loaded), no repository call needed, unlike Kotlin's redundant re-lookup. The UI-only state Kotlin never captured in a Handler (multi-player selection, game-selection modal, inline add-game-type form) is deliberately **not** in the reducer — plain `useState` in `HomeScreen`, exactly as untested on the Kotlin side.) |
| `GameTypeHandler` | `GameTypeIntent` | `UpdateName(name: String)`, `SelectWinCondition(winCondition: WinCondition)`, `UpdateTieBreakRule(rule: TieBreakRule)`, `UpdateTieBreakCondition(condition: WinCondition)`, `UpdateTieBreakLabel(label: String)`, `SelectGame(id: String)`, `DeselectGame`, `AddGameType`, `EditGameType(id: String)`, `CancelEdit`, `UpdateGameType(gameType: GameType)`, `ShowArchiveConfirm(gameTypeId: String)`, `ArchiveGameType(gameTypeId: String)`, `DismissArchiveConfirm` | `GameTypeState` | `src/commonMain/.../ui/gametype/GameTypeHandler.kt` (**TS (TS-052)**: `src/ui/gametype/{gameTypeTypes,gameTypeReducer,GameTypeForm,GameTypeScreen}.ts(x)` — `gameTypeReducer` mirrors every intent 1:1 as an action; side-effecting ones (`AddGameType`/`UpdateGameType`/`ArchiveGameType`/`EditGameType`'s lookup) are performed by `submitAddGameType`/`submitUpdateGameType`/`submitArchiveGameType`/`resolveGameTypeForEdit` helpers called from `GameTypeScreen`, which then dispatch the resulting `*Succeeded`/`*Failed` action — same `resetForm`-on-success idiom as Kotlin's `resetForm(refresh: Boolean)`. `GameTypeForm.tsx` holds both the add-mode form and the shared `GameTypeFields` (win condition / tie-break selects) reused by the edit modal, matching Kotlin's private composable split. 3 modals (detail/edit/archive-confirm) driven by nullable-equivalent (`undefined`) ids in state, same idiom as Kotlin.) |
| `ImportHandler` | `ImportIntent` | `FileLoaded(content: String)`, `FileError(message: String)`, `Execute`, `Reset` | `ImportState(step: ImportStep, preview, jsonContent, result, error)` | `src/commonMain/.../ui/import/ImportHandler.kt` (**TS (TS-053)**: `src/ui/import/{importTypes,importReducer,ImportScreen}.ts(x)` — `importReducer` actions `previewReady`/`previewFailed`/`importSucceeded`/`importFailed`/`fileError`/`reset`; `submitFileLoaded()`/`submitExecute()` call `ImportMatchesUseCase.preview()`/`.execute()` (both `Result<T, Error>`) and map the outcome to an action, dispatched from `ImportScreen`. The `Execute`-only-from-`READY` guard lives in the component (`if (state.step !== 'READY') return`), same as Kotlin's early return.) |
| `ScoreDetailHandler` | `ScoreDetailIntent` | `UpdateScore(roundIndex, playerId, value)`, `AddRound`, `RemoveRound(index)`, `Terminate`, `ConfirmWinners`, `DismissModal`, `ToggleModalWinner(playerId)`, `UpdateSecondaryScoreInput(playerId, value)`, `SubmitSecondaryScores`, `ToggleManualSelectionWinner(playerId)`, `ConfirmManualWinners`, `KeepTie`, `DismissTieBreak`, `CancelMatch`, `ConfirmCancel`, `DismissCancelConfirm` | `ScoreDetailState` | `src/commonMain/.../ui/scoredetail/ScoreDetailHandler.kt` (**TS (TS-056)**: `src/ui/scoredetail/{scoreDetailTypes,scoreDetailReducer,ScoreDetailScreen,ManualSelectionDialog,SecondaryScoreDialog}.ts(x)` — `scoreDetailReducer` handles every pure transition; the intents that call `CreateMatchUseCase`/`UpdateMatchUseCase` (`Terminate`, `ConfirmWinners`, `SubmitSecondaryScores`, `ConfirmManualWinners`, `KeepTie`) go through `submitTerminate`/`submitConfirmWinners`/`submitSecondaryScores`/`submitConfirmManualWinners`/`submitKeepTie`, which share a `performSave()` helper (mirrors Kotlin's private `saveMatch`, including the edit-vs-create branch and try/catch). `buildInitialState()` mirrors the handler's `init` block (load a match for editing, or restore a matching draft); `resetState()` mirrors `reset()`. Draft autosave (`saveDraft()`, called after `UpdateScore`/`AddRound`/`RemoveRound`) is wired via a `useEffect` keyed on `state.rounds` (skipped on mount via a ref, since Kotlin never saves a draft before the first user edit) rather than being invoked from inside the reducer, since repository writes aren't pure.) |
| `StatsHandler` | `StatsIntent` | `SelectPlayer(playerId: String)`, `BackToLeaderboard`, `SelectGameType(gameTypeId: String?)` | `StatsState(leaderboard, selectedPlayerId, gameTypes, selectedGameTypeId)` | `src/commonMain/.../ui/stats/StatsHandler.kt` (**TS (TS-050)**: `src/ui/stats/{statsTypes,statsReducer,StatsScreen}.ts(x)` — `statsReducer(state, action)` pure function with actions `selectPlayer`/`backToLeaderboard`/`selectGameType`/`loaded`; the use-case calls that Kotlin's `refresh()` performs as a side effect inside the handler are done in `StatsScreen`'s `useEffect` (keyed on `selectedGameTypeId`, covering both mount and game-type-change triggers) via the exported `loadStats()` helper, dispatching `loaded`) |
| `HistoryHandler` | `HistoryIntent` | `Refresh`, `ShowDeleteConfirm(matchId: String)`, `DeleteMatch(matchId: String)`, `DismissDeleteConfirm`, `SelectGameTypeFilter(gameTypeId: String?)` | `HistoryState` | `src/commonMain/.../ui/history/HistoryHandler.kt` (**TS (TS-051)**: `src/ui/history/{historyTypes,historyReducer,HistoryScreen}.ts(x)` — `historyReducer` actions `loaded`/`showDeleteConfirm`/`deleteFailed`/`dismissDeleteConfirm`/`selectGameTypeFilter`; `loadDisplays()` rebuilds `MatchDisplay[]` from the repositories (called on mount, mirroring `Refresh`), `deleteMatch()` wraps the use-case call in try/catch like the handler. `HistoryScreen` takes an optional `onEditMatch` callback instead of an `AppNavigator` instance — `App.tsx` wires it to `navigate(scoreDetailScreen(...))`.) |
| `SyncHandler` | `SyncIntent` | `Login`, `Logout`, `RestoreSession`, `ResolveConflict(keepLocal: Boolean)`, `DismissError` | `SyncState(phase, email, conflict, result, error)` | `src/commonMain/.../ui/sync/SyncHandler.kt` (**TS (TS-054)**: `src/ui/sync/{syncTypes,syncReducer,SyncScreen}.ts(x)` — pure `syncReducer` for state transitions; `submitLogin`/`submitLogout`/`submitRestoreSession`/`submitResolveConflict` are `async` functions (replacing Kotlin's `scope.launch`) that call `SyncUseCase` and dispatch the resulting action. `errorMessage()` mirrors Kotlin's `e.message` for `SyncException`: only `NotAuthenticated`/`ApiError` carry a message (`NetworkError`/`Conflict`/`RateLimited` don't), so each call site applies its own fallback string exactly like Kotlin's `e.message ?: "Login failed"`.) |

All in `src/commonMain/kotlin/com/scoreo/`.

## Use Cases

> TS: `src/application/*.ts`, classe avec méthode `invoke()` (au lieu de `operator fun invoke`) ; ports fournis au constructeur. Erreurs de validation/lookup lancées via `ValidationError`/`NotFoundError` (`src/domain/model/errors.ts`, classes `Error` réelles — pas seulement l'union `DomainError` initiale de TS-002, affinée en TS-010).

| Use Case | Method | Return | File (Kotlin) | TS |
|---|---|---|---|---|
| `AddPlayerUseCase` | `invoke(name: String)` | `Player` | `src/commonMain/.../application/AddPlayerUseCase.kt` | `addPlayerUseCase.ts` |
| `AddGameTypeUseCase` | `invoke(name: String, winCondition: WinCondition, tieBreakRule: TieBreakRule = NONE, tieBreakCondition: WinCondition = HIGHEST_SCORE, tieBreakLabel: String? = null)` | `GameType` | `src/commonMain/.../application/AddGameTypeUseCase.kt` | `addGameTypeUseCase.ts` (options 3-5 regroupées dans un objet `AddGameTypeOptions`) |
| `ArchiveGameTypeUseCase` | `invoke(gameTypeId: String)` | `Unit` | `src/commonMain/.../application/ArchiveGameTypeUseCase.kt` | `archiveGameTypeUseCase.ts` |
| `CreateMatchUseCase` | `invoke(gameTypeId: String, playerScores: List<PlayerScore>, date: Long, manualWinners: List<String>, secondaryPlayerScores: List<PlayerScore>)` | `Match` | `src/commonMain/.../application/CreateMatchUseCase.kt` | `createMatchUseCase.ts` (retourne `Result<Match, DomainError>`) |
| `UpdateMatchUseCase` | `invoke(match: Match)` | `Unit` | `src/commonMain/.../application/UpdateMatchUseCase.kt` | `updateMatchUseCase.ts` |
| `DeleteMatchUseCase` | `invoke(matchId: String)` | `Unit` | `src/commonMain/.../application/DeleteMatchUseCase.kt` | `deleteMatchUseCase.ts` |
| `DeletePlayerUseCase` | `invoke(id: String, anonymize: Boolean = false)` | `Unit` | `src/commonMain/.../application/DeletePlayerUseCase.kt` | `deletePlayerUseCase.ts` |
| `RenamePlayerUseCase` | `invoke(playerId: String, newName: String)` | `Unit` | `src/commonMain/.../application/RenamePlayerUseCase.kt` | `renamePlayerUseCase.ts` |
| `GetPlayersUseCase` | `invoke(includeInactive: Boolean = false)` | `List<Player>` | `src/commonMain/.../application/GetPlayersUseCase.kt` | `getPlayersUseCase.ts` |
| `GetPlayerStatsUseCase` | `invoke()` | `Map<String, PlayerStats>` | `src/commonMain/.../application/GetPlayerStatsUseCase.kt` | `getPlayerStatsUseCase.ts` (retourne `Map<string, PlayerStats>`) |
| `GetHeadToHeadUseCase` | `invoke(gameTypeId: String? = null)` | `List<PlayerDetail>` | `src/commonMain/.../application/GetHeadToHeadUseCase.kt` | `getHeadToHeadUseCase.ts` |
| `EloCalculator` | `compute(matches, gameTypes)` | `Map<String, Int>` | `src/commonMain/.../application/EloCalculator.kt` | `eloCalculator.ts` |
| `FindGameTypeByIdUseCase` | `invoke(id: String)` | `GameType?` | `src/commonMain/.../application/FindGameTypeByIdUseCase.kt` | `findGameTypeByIdUseCase.ts` |
| `GetGameTypesUseCase` | `invoke(includeInactive: Boolean = false)` | `List<GameType>` | `src/commonMain/.../application/GetGameTypesUseCase.kt` | `getGameTypesUseCase.ts` |
| `GetMatchesUseCase` | `invoke()` | `List<Match>` | `src/commonMain/.../application/GetMatchesUseCase.kt` | `getMatchesUseCase.ts` |
| `ImportMatchesUseCase` | `preview(jsonString: String)`, `execute(jsonString: String)` | `Result<ImportPreview>`, `Result<ImportResult>` | `src/commonMain/.../application/ImportMatchesUseCase.kt` | `importMatchesUseCase.ts` (`Result<T, Error>`) |
| `SyncUseCase` | `suspend autoSync()` | `SyncOutcome` | `src/commonMain/.../application/SyncUseCase.kt` | `syncUseCase.ts` (async/await) |
| `UpdateGameTypeUseCase` | `invoke(gameType: GameType)` | `Unit` | `src/commonMain/.../application/UpdateGameTypeUseCase.kt` | `updateGameTypeUseCase.ts` |
| `SyncUseCase` | `suspend resolveConflict(keepLocal: Boolean)` | `SyncResult` | `src/commonMain/.../application/SyncUseCase.kt` |
| `SyncUseCase` | `suspend login()` / `suspend logout()` / `suspend status()` | `Unit` / `SyncStatus` | `src/commonMain/.../application/SyncUseCase.kt` |

All in `src/commonMain/kotlin/com/scoreo/`.

## Domain Models

> Migration React/TS en cours (voir issues `migration-react`) : la colonne "TS" liste l'équivalent porté quand il existe. Tant que la parité n'est pas atteinte pour un modèle, la colonne "File" (Kotlin) reste la référence de comportement.

| Model | Fields | File (Kotlin) | TS |
|---|---|---|---|
| `Player` | `id: String`, `name: String`, `active: Boolean = true` | `src/commonMain/.../domain/model/Player.kt` | `src/domain/model/player.ts` |
| `GameType` | `id: String`, `name: String`, `winCondition: WinCondition`, `tieBreakRule: TieBreakRule = TieBreakRule.NONE`, `tieBreakCondition: WinCondition = WinCondition.HIGHEST_SCORE`, `tieBreakLabel: String? = null`, `active: Boolean = true` | `src/commonMain/.../domain/model/GameType.kt` | `src/domain/model/gameType.ts` (type only ; `computeWinners` arrive avec TS-004) |
| `Match` | `id: String`, `date: Long`, `gameTypeId: String`, `playerScores: List<PlayerScore>`, `manualWinners: List<String> = emptyList()`, `secondaryPlayerScores: List<PlayerScore> = emptyList()` | `src/commonMain/.../domain/model/Match.kt` | `src/domain/model/match.ts` (type only ; `getWinners`/`isTieBreakIndeterminate` arrivent avec TS-004) |
| `MatchDraft` | `gameTypeId: String`, `playerIds: List<String>`, `rounds: List<Map<String, String>>`, `timestamp: Long` | `src/commonMain/.../domain/model/MatchDraft.kt` | `src/domain/model/matchDraft.ts` |
| `PlayerScore` | `playerId: String`, `score: Int` | `src/commonMain/.../domain/model/PlayerScore.kt` | `src/domain/model/playerScore.ts` |
| `WinCondition` / `TieBreakRule` | enums + `label()` | `domain/model/{WinCondition,TieBreakRule}.kt` | `src/domain/model/enums.ts` |
| `DomainError` | sealed `Validation`/`NotFound` | `domain/DomainError.kt` | `src/domain/model/errors.ts` (union discriminée) |
| `WinCondition` | enum: `HIGHEST_SCORE`, `LOWEST_SCORE`, `MANUAL` | `src/commonMain/.../domain/model/WinCondition.kt` |
| `TieBreakRule` | enum: `NONE`, `MANUAL_SELECTION`, `SECONDARY_SCORE` | `src/commonMain/.../domain/model/TieBreakRule.kt` |

All in `src/commonMain/kotlin/com/scoreo/`.

## Ports (Repository Interfaces)

| Interface | Methods | File (Kotlin) | TS |
|---|---|---|---|
| `PlayerRepository` | `getAll(includeInactive)`, `save(player)`, `saveAll(players)`, `delete(id, anonymize)` | `src/commonMain/.../domain/port/PlayerRepository.kt` | `src/domain/port/playerRepository.ts` |
| `GameTypeRepository` | `getAll(includeInactive: Boolean = false)`, `save(gameType)`, `saveAll(gameTypes)`, `findById(id)` | `src/commonMain/.../domain/port/GameTypeRepository.kt` | `src/domain/port/gameTypeRepository.ts` |
| `MatchRepository` | `getAll()`, `save(match)`, `saveAll(matches)`, `findById(id)`, `delete(id)` | `src/commonMain/.../domain/port/MatchRepository.kt` | `src/domain/port/matchRepository.ts` |
| `MatchDraftRepository` | `save(draft: MatchDraft)`, `load(): MatchDraft?`, `clear()` | `src/commonMain/.../domain/port/MatchDraftRepository.kt` | `src/domain/port/matchDraftRepository.ts` |
| `CloudSyncRepository` | `suspend push(data)`, `suspend pull()`, `suspend getStatus()`, `suspend login()`, `suspend logout()` | `src/commonMain/.../domain/port/CloudSyncRepository.kt` | `src/domain/port/cloudSyncRepository.ts` (Promise-based) |

All in `src/commonMain/kotlin/com/scoreo/`.

## Adapters (Implementations)

| Class | Implements | Storage | File (Kotlin) | TS |
|---|---|---|---|---|
| `LocalStoragePlayerRepository` | `PlayerRepository` | localStorage (`scoreo_players`) | `src/jsMain/.../infrastructure/LocalStoragePlayerRepository.kt` | `src/infrastructure/localStorage/localStoragePlayerRepository.ts` |
| `LocalStorageGameTypeRepository` | `GameTypeRepository` | localStorage (`scoreo_gametypes`) | `src/jsMain/.../infrastructure/LocalStorageGameTypeRepository.kt` | `src/infrastructure/localStorage/localStorageGameTypeRepository.ts` |
| `LocalStorageMatchRepository` | `MatchRepository` | localStorage (`scoreo_matches`) | `src/jsMain/.../infrastructure/LocalStorageMatchRepository.kt` | `src/infrastructure/localStorage/localStorageMatchRepository.ts` (migration v1->v2 branchee) |
| `LocalStorageMatchDraftRepository` | `MatchDraftRepository` | localStorage (`scoreo_match_draft`) | `src/jsMain/.../infrastructure/LocalStorageMatchDraftRepository.kt` | `src/infrastructure/localStorage/localStorageMatchDraftRepository.ts` |
| `GoogleDriveClient` | — (Drive REST v3 wrapper) | find/create/update/read/upsert `scoreo-data.json`, retry backoff | `src/jsMain/.../infrastructure/google/GoogleDriveClient.kt` | `src/infrastructure/google/googleDriveClient.ts` (`Result<T, SyncException>`) |
| `GoogleDriveSyncAdapter` | `CloudSyncRepository` | Google Drive App Data Folder (async fetch + coroutines) | `src/jsMain/.../infrastructure/google/GoogleDriveSyncAdapter.kt` | `src/infrastructure/google/googleDriveSyncAdapter.ts` (async/await ; `driveClient` param typeé `DriveClient` — interface structurelle plutôt que la classe concrète, pour permettre un fake de test sans heritage) |
| `GoogleAuthService` | — (GIS Token Model wrapper) | `accessToken`/`expiresAt`/`idToken` en memoire | `src/jsMain/.../infrastructure/google/GoogleIdentityService.kt` | `src/infrastructure/google/googleAuthService.ts` |
| `SyncConfig` | — (config persistee) | localStorage (`scoreo_sync_config`) | `src/jsMain/.../infrastructure/google/SyncConfig.kt` | `src/infrastructure/google/syncConfig.ts` |
| `OAuthConfig` | — (config object) | `CLIENT_ID: String` — generated at build from `GOOGLE_CLIENT_ID` env var | `build/generated/oauthconfig/.../OAuthConfig.kt` (generated) | `src/infrastructure/google/oauthConfig.ts` (`import.meta.env.VITE_GOOGLE_CLIENT_ID`) |
| `InMemoryCloudSyncRepository` | `CloudSyncRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryCloudSyncRepository.kt` | `src/infrastructure/testing/inMemoryCloudSyncRepository.ts` |
| `InMemoryPlayerRepository` | `PlayerRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryPlayerRepository.kt` | `src/infrastructure/testing/inMemoryPlayerRepository.ts` |
| `InMemoryGameTypeRepository` | `GameTypeRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryGameTypeRepository.kt` | `src/infrastructure/testing/inMemoryGameTypeRepository.ts` |
| `InMemoryMatchRepository` | `MatchRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryMatchRepository.kt` | `src/infrastructure/testing/inMemoryMatchRepository.ts` |
| `MatchMigration` | — (utility) | `migrateMatchesJson()` | `src/commonMain/.../application/MatchMigration.kt` | `src/infrastructure/migration/migrateMatches.ts` |

All in `src/jsMain/kotlin/com/scoreo/`. Production: `LocalStorage*`, `GoogleDriveSyncAdapter`. Tests: `InMemory*`.

`JsonConfig.kt` (`src/jsMain/.../infrastructure/`) provides `scoreoJson: Json` with `ignoreUnknownKeys = true`.

## Navigation

| Screen | Parameters | Destination |
|---|---|---|
| `Screen.Home` | — | HomeScreen (onboarding banner, resume-draft banner, player list with multi-select, game selection modal with inline game-type creation, FAB) |
| `Screen.History` | — | HistoryScreen (past matches list, delete with confirmation, filter by game type) |
| `Screen.Import` | — | ImportScreen (JSON import, 3-step wizard: select file → preview → result) |
| `Screen.Stats` | — | StatsScreen (ELO leaderboard, head-to-head). Contextual back (App.tsx) clears the player selection when set, else navigates Home — see `StatsScreen`'s `onBackOverrideChange` prop. |
| `Screen.Games` | — | GameTypeScreen (game type management: create, edit, archive with confirmation) |
| `Screen.Sync` | — | SyncScreen (Google Drive cloud backup, only reachable when `services.syncUseCase` is defined, i.e. `VITE_GOOGLE_CLIENT_ID` configured) |
| `Screen.ScoreDetail` | `gameTypeId: String`, `playerIds: List<String>`, `matchId: String? = null` | ScoreDetailScreen (round entry, create or edit mode via sealed ScoreDetailMode). **TS (TS-056)**: gameType/players/mode resolution and the screen's `initialState` are all built ad hoc in `App.tsx`'s `ScoreDetailRoute` via `useMemo` keyed on the route params — deliberately not part of `ServicesContext`, matching `App.kt`'s `remember(screen) { ... }`. |

**TS (TS-042)**: `src/ui/navigation/screen.ts` (discriminated union `Screen`), `src/ui/navigation/hash.ts` (`parseHash`/`screenToHash`, pure), `src/ui/navigation/useHashRouter.ts` (hook syncing `Screen` with `window.location.hash` via `pushState`/`popstate`, replaces `AppNavigator.kt`'s class). Deliberate fix vs. Kotlin: `AppNavigatorTest.kt` tested a **private duplicate** of `parseHash`/`screenToHash` defined inside the test file itself (see its own "Maintenance Notes": *"Keep helper functions in sync with AppNavigator methods"*) rather than the real `AppNavigator.kt` methods — production routing and its tests could silently drift. In TS, `parseHash`/`screenToHash` are exported once from `hash.ts` and imported by both `useHashRouter.ts` and `hash.test.ts`, so there is a single implementation under test.

## Shared Components

| Component | Parameters | Usage |
|---|---|---|
| `ListContainer` | `className: String? = null`, `content: @Composable () -> Unit` | Generic wrapper for `ListItemRow` lists: `display:flex; flex-direction:column; gap:8px`. Pass `className="list-container--spaced"` to add `margin-top:16px` (e.g. GameTypeScreen). |
| `ListItemRow` | `label: String`, `subtitle: String? = null`, `isSelectable: Boolean = false`, `isSelected: Boolean = false`, `onSelect: (() -> Unit)? = null`, `onView: (() -> Unit)? = null`, `onEdit: (() -> Unit)? = null`, `onDelete: (() -> Unit)? = null` | Uniform list display: players (HomeScreen), game types (GameTypeScreen), match history (HistoryScreen). Supports selection, view, edit, delete. |
| `LudoButton` | `text: String`, `variant: ButtonVariant = Primary` (`Primary`/`Secondary`/`Ghost`/`Danger`), `size: ButtonSize = Md` (`Sm`/`Md`/`Lg`), `iconOnly: Boolean = false`, `disabled: Boolean = false`, `ariaLabel: String? = null`, `className: String? = null`, `onClick: () -> Unit` | Ludo design system's button primitive (`.ludo-btn*` classes in `components.css`). `className` is a layout-only escape hatch (e.g. `.burger-close`'s `align-self`, `.fab-position`'s fixed placement, `.ludo-btn--full`'s width) — never for restyling variants/colors. Used by every screen in the app. Some interactive elements are deliberately *not* `LudoButton` — underline tabs (`StatsScreen`'s `.tab-btn`), left-aligned banner/menu buttons (`BurgerItem`, `.draft-resume-button`), and swatch/chip pickers (`ThemePickerDialog`) don't fit its centered-content, 4-variant model, so they stay custom CSS retokenized onto the same semantic tokens. |
| `LudoTextInput` | `value: String`, `onChange: (String) -> Unit`, `label: String? = null`, `placeholder: String? = null`, `size: ButtonSize = Md`, `disabled: Boolean = false`, `invalid: Boolean = false`, `autofocus: Boolean = false`, `onEnter: (() -> Unit)? = null` | Ludo text field (`.ludo-input--bare`). Controlled — always reflects `value`. `invalid`/`autofocus`/`onEnter` are intentional additions beyond the design system's original brief (form ergonomics every real call site needs — error border, focus-on-open, submit-on-Enter — not new visual variants). |
| `LudoNumberInput` | `value: Int`, `onChange: (Int) -> Unit`, `min: Int? = null`, `max: Int? = null`, `step: Int = 1`, `stepper: Boolean = true`, `size: ButtonSize = Md`, `disabled: Boolean = false` | Ludo number field — `-`/`+` stepper by default (`stepper = false` for a bare numeric field). Controlled: unlike the design system's vanilla-JS version, no manual DOM sync needed — Compose recomposes the stepper buttons' disabled-at-bounds state for free. |
| `LudoTable<T>` | `columns: List<LudoColumn<T>>` (`header: String`, `align: String? = null`, `render: @Composable (T) -> Unit`), `rows: List<T>`, `footer: (@Composable () -> Unit)? = null`, `striped: Boolean = true`, `dense: Boolean = false` | Ludo scoreboard grid (`.ludo-table*`) — real `<thead>`/`<tbody>`/`<tfoot>` (unlike `ScoreDetailScreen`'s hand-rolled table, which puts `Tr`s directly under `Table` — needed here so the `tbody`/`tfoot`-scoped CSS selectors actually match). `footer` renders inside its own `Tr`; the caller supplies the `Td` cells. **Confirmed insufficient for `ScoreDetailScreen`** (evaluated in P2-03): its totals row is pinned right under the header — above the round rows, not below as a footer — plus a per-round delete-action column and free-text (`String`, not `Int`) editable cells. `ScoreDetailScreen` keeps its own hand-rolled `Table`/`Tr`/`Td`, restyled directly with `.score-table*` classes (in `scoring.css`) that reuse Ludo's tokens/visual language without going through this composable. |
| `LudoModal` | `open: Boolean`, `title: String? = null`, `onClose: (() -> Unit)? = null`, `footer: (@Composable () -> Unit)? = null`, `content: @Composable () -> Unit` | Ludo centered dialog (`.ludo-modal*`) — scrim click / Escape both close via `onClose`. Simpler than the design system's vanilla-JS version: `if (open) { ... }` is enough, no persistent open()/close() controller needed since Compose HTML diffs the DOM itself. Used by every dialog in the app, including the theme picker (which predates this composable — added in P0-03, migrated onto it in P3-01). `.modal-overlay`/`.modal-content` no longer exist anywhere. |

Files: `src/jsMain/kotlin/com/scoreo/ui/shared/ListContainer.kt`, `src/jsMain/kotlin/com/scoreo/ui/shared/ListItemRow.kt`, `src/jsMain/kotlin/com/scoreo/ui/shared/Button.kt`, `src/jsMain/kotlin/com/scoreo/ui/shared/Input.kt`, `src/jsMain/kotlin/com/scoreo/ui/shared/Table.kt`, `src/jsMain/kotlin/com/scoreo/ui/shared/Modal.kt`

**TS (TS-041)**: `src/ui/shared/{ListContainer,ListItemRow,LudoButton,LudoTextInput,LudoNumberInput,LudoTable,LudoModal}.tsx` — one component per file (idiomatic React, vs. Kotlin's per-family grouping in `Button.kt`/`Input.kt`). `LudoTable<T>` gains a required `rowKey: (row: T) => string` prop absent from the Kotlin version: React needs a stable key for list reconciliation, which Compose's diffing doesn't require. `Strings.TITLE_VIEW_DETAIL`/`TITLE_EDIT`/`TITLE_DELETE` are inlined directly in `ListItemRow.tsx` for now — the broader `Strings.kt` i18n module isn't ported yet (not in scope of any TS-0XX ticket currently; will be picked up screen-by-screen in Phase F, or as a dedicated ticket if it grows unwieldy).

## Tests

Nominative parity audit (TS-080), Kotlin file → TS file(s), one row per Kotlin test file. All 33 Kotlin test files (429 tests) are accounted for; the "Écart" column is empty when counts match exactly, and every non-empty écart is explained in Notes — none is an unjustified gap.

| Fichier Kotlin | Fichier(s) TS | Tests Kotlin | Tests TS | Écart | Notes |
|---|---|---|---|---|---|
| `AddGameTypeUseCaseTest.kt` | `application/addGameTypeUseCase.test.ts` | 13 | 13 | — | |
| `AddPlayerUseCaseTest.kt` | `application/addPlayerUseCase.test.ts` | 6 | 6 | — | |
| `ArchiveGameTypeUseCaseTest.kt` | `application/archiveGameTypeUseCase.test.ts` | 3 | 3 | — | |
| `CreateMatchUseCaseTest.kt` | `application/createMatchUseCase.test.ts` | 8 | 8 | — | |
| `DeleteMatchUseCaseTest.kt` | `application/deleteMatchUseCase.test.ts` | 3 | 3 | — | |
| `DeletePlayerUseCaseTest.kt` | `application/deletePlayerUseCase.test.ts` | 6 | 6 | — | |
| `EloCalculatorTest.kt` | `application/eloCalculator.test.ts` | 22 | 22 | — | |
| `GetGameTypesUseCaseTest.kt` | `application/getGameTypesUseCase.test.ts` | 5 | 5 | — | |
| `GetHeadToHeadUseCaseEloTest.kt` | `application/getHeadToHeadUseCaseElo.test.ts` | 10 | 10 | — | |
| `GetHeadToHeadUseCaseTest.kt` | `application/getHeadToHeadUseCase.test.ts` | 11 | 11 | — | |
| `GetPlayerStatsUseCaseTest.kt` | `application/getPlayerStatsUseCase.test.ts` | 8 | 8 | — | |
| `GetPlayersUseCaseTest.kt` | `application/getPlayersUseCase.test.ts` | 4 | 4 | — | |
| `IdGeneratorTest.kt` | `application/idGenerator.test.ts` | 6 | 6 | — | |
| `ImportMatchesUseCaseTest.kt` | `application/importMatchesUseCase.test.ts` | 17 | 21 | +4 | TS adds edge cases beyond the ported fixtures (same v1.0/v1.1 `TestImportData` strings reused) |
| `MatchMigrationTest.kt` | `infrastructure/migration/migrateMatches.test.ts` | 18 | 18 | — | |
| `RenamePlayerUseCaseTest.kt` | `application/renamePlayerUseCase.test.ts` | 9 | 9 | — | |
| `SyncUseCaseTest.kt` | `application/syncUseCase.test.ts` | 7 | 8 | +1 | TS adds one extra branch case |
| `UpdateGameTypeUseCaseTest.kt` | `application/updateGameTypeUseCase.test.ts` | 3 | 3 | — | |
| `UpdateMatchUseCaseTest.kt` | `application/updateMatchUseCase.test.ts` | 3 | 3 | — | |
| `SyncDependenciesTest.kt` | `services/createServices.test.ts` + `services/ServicesContext.test.tsx` | 2 | 4 + 2 = 6 | +4 | TS splits the DI-construction test (`createServices.test.ts`) from the React context/hook test (`ServicesContext.test.tsx`), each with its own edge cases |
| `domain/GameTypeTest.kt` | `domain/model/gameType.test.ts` | 9 | 9 | — | |
| `domain/MatchTieBreakTest.kt` | `domain/model/match.test.ts` | 12 | 12 | — | |
| `domain/SerializationTest.kt` | `domain/model/serialization.contract.test.ts` | 27 | 27 | — | |
| `infrastructure/InMemoryRepositoryTest.kt` | `infrastructure/testing/inMemoryRepository.test.ts` | 11 | 11 | — | |
| `ui/gametype/GameTypeHandlerTest.kt` | `ui/gametype/gameTypeReducer.test.ts` + `GameTypeScreen.test.tsx` | 22 | 22 + 9 = 31 | +9 | Reducer tests ported 1:1 (22=22); `GameTypeScreen.test.tsx` adds component-level coverage Kotlin never had (Compose HTML screens weren't unit-tested, only the handler) |
| `ui/history/HistoryHandlerTest.kt` | `ui/history/historyReducer.test.ts` + `HistoryScreen.test.tsx` | 24 | 24 + 6 = 30 | +6 | Reducer 1:1 (24=24); `HistoryScreen.test.tsx` is new component coverage |
| `ui/import/ImportHandlerTest.kt` | `ui/import/importReducer.test.ts` + `ImportScreen.test.tsx` | 18 | 18 + 4 = 22 | +4 | Reducer 1:1 (18=18, Kotlin count itself corrected from a stale "8" while porting); `ImportScreen.test.tsx` is new component coverage |
| `ui/navigation/AppNavigatorTest.kt` | `ui/navigation/hash.test.ts` + `useHashRouter.test.ts` | 43 | 43 + 3 = 46 | +3 | Kotlin file actually has **43** `@Test` methods, not the 41 previously documented here (doc corrected); `parseHash`/`screenToHash` ported 1:1 (43=43), `useHashRouter.test.ts` adds hook-specific coverage (`pushState`/`popstate` wiring) that has no Kotlin equivalent since `AppNavigator` was a plain class, not a hook |
| `ui/player/PlayerHandlerTest.kt` | `ui/home/playerReducer.test.ts` + `HomeScreen.test.tsx` | 21 | 21 + 11 = 32 | +11 | Reducer 1:1 (21=21); `HomeScreen.test.tsx` covers UI-only flows (multi-select, game modal, inline game creation, draft resume) that never had a Kotlin Handler or test |
| `ui/scoredetail/ScoreDetailHandlerTest.kt` | `ui/scoredetail/scoreDetailReducer.test.ts` + `ScoreDetailScreen.test.tsx` | 57 | 57 + 9 = 66 | +9 | Reducer 1:1 (57=57); `ScoreDetailScreen.test.tsx` is new component coverage |
| `ui/stats/StatsHandlerTest.kt` | `ui/stats/statsReducer.test.ts` + `StatsScreen.test.tsx` | 6 | 6 + 5 = 11 | +5 | Reducer 1:1 (6=6); `StatsScreen.test.tsx` is new component coverage |
| `ui/sync/SyncHandlerTest.kt` | `ui/sync/syncReducer.test.ts` + `SyncScreen.test.tsx` | 10 | 10 + 5 = 15 | +5 | Reducer 1:1 (10=10); `SyncScreen.test.tsx` is new component coverage |
| `infrastructure/google/GoogleAuthServiceTest.kt` (jsTest) | `infrastructure/google/googleAuthService.test.ts` | 29 | 10 | **−19** | Justified, documented inline in the TS file: the Kotlin suite mostly asserts `true` after calling `login`/`refreshToken` because GIS is never actually loaded in that test environment (only the "not loaded" retry path is real), plus 3 near-duplicate tautological getter/setter tests per token field. The TS suite mocks `window.google.accounts.oauth2` to exercise the real success/error/retry/silent-refresh/logout paths with meaningful assertions — fewer tests, strictly more behavior verified |
| `infrastructure/google/GoogleDriveSyncAdapterTest.kt` (jsTest) | `infrastructure/google/googleDriveSyncAdapter.test.ts` | 23 | 21 | −2 | Justified: Kotlin has 2 exact-duplicate tests (`push throws NotAuthenticated when no token` / `...when no token provided`, and `sync config update preserves existing fields` / the push section's timestamp-preservation test) that assert the identical behavior twice under different names; TS keeps one test per distinct behavior. Kotlin count itself corrected from a stale "11" previously documented here |
| `ui/theme/ThemeManagerTest.kt` (jsTest) | `ui/theme/themeManager.test.ts` + `ThemeContext.test.tsx` | 7 | 14 + 3 = 17 | +10 | 7 ported 1:1 + 7 additional tests on `readInitialFlavor`/`readInitialAccent` (private in Kotlin, directly testable in TS) + 3 `ThemeContext.test.tsx` hook tests with no Kotlin equivalent |

**New TS-only test files with no Kotlin counterpart** (net-new coverage, not part of the 429-test baseline): `App.test.tsx` (8 — root shell dispatch, untested as a unit in Kotlin), `infrastructure/google/googleDriveClient.test.ts` (13 — `GoogleDriveClient.kt` itself was only ever exercised indirectly via `GoogleDriveSyncAdapterTest`'s mock, never had its own test file), and the shared component tests `ui/shared/{LudoButton,LudoModal,LudoNumberInput,LudoTable,LudoTextInput,ListContainer,ListItemRow}.test.tsx` (Kotlin's Compose HTML shared composables were never unit-tested, only used).

**Summary:** 33 Kotlin test files / 429 tests → 58 TS test files / 612 tests. Every Kotlin test file has a verified TS equivalent with matching or greater coverage; all diffs above +0 are additive (new edge cases or new component/hook coverage), and the two diffs below +0 (`GoogleAuthServiceTest`, `GoogleDriveSyncAdapterTest`) are justified consolidations of tautological or exact-duplicate Kotlin tests, verified line-by-line above. No unjustified gap.

## CSS

Files: `tokens/*.css` (Catppuccin design tokens, see Styling in `doc/technical/architecture.md`), `theme.css`, `layout.css`, `home.css`, `scoring.css`, `history.css`, `stats.css`, `import.css`, `sync.css`, `theme-picker.css`.

Sync classes (`sync.css`): `.sync-icon`, `.sync-status`, `.sync-conflict-container`, `.sync-card`, `.sync-card-title`, `.sync-card-stat`, `.sync-actions`.

Key classes: `.btn-icon`, `.btn-icon--danger`, `.modal-body`, `.modal-row`, `.modal-title` (the latter two now reused for plain typography/checkbox rows inside `LudoModal` content or inline in `SyncScreen` — never actual overlay dialogs), `.detail-row`, `.detail-label`, `.detail-value`, `.splash`, `.splash-content`, `.spinner`, `.onboarding-guide`, `.fab-position`, `.list-container`, `.list-container--spaced`, `.list-item-row`, `.list-item-label`, `.list-item-label--selectable`, `.list-item-label--selected`, `.list-item-name`, `.list-item-subtitle`, `.list-item-actions`, `.list-item-select-picto`.

Every screen (P2-01 through P2-06) now uses `LudoButton`/`LudoTextInput`/`LudoModal` throughout, and P3-01 removed every class those migrations made dead: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-danger-filled`, `.btn-full`, `.input`, `.fab`/`.fab-disabled`, `.btn-add`, `.player-info`/`.player-rename-*`/`.btn-edit`/`.btn-sm`, `.header-spacer`, `.header-title`, `.modal-overlay`, `.modal-content`, `.modal-actions`, `.badge-warn`, `.tie-break-info`, `.card-selected`, `.setup-hint`, `.player-list-pick`/`.player-pick-row`, `.score-input`, `.card-sub`, `.stat-win`/`.stat-loss`/`.stat-ratio`/`.stat-none` — none had any remaining Kotlin references (some never did; see `.task/P3/01-*`).

Theme picker classes (`theme-picker.css`): `.theme-picker-label`, `.theme-picker-row`, `.theme-chip`, `.theme-chip--active`, `.accent-swatch`, `.accent-swatch--active`.

Theme: Catppuccin tokens (`tokens/colors-*.css` + `tokens/semantic.css`), 4 flavors + 14-hue accent. Historical variable names (`--primary`, `--surface`, `--on-surface`, …) are aliased onto the semantic tokens in `theme.css`. `data-theme`/`data-accent` attributes on `<html>` are managed by `ThemeManager` (`rememberThemeState()`), picked from the burger menu's "Theme" entry (`ThemePickerDialog`, `src/jsMain/.../ui/theme/ThemePicker.kt`).

**TS (TS-043)**: `src/ui/theme/ThemePickerDialog.tsx` — function component using `useTheme()`/`LudoModal`/`LudoButton`, same `theme-picker.css` classes.

## App shell (TS-043)

`src/App.tsx` (`AppShell`, dispatch by `useHashRouter().current`) replaces `App.kt`'s root Composable — wraps content in `ServicesProvider`/`ThemeProvider` (which `Main.kt` didn't need since Compose has no context-provider pattern). All screens are real as of TS-056 (`Stats` TS-050, `History` TS-051, `Games` TS-052, `Import` TS-053, `Sync` TS-054, `Home` TS-055, `ScoreDetail` TS-056) — no placeholders remain; the header, contextual back button, and burger menu are the real, final logic:

- **Header**: back button hidden on Home; for `ScoreDetail` goes to `History` if `matchId` is set else `Home`; for `Stats` clears the player selection instead of navigating while a player is selected, else goes `Home`; all other screens go `Home`. Title text is clickable, navigates `Home` unless already there.
- **Burger menu**: Home/Stats/History/Import/Games, + Sync only when `services.syncUseCase` is defined (mirrors `deps.syncHandler != null`), + non-navigating "Theme" item opening `ThemePickerDialog`.
- **Stats back-override wiring (TS-050)**: `AppShell` can't read `StatsScreen`'s internal `useReducer` state directly (per-screen state, unlike Kotlin's shared `statsHandler` singleton), so `StatsScreen` accepts an `onBackOverrideChange: (override: (() => void) | null) => void` prop and calls it (from a `useEffect` on `selectedPlayerId`) with a clear-selection callback when a player is selected, or `null` otherwise. `AppShell` stores the latest value in `statsBackOverride` state (reset on every screen change) and uses it in place of the default `Home` navigation when set.

## localStorage Keys

| Key | Content |
|---|---|
| `scoreo_players` | JSON `List<Player>` |
| `scoreo_gametypes` | JSON `List<GameType>` |
| `scoreo_matches` | JSON `List<Match>` |
| `scoreo_match_draft` | JSON `MatchDraft` (gameTypeId, playerIds, rounds) |
| `scoreo_sync_config` | JSON `SyncConfig` (accessToken, email, expiresAt, lastSyncTimestamp, lastSyncFileId) |
| `scoreo_flavor` | `"latte"` \| `"frappe"` \| `"macchiato"` \| `"mocha"` (Catppuccin flavor, optional) |
| `scoreo_accent` | one of the 14 Catppuccin hues, e.g. `"mauve"` (optional) |
| `scoreo_theme` | **legacy**, pre-Catppuccin: `"dark"` or `"light"`. Only read once as a migration fallback when `scoreo_flavor` is absent (see `doc/technical/migrations.md`) — never written anymore. |
