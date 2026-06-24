package com.scoreo.application

import com.scoreo.domain.port.MatchRepository

class DeleteMatchUseCase(private val matchRepository: MatchRepository) {
    operator fun invoke(matchId: String) {
        matchRepository.delete(matchId)
    }
}
