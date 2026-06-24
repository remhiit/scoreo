package com.scoreo.application

import com.scoreo.domain.port.MatchRepository

class UpdateMatchUseCase(private val matchRepository: MatchRepository) {
    operator fun invoke(match: com.scoreo.domain.model.Match) {
        matchRepository.save(match)
    }
}
