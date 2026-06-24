package com.scoreo.di

import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.ArchiveGameTypeUseCase
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.application.DeleteMatchUseCase
import com.scoreo.application.DeletePlayerUseCase
import com.scoreo.application.FindGameTypeByIdUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetHeadToHeadUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.application.ImportMatchesUseCase
import com.scoreo.application.RenamePlayerUseCase
import com.scoreo.application.UpdateGameTypeUseCase
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository
import com.scoreo.domain.port.CloudSyncRepository
import com.scoreo.ui.gametype.GameTypeHandler
import com.scoreo.ui.history.HistoryHandler
import com.scoreo.ui.import.ImportHandler
import com.scoreo.ui.navigation.AppNavigator
import com.scoreo.ui.player.PlayerHandler
import com.scoreo.ui.stats.StatsHandler
import com.scoreo.ui.sync.SyncHandler


data class AppDependencies(
    val playerHandler: PlayerHandler,
    val gameTypeHandler: GameTypeHandler,
    val historyHandler: HistoryHandler,
    val statsHandler: StatsHandler,
    val importHandler: ImportHandler,
    val syncHandler: SyncHandler?,
    val getGameTypesUseCase: GetGameTypesUseCase,
    val addGameTypeUseCase: AddGameTypeUseCase,
    val navigator: AppNavigator,
)

fun createAppDependencies(
    playerRepository: PlayerRepository,
    gameTypeRepository: GameTypeRepository,
    matchRepository: MatchRepository,
    currentDate: () -> Long,
    cloudSyncRepository: CloudSyncRepository? = null,
): AppDependencies {
    val navigator = AppNavigator()

    val playerHandler = PlayerHandler(
        addPlayer = AddPlayerUseCase(playerRepository),
        getPlayers = GetPlayersUseCase(playerRepository),
        getPlayerStats = GetPlayerStatsUseCase(matchRepository, gameTypeRepository),
        deletePlayer = DeletePlayerUseCase(playerRepository),
        renamePlayerUseCase = RenamePlayerUseCase(playerRepository),
    )

    val gameTypeHandler = GameTypeHandler(
        addGameType = AddGameTypeUseCase(gameTypeRepository),
        updateGameType = UpdateGameTypeUseCase(gameTypeRepository),
        getGameTypes = GetGameTypesUseCase(gameTypeRepository),
        findGameTypeById = FindGameTypeByIdUseCase(gameTypeRepository),
        archiveGameType = ArchiveGameTypeUseCase(gameTypeRepository),
    )

    val getGameTypesUseCase = GetGameTypesUseCase(gameTypeRepository)
    val addGameTypeUseCase = AddGameTypeUseCase(gameTypeRepository)

    val getHeadToHeadUseCase = GetHeadToHeadUseCase(
        matchRepository = matchRepository,
        gameTypeRepository = gameTypeRepository,
        playerRepository = playerRepository,
    )

    val historyHandler = HistoryHandler(
        getMatches = GetMatchesUseCase(matchRepository),
        getPlayers = GetPlayersUseCase(playerRepository),
        getGameTypes = GetGameTypesUseCase(gameTypeRepository),
        deleteMatchUseCase = DeleteMatchUseCase(matchRepository),
    )

    val statsHandler = StatsHandler(
        getHeadToHead = getHeadToHeadUseCase,
        getGameTypes = GetGameTypesUseCase(gameTypeRepository),
    )

    val importHandler = ImportHandler(
        importUseCase = ImportMatchesUseCase(
            playerRepository = playerRepository,
            gameTypeRepository = gameTypeRepository,
            matchRepository = matchRepository,
            currentDate = currentDate,
        ),
    )

    val syncHandler = createSyncHandlerIfAvailable(cloudSyncRepository, playerRepository, gameTypeRepository, matchRepository)

    return AppDependencies(
        playerHandler = playerHandler,
        gameTypeHandler = gameTypeHandler,
        historyHandler = historyHandler,
        statsHandler = statsHandler,
        importHandler = importHandler,
        syncHandler = syncHandler,
        getGameTypesUseCase = getGameTypesUseCase,
        addGameTypeUseCase = addGameTypeUseCase,
        navigator = navigator,
    )
}
