package com.scoreo.infrastructure

import com.scoreo.domain.model.GameType
import com.scoreo.domain.port.GameTypeRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val KEY = "scoreo_gametypes"

class LocalStorageGameTypeRepository : GameTypeRepository {
    private val json = Json { ignoreUnknownKeys = true }

    override fun getAll(): List<GameType> =
        localStorage.getItem(KEY)
            ?.let { json.decodeFromString<List<GameType>>(it) }
            ?: emptyList()

    override fun save(gameType: GameType) {
        val updated = getAll().toMutableList().also { it.add(gameType) }
        localStorage.setItem(KEY, json.encodeToString(updated))
    }

    override fun findById(id: String): GameType? = getAll().find { it.id == id }
}
