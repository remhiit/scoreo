package com.scoreo.application

import com.scoreo.domain.DomainError
import com.scoreo.domain.port.PlayerRepository

private const val MAX_NAME_LENGTH = 50

class RenamePlayerUseCase(private val repository: PlayerRepository) {
    operator fun invoke(playerId: String, newName: String) {
        val player = repository.getAll(includeInactive = true).find { it.id == playerId }
            ?: throw DomainError.NotFound("Player", playerId)

        val trimmed = newName.trim()
        if (trimmed.isEmpty()) throw DomainError.Validation("name", "Player name must not be blank")
        if (trimmed.length > MAX_NAME_LENGTH) throw DomainError.Validation("name", "Player name must be $MAX_NAME_LENGTH characters or less")

        val updated = player.copy(name = trimmed)
        repository.save(updated)
    }
}
