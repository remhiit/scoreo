package com.scoreo.infrastructure

import com.scoreo.domain.model.Match
import com.scoreo.domain.port.MatchRepository

class InMemoryMatchRepository : MatchRepository {
    private val matches = mutableListOf<Match>()

    override fun getAll(): List<Match> = matches.toList()

    override fun save(match: Match) {
        matches.add(match)
    }
}
