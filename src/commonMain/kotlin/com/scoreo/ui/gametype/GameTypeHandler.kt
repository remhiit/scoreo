package com.scoreo.ui.gametype

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.GetGameTypesUseCase

class GameTypeHandler(
    private val addGameType: AddGameTypeUseCase,
    private val getGameTypes: GetGameTypesUseCase,
) {
    var state by mutableStateOf(GameTypeState(gameTypes = getGameTypes()))
        private set

    fun refresh() {
        state = state.copy(gameTypes = getGameTypes())
    }

    fun handle(intent: GameTypeIntent) {
        when (intent) {
            is GameTypeIntent.UpdateName ->
                state = state.copy(inputName = intent.name, error = null)
            is GameTypeIntent.SelectWinCondition ->
                state = state.copy(selectedWinCondition = intent.winCondition)
            is GameTypeIntent.AddGameType -> {
                val name = state.inputName.trim()
                if (name.isBlank()) {
                    state = state.copy(error = "Name cannot be empty")
                    return
                }
                addGameType(name, state.selectedWinCondition)
                state = state.copy(
                    gameTypes = getGameTypes(),
                    inputName = "",
                    error = null,
                )
            }
        }
    }
}
