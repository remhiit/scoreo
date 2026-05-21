package com.scoreo.ui.gametype

import com.scoreo.domain.model.WinCondition

sealed class GameTypeIntent {
    data class UpdateName(val name: String) : GameTypeIntent()
    data class SelectWinCondition(val winCondition: WinCondition) : GameTypeIntent()
    data object AddGameType : GameTypeIntent()
}
