package com.scoreo.domain.port

import com.scoreo.domain.model.Player

interface PlayerRepository {
    fun getAll(): List<Player>
    fun save(player: Player)
}
