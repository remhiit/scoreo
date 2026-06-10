package com.scoreo

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.application.DeletePlayerUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.application.ImportMatchesUseCase
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository

import com.scoreo.ui.gametype.GameTypeHandler
import com.scoreo.ui.history.HistoryHandler
import com.scoreo.ui.history.HistoryScreen
import com.scoreo.ui.home.HomeScreen
import com.scoreo.ui.navigation.AppNavigator
import com.scoreo.ui.navigation.Screen
import com.scoreo.ui.navigation.SetupSection
import com.scoreo.ui.player.PlayerHandler
import com.scoreo.ui.import.ImportHandler
import com.scoreo.ui.import.ImportScreen
import com.scoreo.ui.scoredetail.ScoreDetailHandler
import com.scoreo.ui.scoredetail.ScoreDetailScreen
import com.scoreo.ui.setup.SetupScreen
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun App(
    playerRepository: PlayerRepository,
    gameTypeRepository: GameTypeRepository,
    matchRepository: MatchRepository,
    currentDate: () -> Long,
) {
    val navigator = remember { AppNavigator() }
    var burgerOpen by remember { mutableStateOf(false) }

    val playerHandler = remember {
        PlayerHandler(
            addPlayer = AddPlayerUseCase(playerRepository),
            getPlayers = GetPlayersUseCase(playerRepository),
            getPlayerStats = GetPlayerStatsUseCase(matchRepository, gameTypeRepository),
            deletePlayer = DeletePlayerUseCase(playerRepository),
        )
    }
    val gameTypeHandler = remember {
        GameTypeHandler(
            addGameType = AddGameTypeUseCase(gameTypeRepository),
            getGameTypes = GetGameTypesUseCase(gameTypeRepository),
        )
    }
    val getGameTypesUseCase = remember { GetGameTypesUseCase(gameTypeRepository) }
    val addGameTypeUseCase = remember { AddGameTypeUseCase(gameTypeRepository) }
    val addPlayerUseCase = remember { AddPlayerUseCase(playerRepository) }

    val screenTitle = when (navigator.current) {
        is Screen.Home -> "Scoreo"
        is Screen.History -> "History"
        is Screen.Import -> "Import"
        is Screen.Setup -> "Setup"
        is Screen.ScoreDetail -> "Score Detail"
    }
    val canGoBack = navigator.current !is Screen.Home

    // ── App header ────────────────────────────────────────────
    Div(attrs = { classes("app-header") }) {
        if (canGoBack) {
            Button(attrs = {
                classes("back-btn")
                onClick { navigator.navigate(Screen.Home) }
            }) { Text("←") }
        } else {
            Div(attrs = { classes("header-spacer") }) {}
        }
        Span(attrs = { classes("header-title") }) { Text(screenTitle) }
        Button(attrs = {
            classes("burger-btn")
            onClick { burgerOpen = true }
        }) { Text("☰") }
    }

    // ── Screen content ────────────────────────────────────────
    Div(attrs = { classes("app-content") }) {
        when (val screen = navigator.current) {
            is Screen.Home -> HomeScreen(
                playerHandler = playerHandler,
                getGameTypes = { getGameTypesUseCase() },
                onAddGameType = { name, wc -> addGameTypeUseCase(name, wc) },
                onAddPlayer = { name ->
                    val player = addPlayerUseCase(name)
                    playerHandler.refresh()
                    player
                },
                onStartGame = { gameTypeId, playerIds ->
                    navigator.navigate(Screen.ScoreDetail(gameTypeId, playerIds))
                },
                onConfigurePlayers = {
                    navigator.navigate(Screen.Setup(SetupSection.PLAYERS))
                },
            )
            is Screen.History -> {
                val historyHandler = remember(navigator.current) {
                    HistoryHandler(
                        getMatches = GetMatchesUseCase(matchRepository),
                        getPlayers = GetPlayersUseCase(playerRepository),
                        getGameTypes = GetGameTypesUseCase(gameTypeRepository),
                    )
                }
                LaunchedEffect(navigator.current) { historyHandler.refresh() }
                HistoryScreen(historyHandler)
            }
            is Screen.Import -> {
                val importHandler = remember {
                    ImportHandler(
                        importUseCase = ImportMatchesUseCase(
                            playerRepository = playerRepository,
                            gameTypeRepository = gameTypeRepository,
                            matchRepository = matchRepository,
                            currentDate = currentDate,
                        ),
                    )
                }
                ImportScreen(
                    handler = importHandler,
                    onDone = {
                        playerHandler.refresh()
                        gameTypeHandler.refresh()
                        navigator.navigate(Screen.Home)
                    },
                )
            }
            is Screen.Setup -> SetupScreen(
                playerHandler = playerHandler,
                gameTypeHandler = gameTypeHandler,
                focusSection = screen.focusSection,
            )
            is Screen.ScoreDetail -> {
                val scoreDetailHandler = remember(screen) {
                    val gameType = gameTypeRepository.findById(screen.gameTypeId)
                        ?: error("GameType not found")
                    val players = playerRepository.getAll().filter { it.id in screen.playerIds }
                    ScoreDetailHandler(
                        gameType = gameType,
                        players = players,
                        createMatch = CreateMatchUseCase(matchRepository, gameTypeRepository),
                        currentDate = currentDate,
                    )
                }
                ScoreDetailScreen(
                    handler = scoreDetailHandler,
                    onSaved = {
                        playerHandler.refresh()
                        navigator.navigate(Screen.Home)
                    },
                    onCancel = {
                        navigator.navigate(Screen.Home)
                    },
                )
            }
        }
    }

    // ── Burger menu ───────────────────────────────────────────
    if (burgerOpen) {
        Div(attrs = {
            classes("burger-overlay")
            onClick { burgerOpen = false }
        }) {}
        Div(attrs = { classes("burger-menu") }) {
            Button(attrs = {
                classes("burger-close")
                onClick { burgerOpen = false }
            }) { Text("✕") }
            BurgerItem("📋", "History") {
                burgerOpen = false
                navigator.navigate(Screen.History)
            }
            BurgerItem("📥", "Import") {
                burgerOpen = false
                navigator.navigate(Screen.Import)
            }
            BurgerItem("👤", "Players") {
                burgerOpen = false
                navigator.navigate(Screen.Setup(SetupSection.PLAYERS))
            }
            BurgerItem("🎮", "Games") {
                burgerOpen = false
                navigator.navigate(Screen.Setup(SetupSection.GAME_TYPES))
            }
        }
    }
}

@Composable
private fun BurgerItem(icon: String, label: String, onClick: () -> Unit) {
    Button(attrs = {
        classes("burger-item")
        onClick { onClick() }
    }) {
        Span(attrs = { classes("burger-item-icon") }) { Text(icon) }
        Span { Text(label) }
    }
}

