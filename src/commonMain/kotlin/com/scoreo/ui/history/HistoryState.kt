package com.scoreo.ui.history

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player

data class MatchDisplay(
    val match: Match,
    val gameType: GameType?,
    val players: Map<String, Player>,
    val playerLabels: Map<String, String>,
    val winners: List<String>,
    val dateFormatted: String,
)

data class HistoryState(
    val displays: List<MatchDisplay> = emptyList(),
)
