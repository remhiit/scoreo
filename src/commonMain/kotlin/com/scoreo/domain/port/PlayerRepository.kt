package com.scoreo.domain.port

import com.scoreo.domain.model.Player

interface PlayerRepository {
    fun getAll(includeInactive: Boolean = false): List<Player>
    fun save(player: Player)
    fun saveAll(players: List<Player>)
    fun delete(id: String, anonymize: Boolean = false)
}
