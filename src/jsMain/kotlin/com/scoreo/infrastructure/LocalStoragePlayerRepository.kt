package com.scoreo.infrastructure

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository
import kotlinx.browser.localStorage
import kotlinx.serialization.encodeToString

private const val KEY = "scoreo_players"

class LocalStoragePlayerRepository : PlayerRepository {
    override fun getAll(includeInactive: Boolean): List<Player> =
        localStorage.getItem(KEY)
            ?.let { runCatching { scoreoJson.decodeFromString<List<Player>>(it) }.getOrDefault(emptyList()) }
            ?.let { if (includeInactive) it else it.filter { p -> p.active } }
            ?: emptyList()

    override fun save(player: Player) {
        val updated = getAll(includeInactive = true).toMutableList()
        val idx = updated.indexOfFirst { it.id == player.id }
        if (idx >= 0) updated[idx] = player else updated.add(player)
        localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
    }

    override fun saveAll(players: List<Player>) {
        val existing = getAll(includeInactive = true).toMutableList()
        for (player in players) {
            val idx = existing.indexOfFirst { it.id == player.id }
            if (idx >= 0) existing[idx] = player else existing.add(player)
        }
        localStorage.setItem(KEY, scoreoJson.encodeToString(existing))
    }

    override fun delete(id: String, anonymize: Boolean) {
        val updated = getAll(includeInactive = true).map { player ->
            if (player.id == id) player.copy(
                active = false,
                name = if (anonymize) "" else player.name,
            ) else player
        }
        localStorage.setItem(KEY, scoreoJson.encodeToString(updated))
    }
}
