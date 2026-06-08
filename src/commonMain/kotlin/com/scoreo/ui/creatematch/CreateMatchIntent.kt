package com.scoreo.ui.creatematch

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.WinCondition

sealed class CreateMatchIntent {
    data class SelectGameType(val gameType: GameType) : CreateMatchIntent()
    data class TogglePlayer(val player: Player) : CreateMatchIntent()
    // Inline game type form
    data object ToggleAddGameForm : CreateMatchIntent()
    data class UpdateInlineGameName(val name: String) : CreateMatchIntent()
    data class SelectInlineGameWinCondition(val winCondition: WinCondition) : CreateMatchIntent()
    data object AddInlineGameType : CreateMatchIntent()
    // Inline player form
    data object ToggleAddPlayerForm : CreateMatchIntent()
    data class UpdateInlinePlayerName(val name: String) : CreateMatchIntent()
    data object AddInlinePlayer : CreateMatchIntent()
}
