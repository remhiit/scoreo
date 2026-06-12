package com.scoreo.ui.stats

import com.scoreo.application.PlayerDetail
import com.scoreo.domain.model.GameType

data class StatsState(
    val leaderboard: List<PlayerDetail> = emptyList(),
    val selectedPlayerId: String? = null,
    val gameTypes: List<GameType> = emptyList(),
    val selectedGameTypeId: String? = null,
) {
    val selectedPlayer: PlayerDetail?
        get() = selectedPlayerId?.let { id -> leaderboard.find { it.playerId == id } }
}
