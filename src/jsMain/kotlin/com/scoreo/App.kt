package com.scoreo

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.di.createAppDependencies
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository

import com.scoreo.ui.gametype.GameTypeScreen
import com.scoreo.ui.history.HistoryIntent
import com.scoreo.ui.history.HistoryScreen
import com.scoreo.ui.home.HomeScreen
import com.scoreo.ui.navigation.Screen
import com.scoreo.ui.import.ImportScreen
import com.scoreo.ui.scoredetail.ScoreDetailHandler
import com.scoreo.ui.scoredetail.ScoreDetailScreen
import com.scoreo.ui.stats.StatsScreen
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
    val deps = remember { createAppDependencies(playerRepository, gameTypeRepository, matchRepository, currentDate) }
    val navigator = deps.navigator
    var burgerOpen by remember { mutableStateOf(false) }

    val screenTitle = when (navigator.current) {
        is Screen.Home -> "Scoreo"
        is Screen.History -> "History"
        is Screen.Import -> "Import"
        is Screen.Stats -> "Stats"
        is Screen.Games -> "Games"
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
                playerHandler = deps.playerHandler,
                getGameTypes = { deps.getGameTypesUseCase() },
                onAddGameType = { name, wc -> deps.addGameTypeUseCase(name, wc) },
                onStartGame = { gameTypeId, playerIds ->
                    navigator.navigate(Screen.ScoreDetail(gameTypeId, playerIds))
                },
            )
            is Screen.History -> {
                LaunchedEffect(navigator.current) { deps.historyHandler.handle(HistoryIntent.Refresh) }
                HistoryScreen(deps.historyHandler)
            }
            is Screen.Stats -> {
                LaunchedEffect(navigator.current) { deps.statsHandler.refresh() }
                StatsScreen(deps.statsHandler)
            }
            is Screen.Import -> {
                ImportScreen(
                    handler = deps.importHandler,
                    onDone = {
                        deps.playerHandler.refresh()
                        deps.gameTypeHandler.refresh()
                        navigator.navigate(Screen.Home)
                    },
                )
            }
            is Screen.Games -> GameTypeScreen(deps.gameTypeHandler, showTitle = true)
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
                        deps.playerHandler.refresh()
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
            BurgerItem("📊", "Stats") {
                burgerOpen = false
                navigator.navigate(Screen.Stats)
            }
            BurgerItem("📋", "History") {
                burgerOpen = false
                navigator.navigate(Screen.History)
            }
            BurgerItem("📥", "Import") {
                burgerOpen = false
                navigator.navigate(Screen.Import)
            }
            BurgerItem("🎮", "Games") {
                burgerOpen = false
                navigator.navigate(Screen.Games)
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
