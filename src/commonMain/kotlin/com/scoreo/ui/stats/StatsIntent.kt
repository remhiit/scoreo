package com.scoreo.ui.stats

sealed class StatsIntent {
    data class SelectPlayer(val playerId: String) : StatsIntent()
    data object BackToLeaderboard : StatsIntent()
}
