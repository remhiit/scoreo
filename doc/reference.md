# Reference — pour le LLM

Tableaux exhaustifs. Lire en priorité avant d'explorer `src/`.

## Handlers (MVI)

| Handler | Intent | Intent subclasses | State | Fichier handler |
|---|---|---|---|---|
| `PlayerHandler` | `PlayerIntent` | `UpdateInput(name: String)`, `AddPlayer`, `DeletePlayer(id, anonymize)`, `ShowDeleteConfirm(id)`, `DismissDeleteConfirm` | `PlayerState` | `src/commonMain/.../ui/player/PlayerHandler.kt` |
| `GameTypeHandler` | `GameTypeIntent` | `UpdateName(name: String)`, `SelectWinCondition(winCondition: WinCondition)`, `AddGameType` | `GameTypeState` | `src/commonMain/.../ui/gametype/GameTypeHandler.kt` |
| `ImportHandler` | `ImportIntent` | `FileLoaded(content: String)`, `Execute`, `Reset` | `ImportState(step: ImportStep, preview, jsonContent, result, error)` | `src/commonMain/.../ui/import/ImportHandler.kt` |
| `ScoreDetailHandler` | `ScoreDetailIntent` | `UpdateScore(roundIndex, playerId, value)`, `AddRound`, `RemoveRound(index)`, `Terminate`, `ConfirmWinners`, `DismissModal`, `ToggleModalWinner(playerId)` | `ScoreDetailState` | `src/commonMain/.../ui/scoredetail/ScoreDetailHandler.kt` |
| `StatsHandler` | `StatsIntent` | `SelectPlayer(playerId: String)`, `BackToLeaderboard`, `SelectGameType(gameTypeId: String?)` | `StatsState(leaderboard, selectedPlayerId, gameTypes, selectedGameTypeId)` | `src/commonMain/.../ui/stats/StatsHandler.kt` |
| `HistoryHandler` | `HistoryIntent` | `Refresh` | `HistoryState(displays: List<MatchDisplay>)` | `src/commonMain/.../ui/history/HistoryHandler.kt` |
| `SyncHandler` | `SyncIntent` | `Login`, `Logout`, `ResolveConflict(keepLocal: Boolean)`, `DismissError` | `SyncState(phase, email, conflict, result, error)` | `src/commonMain/.../ui/sync/SyncHandler.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Use Cases

| Use Case | Méthode | Retour | Fichier |
|---|---|---|---|
| `AddPlayerUseCase` | `invoke(name: String)` | `Player` | `src/commonMain/.../application/AddPlayerUseCase.kt` |
| `AddGameTypeUseCase` | `invoke(name: String, winCondition: WinCondition)` | `GameType` | `src/commonMain/.../application/AddGameTypeUseCase.kt` |
| `CreateMatchUseCase` | `invoke(gameTypeId: String, playerScores: List<PlayerScore>, date: Long, manualWinners: List<String>)` | `Match` | `src/commonMain/.../application/CreateMatchUseCase.kt` |
| `DeletePlayerUseCase` | `invoke(id: String, anonymize: Boolean = false)` | `Unit` | `src/commonMain/.../application/DeletePlayerUseCase.kt` |
| `GetPlayersUseCase` | `invoke(includeInactive: Boolean = false)` | `List<Player>` | `src/commonMain/.../application/GetPlayersUseCase.kt` |
| `GetPlayerStatsUseCase` | `invoke()` | `Map<String, PlayerStats>` | `src/commonMain/.../application/GetPlayerStatsUseCase.kt` |
| `GetHeadToHeadUseCase` | `invoke(gameTypeId: String? = null)` | `List<PlayerDetail>` | `src/commonMain/.../application/GetHeadToHeadUseCase.kt` |
| `EloCalculator` | `compute(matches, gameTypes)` | `Map<String, Int>` | `src/commonMain/.../application/EloCalculator.kt` |
| `GetGameTypesUseCase` | `invoke()` | `List<GameType>` | `src/commonMain/.../application/GetGameTypesUseCase.kt` |
| `GetMatchesUseCase` | `invoke()` | `List<Match>` | `src/commonMain/.../application/GetMatchesUseCase.kt` |
| `ImportMatchesUseCase` | `preview(jsonString: String)`, `execute(jsonString: String)` | `Result<ImportPreview>`, `Result<ImportResult>` | `src/commonMain/.../application/ImportMatchesUseCase.kt` |
| `SyncUseCase` | `autoSync()` | `SyncOutcome` | `src/commonMain/.../application/SyncUseCase.kt` |
| `SyncUseCase` | `resolveConflict(keepLocal: Boolean)` | `SyncResult` | `src/commonMain/.../application/SyncUseCase.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Domain Models

