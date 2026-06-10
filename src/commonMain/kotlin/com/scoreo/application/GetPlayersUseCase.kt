package com.scoreo.application

import com.scoreo.domain.model.Player
import com.scoreo.domain.port.PlayerRepository

class GetPlayersUseCase(private val repository: PlayerRepository) {
    operator fun invoke(includeInactive: Boolean = false): List<Player> =
        repository.getAll(includeInactive)
}
