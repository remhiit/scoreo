package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class GameType(
    val id: String,
    val name: String,
    val winCondition: WinCondition,
    val tieBreakRule: TieBreakRule = TieBreakRule.NONE,
    val tieBreakCondition: WinCondition = WinCondition.HIGHEST_SCORE,
    val tieBreakLabel: String? = null,
) {
    fun computeWinners(playerScores: List<PlayerScore>): List<String> {
        if (playerScores.isEmpty()) return emptyList()
        return when (winCondition) {
            WinCondition.HIGHEST_SCORE -> {
                val max = playerScores.maxOf { it.score }
                playerScores.filter { it.score == max }.map { it.playerId }
            }
            WinCondition.LOWEST_SCORE -> {
                val min = playerScores.minOf { it.score }
                playerScores.filter { it.score == min }.map { it.playerId }
            }
            WinCondition.MANUAL -> emptyList()
        }
    }
}
