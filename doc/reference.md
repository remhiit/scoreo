# Reference — for the LLM

Exhaustive tables. Read before exploring `src/`.

## Handlers (MVI)

| Handler | Intent | Intent subclasses | State | Handler file |
|---|---|---|---|---|
| `PlayerHandler` | `PlayerIntent` | `UpdateInput(name: String)`, `AddPlayer`, `DeletePlayer(id, anonymize)`, `ShowDeleteConfirm(id)`, `DismissDeleteConfirm`, `StartRename(playerId)`, `UpdateRenameInput(name)`, `ConfirmRename`, `CancelRename` | `PlayerState` | `src/commonMain/.../ui/player/PlayerHandler.kt` |
| `GameTypeHandler` | `GameTypeIntent` | `UpdateName(name: String)`, `SelectWinCondition(winCondition: WinCondition)`, `UpdateTieBreakRule(rule: TieBreakRule)`, `UpdateTieBreakCondition(condition: WinCondition)`, `UpdateTieBreakLabel(label: String)`, `SelectGame(id: String)`, `DeselectGame`, `AddGameType`, `EditGameType(id: String)`, `CancelEdit`, `UpdateGameType(gameType: GameType)`, `ShowArchiveConfirm(gameTypeId: String)`, `ArchiveGameType(gameTypeId: String)`, `DismissArchiveConfirm` | `GameTypeState` | `src/commonMain/.../ui/gametype/GameTypeHandler.kt` |
| `ImportHandler` | `ImportIntent` | `FileLoaded(content: String)`, `FileError(message: String)`, `Execute`, `Reset` | `ImportState(step: ImportStep, preview, jsonContent, result, error)` | `src/commonMain/.../ui/import/ImportHandler.kt` |
| `ScoreDetailHandler` | `ScoreDetailIntent` | `UpdateScore(roundIndex, playerId, value)`, `AddRound`, `RemoveRound(index)`, `Terminate`, `ConfirmWinners`, `DismissModal`, `ToggleModalWinner(playerId)`, `UpdateSecondaryScoreInput(playerId, value)`, `SubmitSecondaryScores`, `ToggleManualSelectionWinner(playerId)`, `ConfirmManualWinners`, `KeepTie`, `DismissTieBreak`, `CancelMatch`, `ConfirmCancel`, `DismissCancelConfirm` | `ScoreDetailState` | `src/commonMain/.../ui/scoredetail/ScoreDetailHandler.kt` |
| `StatsHandler` | `StatsIntent` | `SelectPlayer(playerId: String)`, `BackToLeaderboard`, `SelectGameType(gameTypeId: String?)` | `StatsState(leaderboard, selectedPlayerId, gameTypes, selectedGameTypeId)` | `src/commonMain/.../ui/stats/StatsHandler.kt` |
| `HistoryHandler` | `HistoryIntent` | `Refresh`, `ShowDeleteConfirm(matchId: String)`, `DeleteMatch(matchId: String)`, `DismissDeleteConfirm`, `SelectGameTypeFilter(gameTypeId: String?)` | `HistoryState` | `src/commonMain/.../ui/history/HistoryHandler.kt` |
| `SyncHandler` | `SyncIntent` | `Login`, `Logout`, `RestoreSession`, `ResolveConflict(keepLocal: Boolean)`, `DismissError` | `SyncState(phase, email, conflict, result, error)` | `src/commonMain/.../ui/sync/SyncHandler.kt` |

All in `src/commonMain/kotlin/com/scoreo/`.

## Use Cases

