package com.scoreo.infrastructure

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository

class InMemoryPlayerRepository : PlayerRepository {
    private val players = mutableListOf<Player>()

    override fun getAll(includeInactive: Boolean): List<Player> =
        if (includeInactive) players.toList() else players.filter { it.active }

    override fun save(player: Player) {
        val idx = players.indexOfFirst { it.id == player.id }
        if (idx >= 0) players[idx] = player else players.add(player)
    }

    override fun saveAll(players: List<Player>) {
        players.forEach { save(it) }
    }

    override fun delete(id: String, anonymize: Boolean) {
        val idx = players.indexOfFirst { it.id == id }
        if (idx == -1) return
        players[idx] = players[idx].copy(
            active = false,
            name = if (anonymize) "" else players[idx].name,
        )
    }
}
