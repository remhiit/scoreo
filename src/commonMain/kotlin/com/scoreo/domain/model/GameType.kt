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
    val active: Boolean = true,
) {
    fun computeWinners(playerScores: List<PlayerScore>): List<String> =
        computeWinners(playerScores, winCondition)

    fun computeWinners(playerScores: List<PlayerScore>, condition: WinCondition): List<String> {
        if (playerScores.isEmpty()) return emptyList()
        return when (condition) {
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
