# Reference — pour le LLM

Tableaux exhaustifs. Lire en priorité avant d'explorer `src/`.

## Handlers (MVI)

| Handler | Intent | Intent subclasses | State | Fichier handler |
|---|---|---|---|---|
| `PlayerHandler` | `PlayerIntent` | `UpdateInput(name: String)`, `AddPlayer`, `DeletePlayer(id, anonymize)`, `ShowDeleteConfirm(id)`, `DismissDeleteConfirm` | `PlayerState` | `src/commonMain/.../ui/player/PlayerHandler.kt` |
| `GameTypeHandler` | `GameTypeIntent` | `UpdateName(name: String)`, `SelectWinCondition(winCondition: WinCondition)`, `UpdateTieBreakRule(rule: TieBreakRule)`, `UpdateTieBreakCondition(condition: WinCondition)`, `UpdateTieBreakLabel(label: String)`, `SelectGame(id: String)`, `DeselectGame`, `AddGameType`, `EditGameType(id: String)`, `CancelEdit`, `UpdateGameType(gameType: GameType)`, `ShowArchiveConfirm(gameTypeId: String)`, `ArchiveGameType(gameTypeId: String)`, `DismissArchiveConfirm` | `GameTypeState` | `src/commonMain/.../ui/gametype/GameTypeHandler.kt` |
| `ImportHandler` | `ImportIntent` | `FileLoaded(content: String)`, `Execute`, `Reset` | `ImportState(step: ImportStep, preview, jsonContent, result, error)` | `src/commonMain/.../ui/import/ImportHandler.kt` |
| `ScoreDetailHandler` | `ScoreDetailIntent` | `UpdateScore(roundIndex, playerId, value)`, `AddRound`, `RemoveRound(index)`, `Terminate`, `ConfirmWinners`, `DismissModal`, `ToggleModalWinner(playerId)`, `UpdateSecondaryScoreInput(playerId, value)`, `SubmitSecondaryScores`, `ToggleManualSelectionWinner(playerId)`, `ConfirmManualWinners`, `KeepTie`, `DismissTieBreak` | `ScoreDetailState` | `src/commonMain/.../ui/scoredetail/ScoreDetailHandler.kt` |
| `StatsHandler` | `StatsIntent` | `SelectPlayer(playerId: String)`, `BackToLeaderboard`, `SelectGameType(gameTypeId: String?)` | `StatsState(leaderboard, selectedPlayerId, gameTypes, selectedGameTypeId)` | `src/commonMain/.../ui/stats/StatsHandler.kt` |
| `HistoryHandler` | `HistoryIntent` | `Refresh` | `HistoryState(displays: List<MatchDisplay>)` | `src/commonMain/.../ui/history/HistoryHandler.kt` |
| `SyncHandler` | `SyncIntent` | `Login`, `Logout`, `ResolveConflict(keepLocal: Boolean)`, `DismissError` | `SyncState(phase, email, conflict, result, error)` | `src/commonMain/.../ui/sync/SyncHandler.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Use Cases

| Use Case | Méthode | Retour | Fichier |
|---|---|---|---|
| `AddPlayerUseCase` | `invoke(name: String)` | `Player` | `src/commonMain/.../application/AddPlayerUseCase.kt` |
| `AddGameTypeUseCase` | `invoke(name: String, winCondition: WinCondition, tieBreakRule: TieBreakRule = NONE, tieBreakCondition: WinCondition = HIGHEST_SCORE, tieBreakLabel: String? = null)` | `GameType` | `src/commonMain/.../application/AddGameTypeUseCase.kt` |
| `ArchiveGameTypeUseCase` | `invoke(gameTypeId: String)` | `Unit` | `src/commonMain/.../application/ArchiveGameTypeUseCase.kt` |
| `CreateMatchUseCase` | `invoke(gameTypeId: String, playerScores: List<PlayerScore>, date: Long, manualWinners: List<String>, secondaryPlayerScores: List<PlayerScore>)` | `Match` | `src/commonMain/.../application/CreateMatchUseCase.kt` |
| `DeletePlayerUseCase` | `invoke(id: String, anonymize: Boolean = false)` | `Unit` | `src/commonMain/.../application/DeletePlayerUseCase.kt` |
| `GetPlayersUseCase` | `invoke(includeInactive: Boolean = false)` | `List<Player>` | `src/commonMain/.../application/GetPlayersUseCase.kt` |
| `GetPlayerStatsUseCase` | `invoke()` | `Map<String, PlayerStats>` | `src/commonMain/.../application/GetPlayerStatsUseCase.kt` |
| `GetHeadToHeadUseCase` | `invoke(gameTypeId: String? = null)` | `List<PlayerDetail>` | `src/commonMain/.../application/GetHeadToHeadUseCase.kt` |
| `EloCalculator` | `compute(matches, gameTypes)` | `Map<String, Int>` | `src/commonMain/.../application/EloCalculator.kt` |
| `GetGameTypesUseCase` | `invoke()` | `List<GameType>` | `src/commonMain/.../application/GetGameTypesUseCase.kt` |
| `GetMatchesUseCase` | `invoke()` | `List<Match>` | `src/commonMain/.../application/GetMatchesUseCase.kt` |
| `ImportMatchesUseCase` | `preview(jsonString: String)`, `execute(jsonString: String)` | `Result<ImportPreview>`, `Result<ImportResult>` | `src/commonMain/.../application/ImportMatchesUseCase.kt` |
| `SyncUseCase` | `suspend autoSync()` | `SyncOutcome` | `src/commonMain/.../application/SyncUseCase.kt` |
| `SyncUseCase` | `suspend resolveConflict(keepLocal: Boolean)` | `SyncResult` | `src/commonMain/.../application/SyncUseCase.kt` |
| `SyncUseCase` | `suspend login()` / `suspend logout()` / `suspend status()` | `Unit` / `SyncStatus` | `src/commonMain/.../application/SyncUseCase.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Domain Models

