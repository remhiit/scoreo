package com.scoreo.application

import com.scoreo.domain.DomainError
import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository

private const val MAX_NAME_LENGTH = 50

class AddPlayerUseCase(private val repository: PlayerRepository) {
    operator fun invoke(name: String): Player {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) throw DomainError.Validation("name", "Player name must not be blank")
        require(trimmed.length <= MAX_NAME_LENGTH) { "Player name must be $MAX_NAME_LENGTH characters or less" }
        val player = Player(id = IdGenerator.newId(), name = trimmed)
        repository.save(player)
        return player
    }
}
