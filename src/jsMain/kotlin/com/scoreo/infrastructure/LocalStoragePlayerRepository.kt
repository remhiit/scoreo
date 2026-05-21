package com.scoreo.infrastructure

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

private const val KEY = "scoreo_players"

class LocalStoragePlayerRepository : PlayerRepository {
    private val json = Json { ignoreUnknownKeys = true }

    override fun getAll(): List<Player> =
        localStorage.getItem(KEY)
            ?.let { json.decodeFromString<List<Player>>(it) }
            ?: emptyList()

    override fun save(player: Player) {
        val updated = getAll().toMutableList().also { it.add(player) }
        localStorage.setItem(KEY, json.encodeToString(updated))
    }
}
