package com.scoreo

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository

class FakeGameTypeRepository : GameTypeRepository {
    private val items = mutableListOf<GameType>()
    override fun getAll(): List<GameType> = items.toList()
    override fun save(gameType: GameType) { items.add(gameType) }
    override fun findById(id: String): GameType? = items.find { it.id == id }
}

class FakeMatchRepository : MatchRepository {
    private val items = mutableListOf<Match>()
    override fun getAll(): List<Match> = items.toList()
    override fun save(match: Match) { items.add(match) }
    override fun findById(id: String): Match? = items.find { it.id == id }
}
