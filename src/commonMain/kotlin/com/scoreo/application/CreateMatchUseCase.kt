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
