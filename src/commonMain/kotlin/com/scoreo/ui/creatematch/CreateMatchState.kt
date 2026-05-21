package com.scoreo.ui.creatematch

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player

data class CreateMatchState(
    val availableGameTypes: List<GameType> = emptyList(),
    val availablePlayers: List<Player> = emptyList(),
    val selectedGameType: GameType? = null,
    val selectedPlayers: List<Player> = emptyList(),
    val scores: Map<String, String> = emptyMap(),
    val manualWinners: Set<String> = emptySet(),
    val error: String? = null,
    val saved: Boolean = false,
)
