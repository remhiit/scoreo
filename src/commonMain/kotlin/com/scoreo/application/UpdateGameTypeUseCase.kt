package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.port.GameTypeRepository

class UpdateGameTypeUseCase(private val repository: GameTypeRepository) {
    operator fun invoke(gameType: GameType) {
        repository.save(gameType)
    }
}