| Model | Champs | Fichier |
|---|---|---|
| `Player` | `id: String`, `name: String`, `active: Boolean = true` | `src/commonMain/.../domain/model/Player.kt` |
| `GameType` | `id: String`, `name: String`, `winCondition: WinCondition`, `tieBreakRule: TieBreakRule = TieBreakRule.NONE`, `tieBreakCondition: WinCondition = WinCondition.HIGHEST_SCORE`, `tieBreakLabel: String? = null`, `active: Boolean = true` | `src/commonMain/.../domain/model/GameType.kt` |
| `Match` | `id: String`, `date: Long`, `gameTypeId: String`, `playerScores: List<PlayerScore>`, `manualWinners: List<String> = emptyList()`, `secondaryPlayerScores: List<PlayerScore> = emptyList()` | `src/commonMain/.../domain/model/Match.kt` |
| `PlayerScore` | `playerId: String`, `score: Int` | `src/commonMain/.../domain/model/PlayerScore.kt` |
| `WinCondition` | enum: `HIGHEST_SCORE`, `LOWEST_SCORE`, `MANUAL` | `src/commonMain/.../domain/model/WinCondition.kt` |
| `TieBreakRule` | enum: `NONE`, `MANUAL_SELECTION`, `SECONDARY_SCORE` | `src/commonMain/.../domain/model/TieBreakRule.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Ports (Repository Interfaces)

| Interface | Méthodes | Fichier |
|---|---|---|
| `PlayerRepository` | `getAll(includeInactive)`, `save(player)`, `saveAll(players)`, `delete(id, anonymize)` | `src/commonMain/.../domain/port/PlayerRepository.kt` |
| `GameTypeRepository` | `getAll(includeInactive: Boolean = false)`, `save(gameType)`, `saveAll(gameTypes)`, `findById(id)` | `src/commonMain/.../domain/port/GameTypeRepository.kt` |
| `MatchRepository` | `getAll()`, `save(match)`, `saveAll(matches)`, `findById(id)` | `src/commonMain/.../domain/port/MatchRepository.kt` |
| `CloudSyncRepository` | `suspend push(data)`, `suspend pull()`, `suspend getStatus()`, `suspend login()`, `suspend logout()` | `src/commonMain/.../domain/port/CloudSyncRepository.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Adapters (Implémentations)

