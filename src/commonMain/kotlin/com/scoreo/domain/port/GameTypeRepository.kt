package com.scoreo.domain.port

import com.scoreo.domain.model.GameType

interface GameTypeRepository {
    fun getAll(): List<GameType>
    fun save(gameType: GameType)
    fun saveAll(gameTypes: List<GameType>)
    fun findById(id: String): GameType?
}
