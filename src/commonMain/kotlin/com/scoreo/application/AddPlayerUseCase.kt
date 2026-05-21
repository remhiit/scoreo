package com.scoreo.application

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository

class AddPlayerUseCase(private val repository: PlayerRepository) {
    operator fun invoke(name: String): Player {
        val player = Player(id = generateId(), name = name.trim())
        repository.save(player)
        return player
    }

    private fun generateId(): String =
        (1..12).map { "abcdefghijklmnopqrstuvwxyz0123456789".random() }.joinToString("")
}
