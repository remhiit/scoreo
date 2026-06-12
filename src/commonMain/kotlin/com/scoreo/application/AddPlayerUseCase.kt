package com.scoreo.application

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository

class AddPlayerUseCase(private val repository: PlayerRepository) {
    operator fun invoke(name: String): Player {
        val trimmed = name.trim()
        require(trimmed.isNotEmpty()) { "Player name must not be blank" }
        val player = Player(id = IdGenerator.newId(), name = trimmed)
        repository.save(player)
        return player
    }
}
