package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.port.GameTypeRepository

class GetGameTypesUseCase(private val repository: GameTypeRepository) {
    operator fun invoke(): List<GameType> = repository.getAll(includeInactive = false)
}
