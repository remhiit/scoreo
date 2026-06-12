package com.scoreo.application

import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository

class CreateMatchUseCase(
    private val matchRepository: MatchRepository,
    private val gameTypeRepository: GameTypeRepository,
) {
    operator fun invoke(
        gameTypeId: String,
        playerScores: List<PlayerScore>,
        date: Long,
        manualWinners: List<String> = emptyList(),
    ): Result<Match> = runCatching {
        val gameType = gameTypeRepository.findById(gameTypeId)
            ?: error("GameType $gameTypeId not found")
        require(playerScores.size >= 2) { "A match needs at least 2 players" }
        val playerIds = playerScores.map { it.playerId }
        require(playerIds.distinct().size == playerIds.size) {
            "Duplicate player IDs in match"
        }
        require(manualWinners.all { it in playerIds }) {
            "manualWinners must be a subset of playerScores"
        }
        val match = Match(
            id = IdGenerator.newId(),
            date = date,
            gameTypeId = gameTypeId,
            playerScores = playerScores,
            manualWinners = manualWinners,
        )
        matchRepository.save(match)
        match
    }
}
