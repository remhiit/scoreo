package com.scoreo.application

import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository

data class PlayerStats(
    val playerId: String,
    val wins: Int,
    val losses: Int,
)

class GetPlayerStatsUseCase(
    private val matchRepository: MatchRepository,
    private val gameTypeRepository: GameTypeRepository,
) {
    operator fun invoke(): Map<String, PlayerStats> {
        val stats = mutableMapOf<String, PlayerStats>()

        matchRepository.getAll().forEach { match ->
            val gameType = gameTypeRepository.findById(match.gameTypeId) ?: return@forEach
            val winners = match.getWinners(gameType).toSet()

            match.playerScores.forEach { ps ->
                val current = stats[ps.playerId] ?: PlayerStats(ps.playerId, 0, 0)
                stats[ps.playerId] = if (ps.playerId in winners) {
                    current.copy(wins = current.wins + 1)
                } else {
                    current.copy(losses = current.losses + 1)
                }
            }
        }
        return stats
    }
}
