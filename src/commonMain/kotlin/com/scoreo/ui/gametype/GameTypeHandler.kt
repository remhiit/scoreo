package com.scoreo.ui.gametype

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.UpdateGameTypeUseCase
import com.scoreo.domain.DomainError
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.port.GameTypeRepository

class GameTypeHandler(
    private val addGameType: AddGameTypeUseCase,
    private val updateGameType: UpdateGameTypeUseCase,
    private val getGameTypes: GetGameTypesUseCase,
    private val gameTypeRepository: GameTypeRepository,
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
            is GameTypeIntent.UpdateTieBreakRule ->
                state = state.copy(selectedTieBreakRule = intent.rule)
            is GameTypeIntent.UpdateTieBreakCondition ->
                state = state.copy(selectedTieBreakCondition = intent.condition)
            is GameTypeIntent.UpdateTieBreakLabel ->
                state = state.copy(selectedTieBreakLabel = if (intent.label.isBlank()) null else intent.label)
            is GameTypeIntent.AddGameType -> {
                val name = state.inputName.trim()
                try {
                    addGameType(
                        name,
                        state.selectedWinCondition,
                        state.selectedTieBreakRule,
                        state.selectedTieBreakCondition,
                        state.selectedTieBreakLabel,
                    )
                    state = state.copy(
                        gameTypes = getGameTypes(),
                        inputName = "",
                        selectedTieBreakRule = TieBreakRule.NONE,
                        selectedTieBreakCondition = state.selectedWinCondition,
                        selectedTieBreakLabel = null,
                        editingGameId = null,
                        error = null,
                    )
                } catch (e: DomainError) {
                    state = state.copy(error = e.message)
                }
            }
            is GameTypeIntent.EditGameType -> {
                val gameType = gameTypeRepository.findById(intent.id)
                if (gameType != null) {
                    state = state.copy(
                        inputName = gameType.name,
                        selectedWinCondition = gameType.winCondition,
                        selectedTieBreakRule = gameType.tieBreakRule,
                        selectedTieBreakCondition = gameType.tieBreakCondition,
                        selectedTieBreakLabel = gameType.tieBreakLabel,
                        editingGameId = intent.id,
                        error = null,
                    )
                }
            }
            is GameTypeIntent.CancelEdit -> {
                state = state.copy(
                    inputName = "",
                    selectedTieBreakRule = TieBreakRule.NONE,
                    selectedTieBreakCondition = state.selectedWinCondition,
                    selectedTieBreakLabel = null,
                    editingGameId = null,
                    error = null,
                )
            }
            is GameTypeIntent.UpdateGameType -> {
                try {
                    updateGameType(intent.gameType)
                    state = state.copy(
                        gameTypes = getGameTypes(),
                        inputName = "",
                        selectedTieBreakRule = TieBreakRule.NONE,
                        selectedTieBreakCondition = state.selectedWinCondition,
                        selectedTieBreakLabel = null,
                        editingGameId = null,
                        error = null,
                    )
                } catch (e: DomainError) {
                    state = state.copy(error = e.message)
                }
            }
        }
    }
}