| Use Case | Method | Return | File |
|---|---|---|---|
| `AddPlayerUseCase` | `invoke(name: String)` | `Player` | `src/commonMain/.../application/AddPlayerUseCase.kt` |
| `AddGameTypeUseCase` | `invoke(name: String, winCondition: WinCondition, tieBreakRule: TieBreakRule = NONE, tieBreakCondition: WinCondition = HIGHEST_SCORE, tieBreakLabel: String? = null)` | `GameType` | `src/commonMain/.../application/AddGameTypeUseCase.kt` |
| `ArchiveGameTypeUseCase` | `invoke(gameTypeId: String)` | `Unit` | `src/commonMain/.../application/ArchiveGameTypeUseCase.kt` |
| `CreateMatchUseCase` | `invoke(gameTypeId: String, playerScores: List<PlayerScore>, date: Long, manualWinners: List<String>, secondaryPlayerScores: List<PlayerScore>)` | `Match` | `src/commonMain/.../application/CreateMatchUseCase.kt` |
| `UpdateMatchUseCase` | `invoke(match: Match)` | `Unit` | `src/commonMain/.../application/UpdateMatchUseCase.kt` |
| `DeleteMatchUseCase` | `invoke(matchId: String)` | `Unit` | `src/commonMain/.../application/DeleteMatchUseCase.kt` |
| `DeletePlayerUseCase` | `invoke(id: String, anonymize: Boolean = false)` | `Unit` | `src/commonMain/.../application/DeletePlayerUseCase.kt` |
| `RenamePlayerUseCase` | `invoke(playerId: String, newName: String)` | `Unit` | `src/commonMain/.../application/RenamePlayerUseCase.kt` |
| `GetPlayersUseCase` | `invoke(includeInactive: Boolean = false)` | `List<Player>` | `src/commonMain/.../application/GetPlayersUseCase.kt` |
| `GetPlayerStatsUseCase` | `invoke()` | `Map<String, PlayerStats>` | `src/commonMain/.../application/GetPlayerStatsUseCase.kt` |
| `GetHeadToHeadUseCase` | `invoke(gameTypeId: String? = null)` | `List<PlayerDetail>` | `src/commonMain/.../application/GetHeadToHeadUseCase.kt` |
| `EloCalculator` | `compute(matches, gameTypes)` | `Map<String, Int>` | `src/commonMain/.../application/EloCalculator.kt` |
| `FindGameTypeByIdUseCase` | `invoke(id: String)` | `GameType?` | `src/commonMain/.../application/FindGameTypeByIdUseCase.kt` |
| `GetGameTypesUseCase` | `invoke(includeInactive: Boolean = false)` | `List<GameType>` | `src/commonMain/.../application/GetGameTypesUseCase.kt` |
| `GetMatchesUseCase` | `invoke()` | `List<Match>` | `src/commonMain/.../application/GetMatchesUseCase.kt` |
| `ImportMatchesUseCase` | `preview(jsonString: String)`, `execute(jsonString: String)` | `Result<ImportPreview>`, `Result<ImportResult>` | `src/commonMain/.../application/ImportMatchesUseCase.kt` |
| `SyncUseCase` | `suspend autoSync()` | `SyncOutcome` | `src/commonMain/.../application/SyncUseCase.kt` |
| `SyncUseCase` | `suspend resolveConflict(keepLocal: Boolean)` | `SyncResult` | `src/commonMain/.../application/SyncUseCase.kt` |
| `SyncUseCase` | `suspend login()` / `suspend logout()` / `suspend status()` | `Unit` / `SyncStatus` | `src/commonMain/.../application/SyncUseCase.kt` |

All in `src/commonMain/kotlin/com/scoreo/`.

## Domain Models

| Model | Fields | File |
|---|---|---|
| `Player` | `id: String`, `name: String`, `active: Boolean = true` | `src/commonMain/.../domain/model/Player.kt` |
| `GameType` | `id: String`, `name: String`, `winCondition: WinCondition`, `tieBreakRule: TieBreakRule = TieBreakRule.NONE`, `tieBreakCondition: WinCondition = WinCondition.HIGHEST_SCORE`, `tieBreakLabel: String? = null`, `active: Boolean = true` | `src/commonMain/.../domain/model/GameType.kt` |
| `Match` | `id: String`, `date: Long`, `gameTypeId: String`, `playerScores: List<PlayerScore>`, `manualWinners: List<String> = emptyList()`, `secondaryPlayerScores: List<PlayerScore> = emptyList()` | `src/commonMain/.../domain/model/Match.kt` |
| `MatchDraft` | `gameTypeId: String`, `playerIds: List<String>`, `rounds: List<Map<String, String>>`, `timestamp: Long` | `src/commonMain/.../domain/model/MatchDraft.kt` |
| `PlayerScore` | `playerId: String`, `score: Int` | `src/commonMain/.../domain/model/PlayerScore.kt` |
| `WinCondition` | enum: `HIGHEST_SCORE`, `LOWEST_SCORE`, `MANUAL` | `src/commonMain/.../domain/model/WinCondition.kt` |
| `TieBreakRule` | enum: `NONE`, `MANUAL_SELECTION`, `SECONDARY_SCORE` | `src/commonMain/.../domain/model/TieBreakRule.kt` |

All in `src/commonMain/kotlin/com/scoreo/`.

## Ports (Repository Interfaces)