| Classe | Implémente | Stockage | Fichier |
|---|---|---|---|
| `LocalStoragePlayerRepository` | `PlayerRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStoragePlayerRepository.kt` |
| `LocalStorageGameTypeRepository` | `GameTypeRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStorageGameTypeRepository.kt` |
| `LocalStorageMatchRepository` | `MatchRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStorageMatchRepository.kt` |
| `GoogleDriveSyncAdapter` | `CloudSyncRepository` | Google Drive App Data Folder (async fetch + coroutines) | `src/jsMain/.../infrastructure/google/GoogleDriveSyncAdapter.kt` |
| `InMemoryCloudSyncRepository` | `CloudSyncRepository` | mémoire (tests) | `src/commonTest/.../infrastructure/InMemoryCloudSyncRepository.kt` |
| `InMemoryPlayerRepository` | `PlayerRepository` | mémoire (tests) | `src/commonTest/.../infrastructure/InMemoryPlayerRepository.kt` |
| `InMemoryGameTypeRepository` | `GameTypeRepository` | mémoire (tests) | `src/commonTest/.../infrastructure/InMemoryGameTypeRepository.kt` |
| `InMemoryMatchRepository` | `MatchRepository` | mémoire (tests) | `src/commonTest/.../infrastructure/InMemoryMatchRepository.kt` |
| `MatchMigration` | — (utilitaire) | `migrateMatchesJson()` | `src/commonMain/.../application/MatchMigration.kt` |

Tous dans `src/jsMain/kotlin/com/scoreo/`. Utilisés en production : `LocalStorage*`, `GoogleDriveSyncAdapter`. En tests : `InMemory*`.

Le fichier `JsonConfig.kt` (`src/jsMain/.../infrastructure/`) fournit `scoreoJson: Json` avec `ignoreUnknownKeys = true`.

## Navigation

| Screen | Paramètres | Destination |
|---|---|---|
| `Screen.Home` | — | HomeScreen (sélection joueurs, game modal, FAB) |
| `Screen.History` | — | HistoryScreen (liste des matchs passés) |
| `Screen.Import` | — | ImportScreen (import JSON) |
| `Screen.Stats` | — | StatsScreen (classement ELO, head-to-head) |
| `Screen.Games` | — | GameTypeScreen (gestion des types de jeu) |
| `Screen.Sync` | — | SyncScreen (sauvegarde cloud Google Drive) |
| `Screen.ScoreDetail` | `gameTypeId: String`, `playerIds: List<String>` | ScoreDetailScreen (saisie des rounds) |

## Tests

