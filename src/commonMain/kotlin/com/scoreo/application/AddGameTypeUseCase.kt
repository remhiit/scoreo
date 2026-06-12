package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.GameTypeRepository

class AddGameTypeUseCase(private val repository: GameTypeRepository) {
    operator fun invoke(name: String, winCondition: WinCondition): GameType {
        val trimmed = name.trim()
        require(trimmed.isNotEmpty()) { "Game type name must not be blank" }
        val gameType = GameType(id = IdGenerator.newId(), name = trimmed, winCondition = winCondition)
        repository.save(gameType)
        return gameType
    }
}
