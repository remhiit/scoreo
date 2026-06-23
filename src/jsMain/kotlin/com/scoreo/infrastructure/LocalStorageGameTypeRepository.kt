package com.scoreo.infrastructure

import com.scoreo.domain.model.GameType
import com.scoreo.domain.port.GameTypeRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString

private const val KEY = "scoreo_gametypes"

class LocalStorageGameTypeRepository : GameTypeRepository {
    override fun getAll(): List<GameType> =
        localStorage.getItem(KEY)
            ?.let { runCatching { scoreoJson.decodeFromString<List<GameType>>(it) }.getOrDefault(emptyList()) }
            ?: emptyList()

    override fun save(gameType: GameType) {
        val updated = getAll().toMutableList()
        val idx = updated.indexOfFirst { it.id == gameType.id }
        if (idx >= 0) updated[idx] = gameType else updated.add(gameType)
        localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
    }

    override fun saveAll(gameTypes: List<GameType>) {
        val existing = getAll().toMutableList()
        for (gameType in gameTypes) {
            val idx = existing.indexOfFirst { it.id == gameType.id }
            if (idx >= 0) existing[idx] = gameType else existing.add(gameType)
        }
        localStorage.setItem(KEY, scoreoJson.encodeToString(existing))
    }

    override fun findById(id: String): GameType? = getAll().find { it.id == id }
}
