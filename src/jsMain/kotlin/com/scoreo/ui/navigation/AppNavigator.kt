package com.scoreo.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import kotlinx.browser.window

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
        is Screen.ScoreDetail -> {
            val route = "#/score/${screen.gameTypeId}/${screen.playerIds.joinToString(",")}"
            if (screen.matchId != null) {
                "$route/${screen.matchId}"
            } else {
                route
            }
        }
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
                val gameTypeId = parts[1]
                val playersCsv = parts[2]
                val matchId = parts.getOrNull(3)  // optional fourth part (index 3)
                val playerIds = playersCsv.split(",").filter { it.isNotEmpty() }
                Screen.ScoreDetail(gameTypeId, playerIds, matchId)
            } else Screen.Home
            else -> Screen.Home
        }
    }
}
