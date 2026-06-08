package com.scoreo.domain.port

import com.scoreo.domain.model.Match

interface MatchRepository {
    fun getAll(): List<Match>
    fun save(match: Match)
    fun findById(id: String): Match?
}
