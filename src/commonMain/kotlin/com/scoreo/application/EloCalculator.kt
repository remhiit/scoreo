package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import kotlin.math.pow
import kotlin.math.roundToInt

private const val K = 32

class EloCalculator {
    fun compute(matches: List<Match>, gameTypes: Map<String, GameType>): Map<String, Int> {
        val elo = mutableMapOf<String, Int>()
        val sorted = matches.sortedBy { it.date }

        for (match in sorted) {
            val gt = gameTypes[match.gameTypeId] ?: continue
            val winners = match.getWinners(gt).toSet()
            if (winners.isEmpty()) continue
            val participants = match.playerScores.map { it.playerId }
            val preElo = elo.toMap()
            val kNorm = K.toDouble() / (participants.size - 1)
            val deltas = mutableMapOf<String, Int>()

            for (winner in winners) {
                for (loser in participants) {
                    if (loser in winners) continue
                    val rW = preElo[winner] ?: 1200
                    val rL = preElo[loser] ?: 1200
                    val eW = 1.0 / (1.0 + 10.0.pow((rL - rW) / 400.0))
                    val eL = 1.0 / (1.0 + 10.0.pow((rW - rL) / 400.0))
                    deltas[winner] = (deltas[winner] ?: 0) + (kNorm * (1.0 - eW)).roundToInt()
                    deltas[loser] = (deltas[loser] ?: 0) + (kNorm * (0.0 - eL)).roundToInt()
                }
            }
            for ((pid, d) in deltas) {
                elo[pid] = (preElo[pid] ?: 1200) + d
            }
        }

        return elo
    }
}