| Interface | Methods | File |
|---|---|---|
| `PlayerRepository` | `getAll(includeInactive)`, `save(player)`, `saveAll(players)`, `delete(id, anonymize)` | `src/commonMain/.../domain/port/PlayerRepository.kt` |
| `GameTypeRepository` | `getAll(includeInactive: Boolean = false)`, `save(gameType)`, `saveAll(gameTypes)`, `findById(id)` | `src/commonMain/.../domain/port/GameTypeRepository.kt` |
| `MatchRepository` | `getAll()`, `save(match)`, `saveAll(matches)`, `findById(id)`, `delete(id)` | `src/commonMain/.../domain/port/MatchRepository.kt` |
| `MatchDraftRepository` | `save(draft: MatchDraft)`, `load(): MatchDraft?`, `clear()` | `src/commonMain/.../domain/port/MatchDraftRepository.kt` |
| `CloudSyncRepository` | `suspend push(data)`, `suspend pull()`, `suspend getStatus()`, `suspend login()`, `suspend logout()` | `src/commonMain/.../domain/port/CloudSyncRepository.kt` |

All in `src/commonMain/kotlin/com/scoreo/`.

## Adapters (Implementations)

| Class | Implements | Storage | File |
|---|---|---|---|
| `LocalStoragePlayerRepository` | `PlayerRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStoragePlayerRepository.kt` |
| `LocalStorageGameTypeRepository` | `GameTypeRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStorageGameTypeRepository.kt` |
| `LocalStorageMatchRepository` | `MatchRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStorageMatchRepository.kt` |
| `LocalStorageMatchDraftRepository` | `MatchDraftRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStorageMatchDraftRepository.kt` |
| `GoogleDriveSyncAdapter` | `CloudSyncRepository` | Google Drive App Data Folder (async fetch + coroutines) | `src/jsMain/.../infrastructure/google/GoogleDriveSyncAdapter.kt` |
| `OAuthConfig` | — (config object) | `CLIENT_ID: String` — generated at build from `GOOGLE_CLIENT_ID` env var | `build/generated/oauthconfig/.../OAuthConfig.kt` (generated) |
| `InMemoryCloudSyncRepository` | `CloudSyncRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryCloudSyncRepository.kt` |
| `InMemoryPlayerRepository` | `PlayerRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryPlayerRepository.kt` |
| `InMemoryGameTypeRepository` | `GameTypeRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryGameTypeRepository.kt` |
| `InMemoryMatchRepository` | `MatchRepository` | in-memory (tests) | `src/commonTest/.../infrastructure/InMemoryMatchRepository.kt` |
| `MatchMigration` | — (utility) | `migrateMatchesJson()` | `src/commonMain/.../application/MatchMigration.kt` |

All in `src/jsMain/kotlin/com/scoreo/`. Production: `LocalStorage*`, `GoogleDriveSyncAdapter`. Tests: `InMemory*`.

`JsonConfig.kt` (`src/jsMain/.../infrastructure/`) provides `scoreoJson: Json` with `ignoreUnknownKeys = true`.

## Navigation

| Screen | Parameters | Destination |
|---|---|---|
| `Screen.Home` | — | HomeScreen (player selection, game modal, FAB) |
| `Screen.History` | — | HistoryScreen (past matches list) |
| `Screen.Import` | — | ImportScreen (JSON import) |
| `Screen.Stats` | — | StatsScreen (ELO leaderboard, head-to-head) |
| `Screen.Games` | — | GameTypeScreen (game type management) |
| `Screen.Sync` | — | SyncScreen (Google Drive cloud backup) |
| `Screen.ScoreDetail` | `gameTypeId: String`, `playerIds: List<String>`, `matchId: String? = null` | ScoreDetailScreen (round entry, create or edit mode via sealed ScoreDetailMode) |

## Shared Components

| Component | Parameters | Usage |
|---|---|---|
| `ListContainer` | `className: String? = null`, `content: @Composable () -> Unit` | Generic wrapper for `ListItemRow` lists: `display:flex; flex-direction:column; gap:8px`. Pass `className="list-container--spaced"` to add `margin-top:16px` (e.g. GameTypeScreen). |
| `ListItemRow` | `label: String`, `subtitle: String? = null`, `isSelectable: Boolean = false`, `isSelected: Boolean = false`, `onSelect: (() -> Unit)? = null`, `onView: (() -> Unit)? = null`, `onEdit: (() -> Unit)? = null`, `onDelete: (() -> Unit)? = null` | Uniform list display: players (HomeScreen), game types (GameTypeScreen), match history (HistoryScreen). Supports selection, view, edit, delete. |

Files: `src/jsMain/kotlin/com/scoreo/ui/shared/ListContainer.kt`, `src/jsMain/kotlin/com/scoreo/ui/shared/ListItemRow.kt`

## Tests

