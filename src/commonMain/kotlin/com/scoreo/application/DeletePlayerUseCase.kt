package com.scoreo.application

import com.scoreo.domain.port.PlayerRepository

class DeletePlayerUseCase(private val repository: PlayerRepository) {
    operator fun invoke(id: String, anonymize: Boolean = false) {
        repository.delete(id, anonymize)
    }
}
