package com.scoreo.infrastructure

import com.scoreo.domain.model.GameType
import com.scoreo.domain.port.GameTypeRepository

class InMemoryGameTypeRepository : GameTypeRepository {
    private val gameTypes = mutableListOf<GameType>()

    override fun getAll(): List<GameType> = gameTypes.toList()

    override fun save(gameType: GameType) {
        val idx = gameTypes.indexOfFirst { it.id == gameType.id }
        if (idx >= 0) gameTypes[idx] = gameType else gameTypes.add(gameType)
    }

    override fun findById(id: String): GameType? = gameTypes.find { it.id == id }
}
