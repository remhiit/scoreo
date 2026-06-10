package com.scoreo.ui.stats

import com.scoreo.application.PlayerDetail

data class StatsState(
    val leaderboard: List<PlayerDetail> = emptyList(),
    val selectedPlayerId: String? = null,
) {
    val selectedPlayer: PlayerDetail?
        get() = selectedPlayerId?.let { id -> leaderboard.find { it.playerId == id } }
}
