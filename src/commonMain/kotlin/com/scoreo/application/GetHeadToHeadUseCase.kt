package com.scoreo.application

import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository

class GetHeadToHeadUseCase(
    private val matchRepository: MatchRepository,
    private val gameTypeRepository: GameTypeRepository,
    private val playerRepository: PlayerRepository,
) {
    operator fun invoke(): List<PlayerDetail> {
        val gameTypes = gameTypeRepository.getAll().associateBy { it.id }
        val players = playerRepository.getAll(includeInactive = true).associateBy { it.id }

        val totalWins = mutableMapOf<String, Int>()
        val totalLosses = mutableMapOf<String, Int>()
        val h2h = mutableMapOf<Pair<String, String>, MutableList<Int>>()

        matchRepository.getAll().forEach { match ->
            val gameType = gameTypes[match.gameTypeId] ?: return@forEach
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
                headToHead = headToHead,
            )
        }.sortedWith(
            compareByDescending<PlayerDetail> {
                if (it.wins + it.losses == 0) 0f else it.wins.toFloat() / (it.wins + it.losses)
            }.thenByDescending { it.wins }
        )
    }
}
