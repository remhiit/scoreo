package com.scoreo.ui.creatematch

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player

sealed class CreateMatchIntent {
    data class SelectGameType(val gameType: GameType) : CreateMatchIntent()
    data class TogglePlayer(val player: Player) : CreateMatchIntent()
    data class UpdateScore(val playerId: String, val score: String) : CreateMatchIntent()
    data class UpdateManualWinner(val playerId: String, val isWinner: Boolean) : CreateMatchIntent()
    data object SaveMatch : CreateMatchIntent()
}
