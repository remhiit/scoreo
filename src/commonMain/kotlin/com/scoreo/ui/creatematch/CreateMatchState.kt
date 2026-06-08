package com.scoreo.ui.creatematch

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.WinCondition

data class CreateMatchState(
    val availableGameTypes: List<GameType> = emptyList(),
    val availablePlayers: List<Player> = emptyList(),
    val selectedGameType: GameType? = null,
    val selectedPlayers: List<Player> = emptyList(),
    val error: String? = null,
    // Inline game type form
    val showAddGameForm: Boolean = false,
    val inlineGameName: String = "",
    val inlineGameWinCondition: WinCondition = WinCondition.HIGHEST_SCORE,
    val inlineGameError: String? = null,
    // Inline player form
    val showAddPlayerForm: Boolean = false,
    val inlinePlayerName: String = "",
    val inlinePlayerError: String? = null,
)
