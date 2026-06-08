package com.scoreo.ui.creatematch

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.model.WinCondition

class CreateMatchHandler(
    private val getPlayers: GetPlayersUseCase,
    private val getGameTypes: GetGameTypesUseCase,
    private val addPlayer: AddPlayerUseCase,
    private val addGameType: AddGameTypeUseCase,
) {
    var state by mutableStateOf(
        CreateMatchState(
            availablePlayers = getPlayers(),
            availableGameTypes = getGameTypes(),
        )
    )
        private set

    fun handle(intent: CreateMatchIntent) {
        when (intent) {
            is CreateMatchIntent.SelectGameType ->
                state = state.copy(selectedGameType = intent.gameType, error = null)

            is CreateMatchIntent.TogglePlayer -> {
                val selected = state.selectedPlayers.toMutableList()
                if (intent.player in selected) selected.remove(intent.player)
                else selected.add(intent.player)
                state = state.copy(selectedPlayers = selected, error = null)
            }

            is CreateMatchIntent.ToggleAddGameForm ->
                state = state.copy(
                    showAddGameForm = !state.showAddGameForm,
                    inlineGameName = "",
                    inlineGameError = null,
                )

            is CreateMatchIntent.UpdateInlineGameName ->
                state = state.copy(inlineGameName = intent.name, inlineGameError = null)

            is CreateMatchIntent.SelectInlineGameWinCondition ->
                state = state.copy(inlineGameWinCondition = intent.winCondition)

            is CreateMatchIntent.AddInlineGameType -> {
                val name = state.inlineGameName.trim()
                if (name.isBlank()) {
                    state = state.copy(inlineGameError = "Name cannot be empty")
                    return
                }
                val created = addGameType(name, state.inlineGameWinCondition)
                val updatedList = getGameTypes()
                state = state.copy(
                    availableGameTypes = updatedList,
                    selectedGameType = created,
                    showAddGameForm = false,
                    inlineGameName = "",
                    inlineGameWinCondition = WinCondition.HIGHEST_SCORE,
                    inlineGameError = null,
                )
            }

            is CreateMatchIntent.ToggleAddPlayerForm ->
                state = state.copy(
                    showAddPlayerForm = !state.showAddPlayerForm,
                    inlinePlayerName = "",
                    inlinePlayerError = null,
                )

            is CreateMatchIntent.UpdateInlinePlayerName ->
                state = state.copy(inlinePlayerName = intent.name, inlinePlayerError = null)

            is CreateMatchIntent.AddInlinePlayer -> {
                val name = state.inlinePlayerName.trim()
                if (name.isBlank()) {
                    state = state.copy(inlinePlayerError = "Name cannot be empty")
                    return
                }
                addPlayer(name)
                state = state.copy(
                    availablePlayers = getPlayers(),
                    showAddPlayerForm = false,
                    inlinePlayerName = "",
                    inlinePlayerError = null,
                )
            }
        }
    }

    fun validateSelection(): Boolean {
        if (state.selectedGameType == null) {
            state = state.copy(error = "Select a game type")
            return false
        }
        if (state.selectedPlayers.size < 2) {
            state = state.copy(error = "Select at least 2 players")
            return false
        }
        return true
    }

    fun refreshLists() {
        state = state.copy(
            availablePlayers = getPlayers(),
            availableGameTypes = getGameTypes(),
        )
    }

    fun reset() {
        state = CreateMatchState(
            availablePlayers = getPlayers(),
            availableGameTypes = getGameTypes(),
        )
    }
}
