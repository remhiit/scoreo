package com.scoreo.application

import com.scoreo.domain.model.Match
import com.scoreo.domain.port.MatchRepository

class GetMatchesUseCase(private val repository: MatchRepository) {
    operator fun invoke(): List<Match> = repository.getAll()
}
