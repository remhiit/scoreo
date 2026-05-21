package com.scoreo.ui.gametype

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition

data class GameTypeState(
    val gameTypes: List<GameType> = emptyList(),
    val inputName: String = "",
    val selectedWinCondition: WinCondition = WinCondition.HIGHEST_SCORE,
    val error: String? = null,
)