| Fichier | Classe | Tests |
|---|---|---|
| `src/commonTest/.../ui/player/PlayerHandlerTest.kt` | `PlayerHandlerTest` | Handler Player (12 tests) |
| `src/commonTest/.../domain/GameTypeTest.kt` | `GameTypeTest` | Domain GameType (10 tests) |
| `src/commonTest/.../domain/MatchTieBreakTest.kt` | `MatchTieBreakTest` | Domain Match tie-break (13 tests) |
| `src/commonTest/.../ui/gametype/GameTypeHandlerTest.kt` | `GameTypeHandlerTest` | Handler GameType (17 tests) |
| `src/commonTest/.../ui/scoredetail/ScoreDetailHandlerTest.kt` | `ScoreDetailHandlerTest` | Handler ScoreDetail (31 tests) |
| `src/commonTest/.../application/AddGameTypeUseCaseTest.kt` | `AddGameTypeUseCaseTest` | Use Case AddGameType (11 tests) |
| `src/commonTest/.../application/UpdateGameTypeUseCaseTest.kt` | `UpdateGameTypeUseCaseTest` | Use Case UpdateGameType (3 tests) |
| `src/commonTest/.../application/CreateMatchUseCaseTest.kt` | `CreateMatchUseCaseTest` | Use Case CreateMatch (secondaryPlayerScores) |
| `src/commonTest/.../application/DeletePlayerUseCaseTest.kt` | `DeletePlayerUseCaseTest` | Use Case DeletePlayer (5 tests) |
| `src/commonTest/.../application/GetGameTypesUseCaseTest.kt` | `GetGameTypesUseCaseTest` | Use Case GetGameTypes (2 tests) |
| `src/commonTest/.../application/GetPlayersUseCaseTest.kt` | `GetPlayersUseCaseTest` | Use Case GetPlayers (4 tests) |
| `src/commonTest/.../di/SyncDependenciesTest.kt` | `SyncDependenciesTest` | Câblage syncHandler nullable (2 tests) |
| `src/commonTest/.../domain/SerializationTest.kt` | `SerializationTest` | Sérialisation (19 tests) |
| `src/commonTest/.../ui/history/HistoryHandlerTest.kt` | `HistoryHandlerTest` | Handler History (13 tests) |
| `src/commonTest/.../application/ImportMatchesUseCaseTest.kt` | `ImportMatchesUseCaseTest` | Use Case Import |
| `src/commonTest/.../ui/stats/StatsHandlerTest.kt` | `StatsHandlerTest` | Handler Stats (6 tests) |
| `src/commonTest/.../infrastructure/InMemoryRepositoryTest.kt` | `InMemoryRepositoryTest` | Idempotence InMemory (9 tests) |
| `src/commonTest/.../infrastructure/InMemoryCloudSyncRepository.kt` | `InMemoryCloudSyncRepository` | Double de test CloudSyncRepository |
| `src/commonTest/.../infrastructure/MatchMigrationTest.kt` | `MatchMigrationTest` | Migration donnees matchs (17 tests) |
| `src/commonTest/.../application/GetHeadToHeadUseCaseEloTest.kt` | `GetHeadToHeadUseCaseEloTest` | Calcul ELO (10 tests) |
| `src/commonTest/.../application/IdGeneratorTest.kt` | `IdGeneratorTest` | IdGenerator UUID v4 (7 tests) |
| `src/commonTest/.../application/SyncUseCaseTest.kt` | `SyncUseCaseTest` | Use Case Sync (7 tests) |
| `src/commonTest/.../ui/sync/SyncHandlerTest.kt` | `SyncHandlerTest` | Handler Sync (8 tests) |
| `src/commonTest/.../application/EloCalculatorTest.kt` | `EloCalculatorTest` | Calcul ELO isole (3 tests) |
| `src/jsTest/.../ui/theme/ThemeManagerTest.kt` | `ThemeManagerTest` | Composable Theme (7 tests : localStorage, system pref, DOM) |

Tous dans `src/commonTest/` (commonTest) ou `src/jsTest/` (jsTest).

## CSS

Fichiers : `theme.css`, `layout.css`, `home.css`, `scoring.css`, `history.css`, `stats.css`, `import.css`.

Classes clés : `.home-player-card`, `.home-player-card.selected`, `.home-player-check`, `.home-add-player-toggle`, `.home-add-player-form`, `.fab-disabled`, `.fab-error`, `.btn-danger`, `.btn-danger-filled`, `.modal-body`, `.card-selected`, `.detail-row`, `.detail-label`, `.detail-value`, `.badge-warn`, `.tie-break-info`, `.theme-toggle-btn`, `.splash`, `.splash-content`, `.spinner`, `.onboarding-guide`.

Thème : variables CSS dans `:root` (light) et `[data-theme="dark"]` (dark) dans `theme.css`. Attribut `data-theme="dark"` sur `<html>` géré par `ThemeManager`.

## localStorage Keys

| Key | Contenu |
|---|---|
| `scoreo_players` | JSON `List<Player>` |
| `scoreo_gametypes` | JSON `List<GameType>` |
| `scoreo_matches` | JSON `List<Match>` |
| `scoreo_sync_config` | JSON `SyncConfig` (email, lastSyncTimestamp, lastSyncFileId) |
| `scoreo_theme` | `"dark"` ou `"light"` (mode sombre, optionnel) |
