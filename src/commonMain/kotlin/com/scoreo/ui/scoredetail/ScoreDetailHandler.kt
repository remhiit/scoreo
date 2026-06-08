package com.scoreo.ui.scoredetail

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition

class ScoreDetailHandler(
    private val gameType: GameType,
    private val players: List<Player>,
    private val createMatch: CreateMatchUseCase,
    private val currentDate: () -> String,
) {
    var state by mutableStateOf(ScoreDetailState(gameType = gameType, players = players))
        private set

    fun handle(intent: ScoreDetailIntent) {
        when (intent) {
            is ScoreDetailIntent.UpdateScore -> {
                val rounds = state.rounds.toMutableList()
                rounds[intent.roundIndex] = rounds[intent.roundIndex] + (intent.playerId to intent.value)
                state = state.copy(rounds = rounds, error = null)
            }

            is ScoreDetailIntent.AddRound -> {
                state = state.copy(rounds = state.rounds + emptyMap(), error = null)
            }

            is ScoreDetailIntent.RemoveRound -> {
                if (state.rounds.size > 1) {
                    val rounds = state.rounds.toMutableList()
                    rounds.removeAt(intent.index)
                    state = state.copy(rounds = rounds)
                }
            }

            is ScoreDetailIntent.Terminate -> {
                if (!validateRounds()) return
                if (gameType.winCondition == WinCondition.MANUAL) {
                    state = state.copy(showWinnerModal = true, modalWinners = emptySet(), error = null)
                } else {
                    saveMatch(manualWinners = emptyList())
                }
            }

            is ScoreDetailIntent.DismissModal -> {
                state = state.copy(showWinnerModal = false, error = null)
            }

            is ScoreDetailIntent.ToggleModalWinner -> {
                val winners = state.modalWinners.toMutableSet()
                if (intent.playerId in winners) winners.remove(intent.playerId)
                else winners.add(intent.playerId)
                state = state.copy(modalWinners = winners, error = null)
            }

            is ScoreDetailIntent.ConfirmWinners -> {
                if (state.modalWinners.isEmpty()) {
                    state = state.copy(error = "Select at least one winner")
                    return
                }
                saveMatch(manualWinners = state.modalWinners.toList())
            }
        }
    }

    private fun validateRounds(): Boolean {
        for (player in players) {
            for ((roundIndex, round) in state.rounds.withIndex()) {
                val raw = round[player.id]?.trim() ?: ""
                if (raw.toIntOrNull() == null) {
                    state = state.copy(error = "Invalid score for ${player.name} in round ${roundIndex + 1}")
                    return false
                }
            }
        }
        return true
    }

    private fun saveMatch(manualWinners: List<String>) {
        val playerScores = players.map { player ->
            val total = state.rounds.sumOf { round ->
                round[player.id]?.trim()?.toIntOrNull() ?: 0
            }
            PlayerScore(playerId = player.id, score = total)
        }
        createMatch(
            gameTypeId = gameType.id,
            playerScores = playerScores,
            date = currentDate(),
            manualWinners = manualWinners,
        )
        state = state.copy(saved = true)
    }

    fun reset() {
        state = ScoreDetailState(gameType = gameType, players = players)
    }
}
