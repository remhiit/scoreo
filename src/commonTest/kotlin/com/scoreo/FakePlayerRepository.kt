package com.scoreo

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository

class FakePlayerRepository : PlayerRepository {
    private val players = mutableListOf<Player>()

    override fun getAll(): List<Player> = players.toList()

    override fun save(player: Player) {
        players.add(player)
    }
}
