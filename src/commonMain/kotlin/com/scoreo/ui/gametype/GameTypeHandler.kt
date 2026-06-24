package com.scoreo.ui.gametype

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.ArchiveGameTypeUseCase
import com.scoreo.application.FindGameTypeByIdUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.UpdateGameTypeUseCase
import com.scoreo.domain.DomainError
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition

class GameTypeHandler(
    private val addGameType: AddGameTypeUseCase,
    private val updateGameType: UpdateGameTypeUseCase,
    private val getGameTypes: GetGameTypesUseCase,
    private val findGameTypeById: FindGameTypeByIdUseCase,
    private val archiveGameType: ArchiveGameTypeUseCase,
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
            is GameTypeIntent.SelectGame ->
                state = state.copy(selectedGameId = intent.id)
            is GameTypeIntent.DeselectGame ->
                state = state.copy(selectedGameId = null)
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
                    resetForm(refresh = true)
                } catch (e: DomainError) {
                    state = state.copy(error = e.message)
                }
            }
             is GameTypeIntent.EditGameType -> {
                 val gameType = findGameTypeById(intent.id)
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
                resetForm(refresh = false)
            }
            is GameTypeIntent.UpdateGameType -> {
                try {
                    updateGameType(intent.gameType)
                    resetForm(refresh = true)
                } catch (e: DomainError) {
                    state = state.copy(error = e.message)
                }
            }
            is GameTypeIntent.ShowArchiveConfirm -> {
                state = state.copy(archiveConfirmGameTypeId = intent.gameTypeId)
            }
             is GameTypeIntent.ArchiveGameType -> {
                 try {
                     archiveGameType(intent.gameTypeId)
                     state = state.copy(archiveConfirmGameTypeId = null)
                     // Refresh
                     val gameTypes = getGameTypes()
                     state = state.copy(gameTypes = gameTypes, selectedGameId = null)
                 } catch (e: DomainError) {
                     state = state.copy(error = e.message)
                 }
            }
            is GameTypeIntent.DismissArchiveConfirm -> {
                state = state.copy(archiveConfirmGameTypeId = null)
            }
        }
    }

    private fun resetForm(refresh: Boolean) {
        val defaultWinCondition = WinCondition.HIGHEST_SCORE
        state = state.copy(
            gameTypes = if (refresh) getGameTypes() else state.gameTypes,
            inputName = "",
            selectedWinCondition = defaultWinCondition,
            selectedTieBreakRule = TieBreakRule.NONE,
            selectedTieBreakCondition = defaultWinCondition,
            selectedTieBreakLabel = null,
            editingGameId = null,
            error = null,
        )
    }
}
