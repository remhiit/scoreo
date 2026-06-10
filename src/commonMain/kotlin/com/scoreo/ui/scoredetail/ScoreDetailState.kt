package com.scoreo.ui.scoredetail

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player

data class ScoreDetailState(
    val gameType: GameType,
    val players: List<Player>,
    val rounds: List<Map<String, String>> = listOf(emptyMap()),
    val showWinnerModal: Boolean = false,
    val modalWinners: Set<String> = emptySet(),
    val error: String? = null,
    val saved: Boolean = false,
) {
    val totals: Map<String, Int>
        get() = players.associate { player ->
            player.id to rounds.sumOf { round ->
                round[player.id]?.trim()?.toIntOrNull() ?: 0
            }
        }
}
