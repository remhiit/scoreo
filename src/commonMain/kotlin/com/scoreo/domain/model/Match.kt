package com.scoreo.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class Match(
    val id: String,
    val date: String,
    val gameTypeId: String,
    val playerScores: List<PlayerScore>,
    val manualWinners: List<String> = emptyList(),
) {
    fun getWinners(gameType: GameType): List<String> =
        if (gameType.winCondition == WinCondition.MANUAL) manualWinners
        else gameType.computeWinners(playerScores)
}
