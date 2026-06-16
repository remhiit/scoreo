package com.scoreo.infrastructure

import com.scoreo.domain.model.Match
import com.scoreo.domain.port.MatchRepository

class InMemoryMatchRepository : MatchRepository {
    private val matches = mutableListOf<Match>()

    override fun getAll(): List<Match> = matches.toList()

    override fun save(match: Match) {
        val idx = matches.indexOfFirst { it.id == match.id }
        if (idx >= 0) matches[idx] = match else matches.add(match)
    }

    override fun findById(id: String): Match? = matches.find { it.id == id }
}
