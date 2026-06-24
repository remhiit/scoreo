package com.scoreo.ui.gametype

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition

sealed class GameTypeIntent {
    data class UpdateName(val name: String) : GameTypeIntent()
    data class SelectWinCondition(val winCondition: WinCondition) : GameTypeIntent()
    data class UpdateTieBreakRule(val rule: TieBreakRule) : GameTypeIntent()
    data class UpdateTieBreakCondition(val condition: WinCondition) : GameTypeIntent()
    data class UpdateTieBreakLabel(val label: String) : GameTypeIntent()
    data class SelectGame(val id: String) : GameTypeIntent()
    data object DeselectGame : GameTypeIntent()
    data object AddGameType : GameTypeIntent()
    data class EditGameType(val id: String) : GameTypeIntent()
    data object CancelEdit : GameTypeIntent()
    data class UpdateGameType(val gameType: GameType) : GameTypeIntent()
    data class ShowArchiveConfirm(val gameTypeId: String) : GameTypeIntent()
    data class ArchiveGameType(val gameTypeId: String) : GameTypeIntent()
    data object DismissArchiveConfirm : GameTypeIntent()
}
