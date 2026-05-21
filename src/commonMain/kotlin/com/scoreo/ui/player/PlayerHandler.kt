package com.scoreo.ui.player

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase

class PlayerHandler(
    private val addPlayer: AddPlayerUseCase,
    private val getPlayers: GetPlayersUseCase,
    private val getPlayerStats: GetPlayerStatsUseCase,
) {
    var state by mutableStateOf(
        PlayerState(players = getPlayers(), stats = getPlayerStats())
    )
        private set

    fun handle(intent: PlayerIntent) {
        when (intent) {
            is PlayerIntent.UpdateInput -> state = state.copy(inputName = intent.name, error = null)
            is PlayerIntent.AddPlayer -> {
                val name = state.inputName.trim()
                if (name.isBlank()) {
                    state = state.copy(error = "Name cannot be empty")
                    return
                }
                addPlayer(name)
                state = state.copy(
                    players = getPlayers(),
                    stats = getPlayerStats(),
                    inputName = "",
                    error = null,
                )
            }
        }
    }

    fun refresh() {
        state = state.copy(players = getPlayers(), stats = getPlayerStats())
    }
}
