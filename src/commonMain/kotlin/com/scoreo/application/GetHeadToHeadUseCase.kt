package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository

class GetHeadToHeadUseCase(
    private val matchRepository: MatchRepository,
    private val gameTypeRepository: GameTypeRepository,
    private val playerRepository: PlayerRepository,
    private val eloCalculator: EloCalculator = EloCalculator(),
) {
    operator fun invoke(gameTypeId: String? = null): List<PlayerDetail> {
        val gameTypes = gameTypeRepository.getAll().associateBy { it.id }
        val players = playerRepository.getAll(includeInactive = true).associateBy { it.id }
        val allMatches = matchRepository.getAll()
            .let { matches -> if (gameTypeId != null) matches.filter { it.gameTypeId == gameTypeId } else matches }

        val totalWins = mutableMapOf<String, Int>()
        val totalLosses = mutableMapOf<String, Int>()
        val h2h = mutableMapOf<Pair<String, String>, MutableList<Int>>()

        var orphanedMatches = 0
        allMatches.forEach { match ->
            val gameType = gameTypes[match.gameTypeId]
            if (gameType == null) {
                orphanedMatches++
                return@forEach
            }
            val winners = match.getWinners(gameType).toSet()
            val participants = match.playerScores.map { it.playerId }

            participants.forEach { pid ->
                if (pid in winners) {
                    totalWins[pid] = (totalWins[pid] ?: 0) + 1
                } else {
                    totalLosses[pid] = (totalLosses[pid] ?: 0) + 1
                }
            }

            for (i in participants.indices) {
                for (j in i + 1 until participants.size) {
                    val a = participants[i]
                    val b = participants[j]
                    val key = if (a < b) Pair(a, b) else Pair(b, a)
                    val h = h2h.getOrPut(key) { mutableListOf(0, 0) }
                    if (a in winners && b !in winners) {
                        if (key.first == a) h[0] = h[0] + 1 else h[1] = h[1] + 1
                    }
                    if (b in winners && a !in winners) {
                        if (key.first == b) h[0] = h[0] + 1 else h[1] = h[1] + 1
                    }
                }
            }
        }

        if (orphanedMatches > 0) {
            println("[Scoreo] Warning: $orphanedMatches match(es) reference non-existent game types")
        }

        val eloMap = eloCalculator.compute(allMatches, gameTypes)

        return players.entries.mapNotNull { (pid, player) ->
            val wins = totalWins[pid] ?: 0
            val losses = totalLosses[pid] ?: 0
            if (wins + losses == 0) return@mapNotNull null

            val headToHead = h2h.filterKeys { (a, b) -> a == pid || b == pid }.map { (pair, wl) ->
                val isA = pair.first == pid
                val oppId = if (isA) pair.second else pair.first
                val oppName = players[oppId]?.name ?: oppId
                HeadToHeadEntry(
                    opponentId = oppId,
                    opponentName = oppName,
                    wins = if (isA) wl[0] else wl[1],
                    losses = if (isA) wl[1] else wl[0],
                )
            }.sortedByDescending { it.wins }

            PlayerDetail(
                playerId = pid,
                name = player.name,
                wins = wins,
                losses = losses,
                elo = eloMap[pid] ?: 1200,
                headToHead = headToHead,
            )
        }.sortedByDescending { it.elo }
    }
}
