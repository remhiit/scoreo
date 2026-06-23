package com.scoreo.application

import com.scoreo.domain.DomainError
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
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
        secondaryPlayerScores: List<PlayerScore> = emptyList(),
    ): Result<Match> = runCatching {
        val gameType = gameTypeRepository.findById(gameTypeId)
            ?: throw DomainError.NotFound("GameType", gameTypeId)
        if (playerScores.size < 2) throw DomainError.Validation("playerScores", "A match needs at least 2 players")
        val playerIds = playerScores.map { it.playerId }
        if (playerIds.distinct().size != playerIds.size) throw DomainError.Validation("playerScores", "Duplicate player IDs in match")
        if (manualWinners.isNotEmpty() && !manualWinners.all { it in playerIds })
            throw DomainError.Validation("manualWinners", "manualWinners must be a subset of playerScores")
        if (secondaryPlayerScores.isNotEmpty()) {
            val secondaryIds = secondaryPlayerScores.map { it.playerId }
            if (!secondaryIds.all { it in playerIds })
                throw DomainError.Validation("secondaryPlayerScores", "secondaryPlayerScores must be a subset of playerScores")
            if (secondaryIds.distinct().size != secondaryIds.size)
                throw DomainError.Validation("secondaryPlayerScores", "Duplicate player IDs in secondaryPlayerScores")
        }
        val match = Match(
            id = IdGenerator.newId(),
            date = date,
            gameTypeId = gameTypeId,
            playerScores = playerScores,
            manualWinners = manualWinners,
            secondaryPlayerScores = secondaryPlayerScores,
        )
        matchRepository.save(match)
        match
    }
}
