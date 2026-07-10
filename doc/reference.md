# Reference — for the LLM

Exhaustive tables. Read before exploring `src/`.

## Handlers (MVI)

| Handler | Intent | Intent subclasses | State | Handler file |
|---|---|---|---|---|
| `PlayerHandler` | `PlayerIntent` | `UpdateInput(name: String)`, `AddPlayer`, `DeletePlayer(id, anonymize)`, `ShowDeleteConfirm(id)`, `DismissDeleteConfirm`, `StartRename(playerId)`, `UpdateRenameInput(name)`, `ConfirmRename`, `CancelRename` | `PlayerState` | `src/commonMain/.../ui/player/PlayerHandler.kt` |
| `GameTypeHandler` | `GameTypeIntent` | `UpdateName(name: String)`, `SelectWinCondition(winCondition: WinCondition)`, `UpdateTieBreakRule(rule: TieBreakRule)`, `UpdateTieBreakCondition(condition: WinCondition)`, `UpdateTieBreakLabel(label: String)`, `SelectGame(id: String)`, `DeselectGame`, `AddGameType`, `EditGameType(id: String)`, `CancelEdit`, `UpdateGameType(gameType: GameType)`, `ShowArchiveConfirm(gameTypeId: String)`, `ArchiveGameType(gameTypeId: String)`, `DismissArchiveConfirm` | `GameTypeState` | `src/commonMain/.../ui/gametype/GameTypeHandler.kt` (**TS (TS-052)**: `src/ui/gametype/{gameTypeTypes,gameTypeReducer,GameTypeForm,GameTypeScreen}.ts(x)` — `gameTypeReducer` mirrors every intent 1:1 as an action; side-effecting ones (`AddGameType`/`UpdateGameType`/`ArchiveGameType`/`EditGameType`'s lookup) are performed by `submitAddGameType`/`submitUpdateGameType`/`submitArchiveGameType`/`resolveGameTypeForEdit` helpers called from `GameTypeScreen`, which then dispatch the resulting `*Succeeded`/`*Failed` action — same `resetForm`-on-success idiom as Kotlin's `resetForm(refresh: Boolean)`. `GameTypeForm.tsx` holds both the add-mode form and the shared `GameTypeFields` (win condition / tie-break selects) reused by the edit modal, matching Kotlin's private composable split. 3 modals (detail/edit/archive-confirm) driven by nullable-equivalent (`undefined`) ids in state, same idiom as Kotlin.) |
| `ImportHandler` | `ImportIntent` | `FileLoaded(content: String)`, `FileError(message: String)`, `Execute`, `Reset` | `ImportState(step: ImportStep, preview, jsonContent, result, error)` | `src/commonMain/.../ui/import/ImportHandler.kt` (**TS (TS-053)**: `src/ui/import/{importTypes,importReducer,ImportScreen}.ts(x)` — `importReducer` actions `previewReady`/`previewFailed`/`importSucceeded`/`importFailed`/`fileError`/`reset`; `submitFileLoaded()`/`submitExecute()` call `ImportMatchesUseCase.preview()`/`.execute()` (both `Result<T, Error>`) and map the outcome to an action, dispatched from `ImportScreen`. The `Execute`-only-from-`READY` guard lives in the component (`if (state.step !== 'READY') return`), same as Kotlin's early return.) |
| `ScoreDetailHandler` | `ScoreDetailIntent` | `UpdateScore(roundIndex, playerId, value)`, `AddRound`, `RemoveRound(index)`, `Terminate`, `ConfirmWinners`, `DismissModal`, `ToggleModalWinner(playerId)`, `UpdateSecondaryScoreInput(playerId, value)`, `SubmitSecondaryScores`, `ToggleManualSelectionWinner(playerId)`, `ConfirmManualWinners`, `KeepTie`, `DismissTieBreak`, `CancelMatch`, `ConfirmCancel`, `DismissCancelConfirm` | `ScoreDetailState` | `src/commonMain/.../ui/scoredetail/ScoreDetailHandler.kt` |
| `StatsHandler` | `StatsIntent` | `SelectPlayer(playerId: String)`, `BackToLeaderboard`, `SelectGameType(gameTypeId: String?)` | `StatsState(leaderboard, selectedPlayerId, gameTypes, selectedGameTypeId)` | `src/commonMain/.../ui/stats/StatsHandler.kt` (**TS (TS-050)**: `src/ui/stats/{statsTypes,statsReducer,StatsScreen}.ts(x)` — `statsReducer(state, action)` pure function with actions `selectPlayer`/`backToLeaderboard`/`selectGameType`/`loaded`; the use-case calls that Kotlin's `refresh()` performs as a side effect inside the handler are done in `StatsScreen`'s `useEffect` (keyed on `selectedGameTypeId`, covering both mount and game-type-change triggers) via the exported `loadStats()` helper, dispatching `loaded`) |
| `HistoryHandler` | `HistoryIntent` | `Refresh`, `ShowDeleteConfirm(matchId: String)`, `DeleteMatch(matchId: String)`, `DismissDeleteConfirm`, `SelectGameTypeFilter(gameTypeId: String?)` | `HistoryState` | `src/commonMain/.../ui/history/HistoryHandler.kt` (**TS (TS-051)**: `src/ui/history/{historyTypes,historyReducer,HistoryScreen}.ts(x)` — `historyReducer` actions `loaded`/`showDeleteConfirm`/`deleteFailed`/`dismissDeleteConfirm`/`selectGameTypeFilter`; `loadDisplays()` rebuilds `MatchDisplay[]` from the repositories (called on mount, mirroring `Refresh`), `deleteMatch()` wraps the use-case call in try/catch like the handler. `HistoryScreen` takes an optional `onEditMatch` callback instead of an `AppNavigator` instance — `App.tsx` wires it to `navigate(scoreDetailScreen(...))`.) |
| `SyncHandler` | `SyncIntent` | `Login`, `Logout`, `RestoreSession`, `ResolveConflict(keepLocal: Boolean)`, `DismissError` | `SyncState(phase, email, conflict, result, error)` | `src/commonMain/.../ui/sync/SyncHandler.kt` |

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
| `Screen.Home` | — | HomeScreen (player selection, game modal, FAB) |
| `Screen.History` | — | HistoryScreen (past matches list, delete with confirmation, filter by game type) |
| `Screen.Import` | — | ImportScreen (JSON import, 3-step wizard: select file → preview → result) |
| `Screen.Stats` | — | StatsScreen (ELO leaderboard, head-to-head). Contextual back (App.tsx) clears the player selection when set, else navigates Home — see `StatsScreen`'s `onBackOverrideChange` prop. |
| `Screen.Games` | — | GameTypeScreen (game type management: create, edit, archive with confirmation) |
| `Screen.Sync` | — | SyncScreen (Google Drive cloud backup) |
| `Screen.ScoreDetail` | `gameTypeId: String`, `playerIds: List<String>`, `matchId: String? = null` | ScoreDetailScreen (round entry, create or edit mode via sealed ScoreDetailMode) |

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

| File | Class | Tests |
|---|---|---|
| `src/commonTest/.../application/AddGameTypeUseCaseTest.kt` | `AddGameTypeUseCaseTest` | 13 |
| `src/commonTest/.../application/AddPlayerUseCaseTest.kt` | `AddPlayerUseCaseTest` | 6 |
| `src/commonTest/.../application/ArchiveGameTypeUseCaseTest.kt` | `ArchiveGameTypeUseCaseTest` | 3 |
| `src/commonTest/.../application/CreateMatchUseCaseTest.kt` | `CreateMatchUseCaseTest` | 8 |
| `src/commonTest/.../application/DeleteMatchUseCaseTest.kt` | `DeleteMatchUseCaseTest` | 3 |
| `src/commonTest/.../application/DeletePlayerUseCaseTest.kt` | `DeletePlayerUseCaseTest` | 6 |
| `src/commonTest/.../application/EloCalculatorTest.kt` | `EloCalculatorTest` | 22 |
| `src/commonTest/.../application/GetGameTypesUseCaseTest.kt` | `GetGameTypesUseCaseTest` | 5 |
| `src/commonTest/.../application/GetHeadToHeadUseCaseEloTest.kt` | `GetHeadToHeadUseCaseEloTest` | 10 |
| `src/commonTest/.../application/GetHeadToHeadUseCaseTest.kt` | `GetHeadToHeadUseCaseTest` | 11 |
| `src/commonTest/.../application/GetPlayerStatsUseCaseTest.kt` | `GetPlayerStatsUseCaseTest` | 8 |
| `src/commonTest/.../application/GetPlayersUseCaseTest.kt` | `GetPlayersUseCaseTest` | 4 |
| `src/commonTest/.../application/IdGeneratorTest.kt` | `IdGeneratorTest` | 6 |
| `src/commonTest/.../application/ImportMatchesUseCaseTest.kt` | `ImportMatchesUseCaseTest` | 17 |
| `src/commonTest/.../application/MatchMigrationTest.kt` | `MatchMigrationTest` | 18 |
| `src/commonTest/.../application/RenamePlayerUseCaseTest.kt` | `RenamePlayerUseCaseTest` | 9 |
| `src/commonTest/.../application/SyncUseCaseTest.kt` | `SyncUseCaseTest` | 7 |
| `src/commonTest/.../application/UpdateGameTypeUseCaseTest.kt` | `UpdateGameTypeUseCaseTest` | 3 |
| `src/commonTest/.../application/UpdateMatchUseCaseTest.kt` | `UpdateMatchUseCaseTest` | 3 |
| `src/commonTest/.../di/SyncDependenciesTest.kt` | `SyncDependenciesTest` | 2 (TS: `src/services/createServices.test.ts` + `ServicesContext.test.tsx`, 6 tests) |
| `src/commonTest/.../domain/GameTypeTest.kt` | `GameTypeTest` | 9 |
| `src/commonTest/.../domain/MatchTieBreakTest.kt` | `MatchTieBreakTest` | 12 |
| `src/commonTest/.../domain/SerializationTest.kt` | `SerializationTest` | 27 |
| `src/commonTest/.../infrastructure/InMemoryRepositoryTest.kt` | `InMemoryRepositoryTest` | 11 |
| `src/commonTest/.../ui/gametype/GameTypeHandlerTest.kt` | `GameTypeHandlerTest` | 22 (TS: `src/ui/gametype/gameTypeReducer.test.ts`, 22 + `GameTypeScreen.test.tsx`, 9) |
| `src/commonTest/.../ui/history/HistoryHandlerTest.kt` | `HistoryHandlerTest` | 24 (TS: `src/ui/history/historyReducer.test.ts`, 24 + `HistoryScreen.test.tsx`, 6) |
| `src/commonTest/.../ui/import/ImportHandlerTest.kt` | `ImportHandlerTest` | 18 (stale count corrected from a previous "8" while porting; TS: `src/ui/import/importReducer.test.ts`, 18 + `ImportScreen.test.tsx`, 4) |
| `src/commonTest/.../ui/navigation/AppNavigatorTest.kt` | `AppNavigatorTest` | 41 (TS: `src/ui/navigation/hash.test.ts`, 41 + `useHashRouter.test.ts`, 3) |
| `src/commonTest/.../ui/player/PlayerHandlerTest.kt` | `PlayerHandlerTest` | 21 |
| `src/commonTest/.../ui/scoredetail/ScoreDetailHandlerTest.kt` | `ScoreDetailHandlerTest` | 57 |
| `src/commonTest/.../ui/stats/StatsHandlerTest.kt` | `StatsHandlerTest` | 6 (TS: `src/ui/stats/statsReducer.test.ts`, 6 + `StatsScreen.test.tsx`, 5) |
| `src/commonTest/.../ui/sync/SyncHandlerTest.kt` | `SyncHandlerTest` | 10 |
| `src/jsTest/.../infrastructure/google/GoogleAuthServiceTest.kt` | `GoogleAuthServiceTest` | 29 |
| `src/jsTest/.../infrastructure/google/GoogleDriveSyncAdapterTest.kt` | `GoogleDriveSyncAdapterTest` | 23 (corrige au passage, la doc indiquait 11 par erreur) |
| `src/jsTest/.../ui/theme/ThemeManagerTest.kt` | `ThemeManagerTest` | 7 (TS: `src/ui/theme/themeManager.test.ts`, 7 portes + 7 tests additionnels sur la logique reelle de `readInitialFlavor`/`readInitialAccent` — prive en Kotlin, testable directement en TS ; + `ThemeContext.test.tsx`, 3 tests) |

**Summary:** 31 commonTest files + 2 jsTest files = 33 test files. **Total: 429 tests** (commonTest: 411, jsTest: 18). All in `src/commonTest/` or `src/jsTest/`.

## CSS

Files: `tokens/*.css` (Catppuccin design tokens, see Styling in `doc/technical/architecture.md`), `theme.css`, `layout.css`, `home.css`, `scoring.css`, `history.css`, `stats.css`, `import.css`, `sync.css`, `theme-picker.css`.

Sync classes (`sync.css`): `.sync-icon`, `.sync-status`, `.sync-conflict-container`, `.sync-card`, `.sync-card-title`, `.sync-card-stat`, `.sync-actions`.

Key classes: `.btn-icon`, `.btn-icon--danger`, `.modal-body`, `.modal-row`, `.modal-title` (the latter two now reused for plain typography/checkbox rows inside `LudoModal` content or inline in `SyncScreen` — never actual overlay dialogs), `.detail-row`, `.detail-label`, `.detail-value`, `.splash`, `.splash-content`, `.spinner`, `.onboarding-guide`, `.fab-position`, `.list-container`, `.list-container--spaced`, `.list-item-row`, `.list-item-label`, `.list-item-label--selectable`, `.list-item-label--selected`, `.list-item-name`, `.list-item-subtitle`, `.list-item-actions`, `.list-item-select-picto`.

Every screen (P2-01 through P2-06) now uses `LudoButton`/`LudoTextInput`/`LudoModal` throughout, and P3-01 removed every class those migrations made dead: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-danger-filled`, `.btn-full`, `.input`, `.fab`/`.fab-disabled`, `.btn-add`, `.player-info`/`.player-rename-*`/`.btn-edit`/`.btn-sm`, `.header-spacer`, `.header-title`, `.modal-overlay`, `.modal-content`, `.modal-actions`, `.badge-warn`, `.tie-break-info`, `.card-selected`, `.setup-hint`, `.player-list-pick`/`.player-pick-row`, `.score-input`, `.card-sub`, `.stat-win`/`.stat-loss`/`.stat-ratio`/`.stat-none` — none had any remaining Kotlin references (some never did; see `.task/P3/01-*`).

Theme picker classes (`theme-picker.css`): `.theme-picker-label`, `.theme-picker-row`, `.theme-chip`, `.theme-chip--active`, `.accent-swatch`, `.accent-swatch--active`.

Theme: Catppuccin tokens (`tokens/colors-*.css` + `tokens/semantic.css`), 4 flavors + 14-hue accent. Historical variable names (`--primary`, `--surface`, `--on-surface`, …) are aliased onto the semantic tokens in `theme.css`. `data-theme`/`data-accent` attributes on `<html>` are managed by `ThemeManager` (`rememberThemeState()`), picked from the burger menu's "Theme" entry (`ThemePickerDialog`, `src/jsMain/.../ui/theme/ThemePicker.kt`).

**TS (TS-043)**: `src/ui/theme/ThemePickerDialog.tsx` — function component using `useTheme()`/`LudoModal`/`LudoButton`, same `theme-picker.css` classes.

## App shell (TS-043)

`src/App.tsx` (`AppShell`, dispatch by `useHashRouter().current`) replaces `App.kt`'s root Composable — wraps content in `ServicesProvider`/`ThemeProvider` (which `Main.kt` didn't need since Compose has no context-provider pattern). Screen bodies are placeholders until their Phase F ticket lands, except `Stats` (TS-050), `History` (TS-051), `Games` (TS-052), and `Import` (TS-053) which are real; the header, contextual back button, and burger menu are the real, final logic:

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