| Model | Champs | Fichier |
|---|---|---|
| `Player` | `id: String`, `name: String`, `active: Boolean = true` | `src/commonMain/.../domain/model/Player.kt` |
| `GameType` | `id: String`, `name: String`, `winCondition: WinCondition` | `src/commonMain/.../domain/model/GameType.kt` |
| `Match` | `id: String`, `date: Long`, `gameTypeId: String`, `playerScores: List<PlayerScore>`, `manualWinners: List<String>` | `src/commonMain/.../domain/model/Match.kt` |
| `PlayerScore` | `playerId: String`, `score: Int` | `src/commonMain/.../domain/model/PlayerScore.kt` |
| `WinCondition` | enum: `HIGHEST_SCORE`, `LOWEST_SCORE`, `MANUAL` | `src/commonMain/.../domain/model/WinCondition.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Ports (Repository Interfaces)

| Interface | Méthodes | Fichier |
|---|---|---|
| `PlayerRepository` | `getAll(includeInactive: Boolean = false): List<Player>`, `save(player: Player)`, `delete(id: String, anonymize: Boolean = false)` | `src/commonMain/.../domain/port/PlayerRepository.kt` |
| `GameTypeRepository` | `getAll(): List<GameType>`, `save(gameType: GameType)`, `findById(id: String): GameType?` | `src/commonMain/.../domain/port/GameTypeRepository.kt` |
| `MatchRepository` | `getAll(): List<Match>`, `save(match: Match)`, `findById(id: String): Match?` | `src/commonMain/.../domain/port/MatchRepository.kt` |
| `CloudSyncRepository` | `push(data: SyncData)`, `pull(): SyncData`, `getStatus(): SyncStatus`, `login()`, `logout()` | `src/commonMain/.../domain/port/CloudSyncRepository.kt` |

Tous dans `src/commonMain/kotlin/com/scoreo/`.

## Adapters (Implémentations)

| Classe | Implémente | Stockage | Fichier |
|---|---|---|---|
| `LocalStoragePlayerRepository` | `PlayerRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStoragePlayerRepository.kt` |
| `LocalStorageGameTypeRepository` | `GameTypeRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStorageGameTypeRepository.kt` |
| `LocalStorageMatchRepository` | `MatchRepository` | localStorage | `src/jsMain/.../infrastructure/LocalStorageMatchRepository.kt` |
| `GoogleDriveSyncAdapter` | `CloudSyncRepository` | Google Drive App Data Folder | `src/jsMain/.../infrastructure/google/GoogleDriveSyncAdapter.kt` |
| `InMemoryCloudSyncRepository` | `CloudSyncRepository` | mémoire (tests) | `src/commonTest/.../infrastructure/InMemoryCloudSyncRepository.kt` |
| `InMemoryPlayerRepository` | `PlayerRepository` | mémoire (tests) | `src/jsMain/.../infrastructure/InMemoryPlayerRepository.kt` |
| `InMemoryGameTypeRepository` | `GameTypeRepository` | mémoire (tests) | `src/jsMain/.../infrastructure/InMemoryGameTypeRepository.kt` |
| `InMemoryMatchRepository` | `MatchRepository` | mémoire (tests) | `src/jsMain/.../infrastructure/InMemoryMatchRepository.kt` |
| `MatchMigration` | — (utilitaire) | `migrateMatchesJson()` | `src/commonMain/.../infrastructure/MatchMigration.kt` |

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
| `src/commonTest/.../ui/gametype/GameTypeHandlerTest.kt` | `GameTypeHandlerTest` | Handler GameType |
| `src/commonTest/.../ui/scoredetail/ScoreDetailHandlerTest.kt` | `ScoreDetailHandlerTest` | Handler ScoreDetail (17 tests) |
| `src/commonTest/.../application/AddPlayerUseCaseTest.kt` | `AddPlayerUseCaseTest` | Use Case AddPlayer |
| `src/commonTest/.../application/AddGameTypeUseCaseTest.kt` | `AddGameTypeUseCaseTest` | Use Case AddGameType (6 tests) |
| `src/commonTest/.../application/DeletePlayerUseCaseTest.kt` | `DeletePlayerUseCaseTest` | Use Case DeletePlayer (5 tests) |
| `src/commonTest/.../application/GetGameTypesUseCaseTest.kt` | `GetGameTypesUseCaseTest` | Use Case GetGameTypes (2 tests) |
| `src/commonTest/.../application/GetPlayersUseCaseTest.kt` | `GetPlayersUseCaseTest` | Use Case GetPlayers (4 tests) |
| `src/commonTest/.../domain/SerializationTest.kt` | `SerializationTest` | Sérialisation (11 tests) |
| `src/commonTest/.../ui/history/HistoryHandlerTest.kt` | `HistoryHandlerTest` | Handler History (10 tests) |
| `src/commonTest/.../application/ImportMatchesUseCaseTest.kt` | `ImportMatchesUseCaseTest` | Use Case Import |
| `src/commonTest/.../ui/stats/StatsHandlerTest.kt` | `StatsHandlerTest` | Handler Stats (6 tests) |
| `src/commonTest/.../infrastructure/InMemoryRepositoryTest.kt` | `InMemoryRepositoryTest` | Idempotence InMemory (9 tests) |
| `src/commonTest/.../infrastructure/InMemoryCloudSyncRepository.kt` | `InMemoryCloudSyncRepository` | Double de test CloudSyncRepository |

Tous dans `src/commonTest/kotlin/com/scoreo/`.

## CSS

Fichier : `src/jsMain/resources/styles.css`.

Classes clés : `.home-player-card`, `.home-player-card.selected`, `.home-player-check`, `.home-add-player-toggle`, `.home-add-player-form`, `.fab-disabled`, `.fab-error`, `.btn-danger`, `.btn-danger-filled`, `.modal-body`.

## localStorage Keys

| Key | Contenu |
|---|---|
| `scoreo_players` | JSON `List<Player>` |
| `scoreo_gametypes` | JSON `List<GameType>` |
| `scoreo_matches` | JSON `List<Match>` |
| `scoreo_sync_config` | JSON `SyncConfig` (email, lastSyncTimestamp, lastSyncFileId) |
