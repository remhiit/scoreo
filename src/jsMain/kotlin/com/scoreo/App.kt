package com.scoreo

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.application.UpdateMatchUseCase
import com.scoreo.di.createAppDependencies
import com.scoreo.domain.port.CloudSyncRepository
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchDraftRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository

import com.scoreo.infrastructure.LocalStorageMatchDraftRepository

import com.scoreo.ui.gametype.GameTypeScreen
import com.scoreo.ui.history.HistoryIntent
import com.scoreo.ui.history.HistoryScreen
import com.scoreo.ui.home.HomeScreen
import com.scoreo.ui.navigation.Screen
import com.scoreo.ui.import.ImportScreen
import com.scoreo.ui.sync.SyncHandler
import com.scoreo.ui.sync.SyncScreen
import com.scoreo.ui.scoredetail.ScoreDetailHandler
import com.scoreo.ui.scoredetail.ScoreDetailMode
import com.scoreo.ui.scoredetail.ScoreDetailScreen
import com.scoreo.ui.stats.StatsIntent
import com.scoreo.ui.stats.StatsScreen
import com.scoreo.ui.theme.rememberThemeState
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
    cloudSyncRepository: CloudSyncRepository? = null,
) {
    val deps = remember { createAppDependencies(playerRepository, gameTypeRepository, matchRepository, currentDate, cloudSyncRepository) }
    val navigator = deps.navigator
    var burgerOpen by remember { mutableStateOf(false) }
    val themeState = rememberThemeState()

    val screenTitle = when (val screen = navigator.current) {
        is Screen.Home -> "Scoreo"
        is Screen.History -> "History"
        is Screen.Import -> "Import"
        is Screen.Stats -> "Stats"
        is Screen.Games -> "Games"
        is Screen.Sync -> "Sync"
        is Screen.ScoreDetail -> if (screen.matchId != null) "Edit match" else "Score Detail"
    }
    // Chaque écran "sait" où mène son bouton retour. null = pas de retour (Home).
    val onBack: (() -> Unit)? = when (val screen = navigator.current) {
        is Screen.Home -> null
        is Screen.Stats ->
            if (deps.statsHandler.state.selectedPlayerId != null) {
                { deps.statsHandler.handle(StatsIntent.BackToLeaderboard) }
            } else {
                { navigator.navigate(Screen.Home) }
            }
        is Screen.ScoreDetail ->
            if (screen.matchId != null) {
                { navigator.navigate(Screen.History) }
            } else {
                { navigator.navigate(Screen.Home) }
            }
        else -> { { navigator.navigate(Screen.Home) } }
    }

    // ── App header ────────────────────────────────────────────
    Div(attrs = { classes("app-header") }) {
        onBack?.let { back ->
            Button(attrs = {
                classes("back-btn")
                onClick { back() }
            }) { Text("←") }
        }
        Button(attrs = {
            classes("theme-toggle-btn")
            onClick { themeState.toggle() }
        }) { Text(if (themeState.isDark) "☀️" else "🌙") }
        Span(attrs = {
            classes("app-title", "clickable")
            onClick {
                if (navigator.current !is Screen.Home) {
                    navigator.navigate(Screen.Home)
                }
            }
        }) { Text(screenTitle) }
        Button(attrs = {
            classes("burger-btn")
            onClick { burgerOpen = true }
        }) { Text("☰") }
    }

    // ── Screen content ────────────────────────────────────────
    Div(attrs = { classes("app-content") }) {
        when (val screen = navigator.current) {
            is Screen.Home -> {
                val matchDraftRepository = LocalStorageMatchDraftRepository()
                HomeScreen(
                    playerHandler = deps.playerHandler,
                    getGameTypes = { deps.getGameTypesUseCase() },
                    onAddGameType = { name, wc -> deps.addGameTypeUseCase(name, wc) },
                    onStartGame = { gameTypeId, playerIds ->
                        navigator.navigate(Screen.ScoreDetail(gameTypeId, playerIds))
                    },
                    matchDraftRepository = matchDraftRepository,
                    onResumeDraft = { gameTypeId, playerIds ->
                        navigator.navigate(Screen.ScoreDetail(gameTypeId, playerIds))
                    },
                    getMatchCount = { matchRepository.getAll().size },
                )
            }
            is Screen.History -> {
                LaunchedEffect(navigator.current) { deps.historyHandler.handle(HistoryIntent.Refresh) }
                HistoryScreen(deps.historyHandler, navigator)
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
            is Screen.Sync -> deps.syncHandler?.let { SyncScreen(it) }
                ?: Div(attrs = { classes("empty") }) { Text("☁ Sync not available") }
            is Screen.ScoreDetail -> {
                val gameType = remember(screen) { gameTypeRepository.findById(screen.gameTypeId) }
                if (gameType == null) {
                    // GameType deleted — redirect to Home gracefully
                    LaunchedEffect(Unit) { navigator.navigate(Screen.Home) }
                } else {
                    val scoreDetailHandler = remember(screen) {
                        val players = playerRepository.getAll().filter { it.id in screen.playerIds }
                        val matchDraftRepository = LocalStorageMatchDraftRepository()
                        val mode = if (screen.matchId != null) {
                            ScoreDetailMode.Edit(
                                matchId = screen.matchId,
                                updateMatchUseCase = UpdateMatchUseCase(matchRepository),
                                matchRepository = matchRepository,
                                playerRepository = playerRepository,
                                gameTypeRepository = gameTypeRepository,
                            )
                        } else {
                            ScoreDetailMode.Create
                        }
                        ScoreDetailHandler(
                            gameType = gameType,
                            players = players,
                            createMatch = CreateMatchUseCase(matchRepository, gameTypeRepository),
                            currentDate = currentDate,
                            mode = mode,
                            matchDraftRepository = matchDraftRepository,
                        )
                    }
                    val afterMatch = if (screen.matchId != null) Screen.History else Screen.Home
                    ScoreDetailScreen(
                        handler = scoreDetailHandler,
                        onSaved = {
                            deps.playerHandler.refresh()
                            navigator.navigate(afterMatch)
                        },
                        onCancel = {
                            navigator.navigate(afterMatch)
                        },
                    )
                }
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
            BurgerItem("🏠", "Home") {
                burgerOpen = false
                navigator.navigate(Screen.Home)
            }
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
            if (deps.syncHandler != null) {
                BurgerItem("☁", "Sync") {
                    burgerOpen = false
                    navigator.navigate(Screen.Sync)
                }
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
