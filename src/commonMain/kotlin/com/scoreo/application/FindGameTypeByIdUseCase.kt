package com.scoreo.application

import com.scoreo.domain.model.GameType
import com.scoreo.domain.port.GameTypeRepository

class FindGameTypeByIdUseCase(private val repository: GameTypeRepository) {
    operator fun invoke(gameTypeId: String): GameType? = repository.findById(gameTypeId)
}
