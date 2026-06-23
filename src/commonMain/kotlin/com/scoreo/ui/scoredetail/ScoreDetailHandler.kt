package com.scoreo.ui.scoredetail

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition

class ScoreDetailHandler(
    private val gameType: GameType,
    private val players: List<Player>,
    private val createMatch: CreateMatchUseCase,
    private val currentDate: () -> Long,
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
                if (state.rounds.size > 1 && intent.index in state.rounds.indices) {
                    val rounds = state.rounds.toMutableList()
                    rounds.removeAt(intent.index)
                    state = state.copy(rounds = rounds)
                }
            }

            is ScoreDetailIntent.Terminate -> {
                if (!validateRounds()) return
                if (gameType.winCondition == WinCondition.MANUAL) {
                    state = state.copy(showWinnerModal = true, modalWinners = emptySet(), error = null)
                    return
                }
                val playerScores = players.map { player ->
                    PlayerScore(player.id, state.totals[player.id] ?: 0)
                }
                val primaryWinners = gameType.computeWinners(playerScores)

                when {
                    // No tie → save directly
                    primaryWinners.size <= 1 -> {
                        saveMatch(playerScores, manualWinners = emptyList())
                    }
                    // Tie + NONE → save all tied as winners
                    gameType.tieBreakRule == TieBreakRule.NONE -> {
                        saveMatch(playerScores, manualWinners = primaryWinners)
                    }
                    // Tie + MANUAL_SELECTION → show manual arbitration
                    gameType.tieBreakRule == TieBreakRule.MANUAL_SELECTION -> {
                        state = state.copy(
                            showManualSelectionDialog = true,
                            tiedPlayerIds = primaryWinners,
                            manualSelectionWinners = emptySet(),
                            error = null,
                        )
                    }
                    // Tie + SECONDARY_SCORE → show secondary score dialog
                    gameType.tieBreakRule == TieBreakRule.SECONDARY_SCORE -> {
                        state = state.copy(
                            showSecondaryScoreDialog = true,
                            tiedPlayerIds = primaryWinners,
                            secondaryScoreInputs = primaryWinners.associateWith { "" },
                            error = null,
                        )
                    }
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
                val playerScores = players.map { player ->
                    PlayerScore(player.id, state.totals[player.id] ?: 0)
                }
                saveMatch(playerScores, manualWinners = state.modalWinners.toList())
            }

            // ── Tie-break: Secondary Score input ──
            is ScoreDetailIntent.UpdateSecondaryScoreInput -> {
                state = state.copy(
                    secondaryScoreInputs = state.secondaryScoreInputs + (intent.playerId to intent.value),
                    error = null,
                )
            }

            is ScoreDetailIntent.SubmitSecondaryScores -> {
                val tiedIds = state.tiedPlayerIds
                val secondaryScores = mutableListOf<PlayerScore>()
                for (playerId in tiedIds) {
                    val input = state.secondaryScoreInputs[playerId]?.trim() ?: ""
                    val score = input.toIntOrNull()
                    if (score == null) {
                        state = state.copy(error = "Invalid secondary score for one of the tied players")
                        return@handle
                    }
                    secondaryScores.add(PlayerScore(playerId, score))
                }
                // Compute winners using tieBreakCondition on secondary scores
                val secondaryWinners = gameType.computeWinners(secondaryScores, gameType.tieBreakCondition)
                val resolvedWinners = secondaryWinners.filter { it in tiedIds }

                if (resolvedWinners.size < tiedIds.size) {
                    // Tie partially or fully broken → save match
                    val playerScores = players.map { player ->
                        PlayerScore(player.id, state.totals[player.id] ?: 0)
                    }
                    saveMatch(
                        playerScores,
                        manualWinners = resolvedWinners,
                        secondaryPlayerScores = secondaryScores,
                    )
                } else {
                    // Same tie persists → escalate to manual arbitration
                    state = state.copy(
                        showSecondaryScoreDialog = false,
                        showManualSelectionDialog = true,
                        manualSelectionWinners = emptySet(),
                        collectedSecondaryScores = secondaryScores,
                        error = null,
                    )
                }
            }

            // ── Tie-break: Manual Selection ──
            is ScoreDetailIntent.ToggleManualSelectionWinner -> {
                val winners = state.manualSelectionWinners.toMutableSet()
                if (intent.playerId in winners) winners.remove(intent.playerId)
                else winners.add(intent.playerId)
                state = state.copy(manualSelectionWinners = winners, error = null)
            }

            is ScoreDetailIntent.ConfirmManualWinners -> {
                if (state.manualSelectionWinners.isEmpty()) {
                    state = state.copy(error = "Select at least one winner")
                    return
                }
                val playerScores = players.map { player ->
                    PlayerScore(player.id, state.totals[player.id] ?: 0)
                }
                saveMatch(
                    playerScores,
                    manualWinners = state.manualSelectionWinners.toList(),
                    secondaryPlayerScores = state.collectedSecondaryScores,
                )
            }

            is ScoreDetailIntent.KeepTie -> {
                val playerScores = players.map { player ->
                    PlayerScore(player.id, state.totals[player.id] ?: 0)
                }
                // Keep all tied players as winners
                saveMatch(
                    playerScores,
                    manualWinners = state.tiedPlayerIds,
                    secondaryPlayerScores = state.collectedSecondaryScores,
                )
            }

            is ScoreDetailIntent.DismissTieBreak -> {
                state = state.copy(
                    showSecondaryScoreDialog = false,
                    showManualSelectionDialog = false,
                    error = null,
                )
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

    private fun saveMatch(
        playerScores: List<PlayerScore>,
        manualWinners: List<String> = emptyList(),
        secondaryPlayerScores: List<PlayerScore> = emptyList(),
    ) {
        val result = createMatch(
            gameTypeId = gameType.id,
            playerScores = playerScores,
            date = currentDate(),
            manualWinners = manualWinners,
            secondaryPlayerScores = secondaryPlayerScores,
        )
        result.fold(
            onSuccess = { state = state.copy(saved = true) },
            onFailure = { e -> state = state.copy(error = e.message) },
        )
    }

    fun reset() {
        state = ScoreDetailState(gameType = gameType, players = players)
    }
}
