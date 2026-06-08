package com.scoreo.infrastructure

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString

private const val KEY = "scoreo_players"

class LocalStoragePlayerRepository : PlayerRepository {
    override fun getAll(): List<Player> =
        localStorage.getItem(KEY)
            ?.let { scoreoJson.decodeFromString<List<Player>>(it) }
            ?: emptyList()

    override fun save(player: Player) {
        val updated = getAll().toMutableList().also { it.add(player) }
        localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
    }
}
