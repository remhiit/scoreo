package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Match(
    val id: String,
    val date: Long,
    val gameTypeId: String,
    val playerScores: List<PlayerScore>,
    val manualWinners: List<String> = emptyList(),
    val secondaryPlayerScores: List<PlayerScore> = emptyList(),
) {
    fun getWinners(gameType: GameType): List<String> =
        if (gameType.winCondition == WinCondition.MANUAL) manualWinners
        else gameType.computeWinners(playerScores)
}
