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
    /**
     * Returns the winners of this match for the given game type.
     * Handles all three tie-break rules:
     * - NONE: all tied players are winners (equality preserved)
     * - MANUAL_SELECTION: returns [manualWinners]
     * - SECONDARY_SCORE: applies [GameType.tieBreakCondition] on [secondaryPlayerScores]
     * For historic matches where tie-break data is missing (indeterminate),
     * falls back to returning all tied players (NONE behavior).
     */
    fun getWinners(gameType: GameType): List<String> {
        if (gameType.winCondition == WinCondition.MANUAL) return manualWinners
        val primaryWinners = gameType.computeWinners(playerScores)
        if (primaryWinners.size <= 1 || gameType.tieBreakRule == TieBreakRule.NONE) return primaryWinners

        // Historic match fallback: if tie-break data is missing, return all tied
        if (isTieBreakIndeterminate(gameType)) return primaryWinners

        return when (gameType.tieBreakRule) {
            TieBreakRule.NONE -> primaryWinners
            TieBreakRule.MANUAL_SELECTION -> manualWinners
            TieBreakRule.SECONDARY_SCORE -> {
                val result = gameType.computeWinners(secondaryPlayerScores, gameType.tieBreakCondition)
                if (result.isEmpty()) primaryWinners else result
            }
        }
    }

    /**
     * Returns true if this match has a tie but lacks the data required
     * to apply the game type's tie-break rule.
     *
     * This can happen for historic matches saved before tie-break support
     * was introduced, where [manualWinners] or [secondaryPlayerScores]
     * are empty despite a tie existing.
     */
    fun isTieBreakIndeterminate(gameType: GameType): Boolean {
        if (gameType.winCondition == WinCondition.MANUAL) return false
        val winners = gameType.computeWinners(playerScores)
        if (winners.size <= 1) return false
        return when (gameType.tieBreakRule) {
            TieBreakRule.MANUAL_SELECTION -> manualWinners.isEmpty()
            TieBreakRule.SECONDARY_SCORE -> secondaryPlayerScores.isEmpty()
            TieBreakRule.NONE -> false
        }
    }
}