| File | Class | Tests |
|---|---|---|
| `src/commonTest/.../application/AddGameTypeUseCaseTest.kt` | `AddGameTypeUseCaseTest` | 13 |
| `src/commonTest/.../application/AddPlayerUseCaseTest.kt` | `AddPlayerUseCaseTest` | 6 |
| `src/commonTest/.../application/ArchiveGameTypeUseCaseTest.kt` | `ArchiveGameTypeUseCaseTest` | 3 |
| `src/commonTest/.../application/CreateMatchUseCaseTest.kt` | `CreateMatchUseCaseTest` | 8 |
| `src/commonTest/.../application/DeleteMatchUseCaseTest.kt` | `DeleteMatchUseCaseTest` | 3 |
| `src/commonTest/.../application/DeletePlayerUseCaseTest.kt` | `DeletePlayerUseCaseTest` | 6 |
| `src/commonTest/.../application/EloCalculatorTest.kt` | `EloCalculatorTest` | 3 |
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
| `src/commonTest/.../di/SyncDependenciesTest.kt` | `SyncDependenciesTest` | 2 |
| `src/commonTest/.../domain/GameTypeTest.kt` | `GameTypeTest` | 9 |
| `src/commonTest/.../domain/MatchTieBreakTest.kt` | `MatchTieBreakTest` | 12 |
| `src/commonTest/.../domain/SerializationTest.kt` | `SerializationTest` | 27 |
| `src/commonTest/.../infrastructure/InMemoryRepositoryTest.kt` | `InMemoryRepositoryTest` | 11 |
| `src/commonTest/.../ui/gametype/GameTypeHandlerTest.kt` | `GameTypeHandlerTest` | 22 |
| `src/commonTest/.../ui/history/HistoryHandlerTest.kt` | `HistoryHandlerTest` | 24 |
| `src/commonTest/.../ui/import/ImportHandlerTest.kt` | `ImportHandlerTest` | 8 |
| `src/commonTest/.../ui/player/PlayerHandlerTest.kt` | `PlayerHandlerTest` | 21 |
| `src/commonTest/.../ui/scoredetail/ScoreDetailHandlerTest.kt` | `ScoreDetailHandlerTest` | 57 |
| `src/commonTest/.../ui/stats/StatsHandlerTest.kt` | `StatsHandlerTest` | 6 |
| `src/commonTest/.../ui/sync/SyncHandlerTest.kt` | `SyncHandlerTest` | 10 |
| `src/jsTest/.../infrastructure/google/GoogleDriveSyncAdapterTest.kt` | `GoogleDriveSyncAdapterTest` | 11 |
| `src/jsTest/.../ui/theme/ThemeManagerTest.kt` | `ThemeManagerTest` | 7 |

**Summary:** 30 commonTest files + 2 jsTest files = 32 test files. **Total: 388 tests** (commonTest: 370, jsTest: 18). All in `src/commonTest/` or `src/jsTest/`.

## CSS

Files: `theme.css`, `layout.css`, `home.css`, `scoring.css`, `history.css`, `stats.css`, `import.css`, `sync.css`.

Sync classes (`sync.css`): `.sync-icon`, `.sync-status`, `.sync-conflict-container`, `.sync-card`, `.sync-card-title`, `.sync-card-stat`, `.sync-actions`.

Key classes: `.home-player-card`, `.home-player-card.selected`, `.home-player-check`, `.player-info`, `.player-rename-input`, `.player-rename-container`, `.btn-edit`, `.btn-icon`, `.btn-icon--danger`, `.btn-sm`, `.btn-primary`, `.btn-secondary`, `.home-add-player-toggle`, `.home-add-player-form`, `.fab-disabled`, `.fab-error`, `.btn-danger`, `.btn-danger-filled`, `.modal-body`, `.card-selected`, `.detail-row`, `.detail-label`, `.detail-value`, `.badge-warn`, `.tie-break-info`, `.theme-toggle-btn`, `.splash`, `.splash-content`, `.spinner`, `.onboarding-guide`, `.list-container`, `.list-container--spaced`, `.list-item-row`, `.list-item-label`, `.list-item-label--selectable`, `.list-item-label--selected`, `.list-item-name`, `.list-item-subtitle`, `.list-item-actions`, `.list-item-select-picto`.

Theme: CSS variables in `:root` (light) and `[data-theme="dark"]` (dark) in `theme.css`. The `data-theme="dark"` attribute on `<html>` is managed by `ThemeManager`.

## localStorage Keys

| Key | Content |
|---|---|
| `scoreo_players` | JSON `List<Player>` |
| `scoreo_gametypes` | JSON `List<GameType>` |
| `scoreo_matches` | JSON `List<Match>` |
| `scoreo_match_draft` | JSON `MatchDraft` (gameTypeId, playerIds, rounds) |
| `scoreo_sync_config` | JSON `SyncConfig` (accessToken, email, expiresAt, lastSyncTimestamp, lastSyncFileId) |
| `scoreo_theme` | `"dark"` or `"light"` (dark mode, optional) |
