package com.scoreo.ui.player

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.DeletePlayerUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.ui.util.requireNonBlank

class PlayerHandler(
    private val addPlayer: AddPlayerUseCase,
    private val getPlayers: GetPlayersUseCase,
    private val getPlayerStats: GetPlayerStatsUseCase,
    private val deletePlayer: DeletePlayerUseCase,
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
                val error = requireNonBlank(name)
                if (error != null) {
                    state = state.copy(error = error)
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
            is PlayerIntent.ShowDeleteConfirm -> state = state.copy(deleteConfirmPlayerId = intent.id)
            is PlayerIntent.DismissDeleteConfirm -> state = state.copy(deleteConfirmPlayerId = null)
            is PlayerIntent.DeletePlayer -> {
                deletePlayer(intent.id, intent.anonymize)
                state = state.copy(
                    players = getPlayers(),
                    stats = getPlayerStats(),
                    deleteConfirmPlayerId = null,
                )
            }
        }
    }

    fun refresh() {
        state = state.copy(players = getPlayers(), stats = getPlayerStats())
    }
}
