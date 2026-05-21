package com.scoreo.infrastructure

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository

class InMemoryPlayerRepository : PlayerRepository {
    private val players = mutableListOf<Player>()

    override fun getAll(): List<Player> = players.toList()

    override fun save(player: Player) {
        players.add(player)
    }
}
