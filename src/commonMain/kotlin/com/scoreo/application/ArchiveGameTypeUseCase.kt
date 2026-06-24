package com.scoreo.application

import com.scoreo.domain.port.GameTypeRepository

class ArchiveGameTypeUseCase(private val gameTypeRepository: GameTypeRepository) {
    operator fun invoke(gameTypeId: String) {
        val gameType = gameTypeRepository.findById(gameTypeId)
            ?: throw IllegalArgumentException("Game type not found: $gameTypeId")
        
        val archived = gameType.copy(active = false)
        gameTypeRepository.save(archived)
    }
}
