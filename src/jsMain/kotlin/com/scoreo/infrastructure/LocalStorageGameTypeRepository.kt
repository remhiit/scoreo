package com.scoreo.infrastructure

import com.scoreo.domain.model.GameType
import com.scoreo.domain.port.GameTypeRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString

private const val KEY = "scoreo_gametypes"

class LocalStorageGameTypeRepository : GameTypeRepository {
    override fun getAll(): List<GameType> =
        localStorage.getItem(KEY)
            ?.let { scoreoJson.decodeFromString<List<GameType>>(it) }
            ?: emptyList()

    override fun save(gameType: GameType) {
        val updated = getAll().toMutableList().also { it.add(gameType) }
        localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
    }

    override fun findById(id: String): GameType? = getAll().find { it.id == id }
}
