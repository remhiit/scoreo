package com.scoreo.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.browser.window

sealed class Screen {
    data object Home : Screen()
    data object History : Screen()
    data object Import : Screen()
    data object Stats : Screen()
    data object Games : Screen()
    data object Sync : Screen()
    data class ScoreDetail(val gameTypeId: String, val playerIds: List<String>) : Screen()
}

class AppNavigator {
    var current by mutableStateOf(restoreFromHash())
        private set

    init {
        window.onpopstate = { current = restoreFromHash() }
    }

    fun navigate(screen: Screen) {
        window.history.pushState(null, "", toHash(screen))
        current = screen
    }

    private fun toHash(screen: Screen): String = when (screen) {
        is Screen.Home -> "#/"
        is Screen.History -> "#/history"
        is Screen.Stats -> "#/stats"
        is Screen.Import -> "#/import"
        is Screen.Games -> "#/games"
        is Screen.Sync -> "#/sync"
        is Screen.ScoreDetail -> "#/score/${screen.gameTypeId}/${screen.playerIds.joinToString(",")}"
    }

    private fun restoreFromHash(): Screen {
        val hash = window.location.hash.removePrefix("#")
        val parts = hash.trimStart('/').split("/").filter { it.isNotEmpty() }
        return when (parts.firstOrNull()) {
            "history" -> Screen.History
            "stats" -> Screen.Stats
            "import" -> Screen.Import
            "games" -> Screen.Games
            "sync" -> Screen.Sync
            "score" -> if (parts.size >= 3) {
                Screen.ScoreDetail(parts[1], parts[2].split(","))
            } else Screen.Home
            else -> Screen.Home
        }
    }
}
