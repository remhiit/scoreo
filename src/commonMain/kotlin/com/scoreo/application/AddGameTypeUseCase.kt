package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.GameTypeRepository

class AddGameTypeUseCase(private val repository: GameTypeRepository) {
    operator fun invoke(name: String, winCondition: WinCondition): GameType {
        val gameType = GameType(id = IdGenerator.newId(), name = name.trim(), winCondition = winCondition)
        repository.save(gameType)
        return gameType
    }
}
