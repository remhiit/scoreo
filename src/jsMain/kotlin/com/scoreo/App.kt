package com.scoreo

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository
import com.scoreo.ui.creatematch.CreateMatchHandler
import com.scoreo.ui.creatematch.CreateMatchScreen
import com.scoreo.ui.gametype.GameTypeHandler
import com.scoreo.ui.history.HistoryHandler
import com.scoreo.ui.history.HistoryScreen
import com.scoreo.ui.navigation.AppNavigator
import com.scoreo.ui.navigation.Screen
import com.scoreo.ui.player.PlayerHandler
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
    currentDate: () -> String,
) {
    val navigator = remember { AppNavigator() }

    val playerHandler = remember {
        PlayerHandler(
            addPlayer = AddPlayerUseCase(playerRepository),
            getPlayers = GetPlayersUseCase(playerRepository),
            getPlayerStats = GetPlayerStatsUseCase(matchRepository, gameTypeRepository),
        )
    }
    val gameTypeHandler = remember {
        GameTypeHandler(
            addGameType = AddGameTypeUseCase(gameTypeRepository),
            getGameTypes = GetGameTypesUseCase(gameTypeRepository),
        )
    }
    val createMatchHandler = remember {
        CreateMatchHandler(
            getPlayers = GetPlayersUseCase(playerRepository),
            getGameTypes = GetGameTypesUseCase(gameTypeRepository),
            createMatch = CreateMatchUseCase(matchRepository, gameTypeRepository),
            addPlayer = AddPlayerUseCase(playerRepository),
            addGameType = AddGameTypeUseCase(gameTypeRepository),
            currentDate = currentDate,
        )
    }

    Div(attrs = { classes("app-content") }) {
        when (val screen = navigator.current) {
            is Screen.CreateMatch -> CreateMatchScreen(
                handler = createMatchHandler,
                onSaved = {
                    playerHandler.refresh()
                    navigator.navigate(Screen.History)
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
                HistoryScreen(historyHandler)
            }
            is Screen.Setup -> SetupScreen(
                playerHandler = playerHandler,
                gameTypeHandler = gameTypeHandler,
                focusSection = screen.focusSection,
            )
        }
    }

    Div(attrs = { classes("bottom-nav") }) {
        NavItem("➕", "New match", navigator.current is Screen.CreateMatch) {
            createMatchHandler.refreshLists()
            navigator.navigate(Screen.CreateMatch)
        }
        NavItem("📋", "History", navigator.current is Screen.History) {
            navigator.navigate(Screen.History)
        }
        NavItem("⚙️", "Setup", navigator.current is Screen.Setup) {
            navigator.navigate(Screen.Setup())
        }
    }
}

@Composable
private fun NavItem(icon: String, label: String, active: Boolean, onClick: () -> Unit) {
    Button(attrs = {
        classes("nav-item")
        if (active) classes("active")
        onClick { onClick() }
    }) {
        Span(attrs = { classes("nav-icon") }) { Text(icon) }
        Span { Text(label) }
    }
}

