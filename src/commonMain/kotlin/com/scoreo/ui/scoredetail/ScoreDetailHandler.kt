package com.scoreo.ui.scoredetail

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.application.UpdateMatchUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchDraftRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository

class ScoreDetailHandler(
    private val gameType: GameType,
    private val players: List<Player>,
    private val createMatch: CreateMatchUseCase,
    private val currentDate: () -> Long,
    private val updateMatchUseCase: UpdateMatchUseCase? = null,
    private val matchRepository: MatchRepository? = null,
    private val playerRepository: PlayerRepository? = null,
    private val gameTypeRepository: GameTypeRepository? = null,
    private val matchId: String? = null,
    private val matchDraftRepository: MatchDraftRepository? = null,
) {
    var state by mutableStateOf(ScoreDetailState(gameType = gameType, players = players))
        private set

    init {
        if (matchId != null) {
            loadMatchForEditing(matchId)
        } else {
            // Try to load a saved draft if creating new match
            loadDraftIfMatches()
        }
    }

    private fun loadDraftIfMatches() {
        val draft = matchDraftRepository?.load() ?: return
        // Only restore draft if it matches the current game type and players
        if (draft.gameTypeId != gameType.id) return
        if (draft.playerIds.toSet() != players.map { it.id }.toSet()) return
        
        state = state.copy(rounds = draft.rounds)
    }

    private fun loadMatchForEditing(matchId: String) {
        if (matchRepository == null || gameTypeRepository == null) return
        val match = matchRepository.findById(matchId) ?: return
        val gameType = gameTypeRepository.findById(match.gameTypeId) ?: return
        val players = playerRepository?.getAll(includeInactive = true)?.filter { 
            it.id in match.playerScores.map { ps -> ps.playerId } 
        } ?: return

        val rounds = reconstructRounds(match)

        state = state.copy(
            gameType = gameType,
            players = players,
            rounds = rounds,
            editingMatchId = matchId
        )
    }

    private fun reconstructRounds(match: com.scoreo.domain.model.Match): List<Map<String, String>> {
        // All matches are stored with playerScores (total per player)
        // Reconstruct as 1 round with these totals.
        return listOf(
            match.playerScores.associate { ps ->
                ps.playerId to ps.score.toString()
            }
        )
    }

    fun handle(intent: ScoreDetailIntent) {
        when (intent) {
            is ScoreDetailIntent.UpdateScore -> {
                val rounds = state.rounds.toMutableList()
                rounds[intent.roundIndex] = rounds[intent.roundIndex] + (intent.playerId to intent.value)
                state = state.copy(rounds = rounds, error = null)
                // Save draft auto-save on every score update
                saveDraft()
            }

            is ScoreDetailIntent.AddRound -> {
                state = state.copy(rounds = state.rounds + emptyMap(), error = null)
                saveDraft()
            }

            is ScoreDetailIntent.RemoveRound -> {
                if (state.rounds.size > 1 && intent.index in state.rounds.indices) {
                    val rounds = state.rounds.toMutableList()
                    rounds.removeAt(intent.index)
                    state = state.copy(rounds = rounds)
                }
            }

            is ScoreDetailIntent.CancelMatch -> {
                // Show confirm dialog only if there's data entered
                if (hasUnsavedScores()) {
                    state = state.copy(showCancelConfirm = true)
                } else {
                    // No data, cancel immediately
                    clearDraft()
                    state = state.copy(cancelled = true)
                }
            }

            is ScoreDetailIntent.ConfirmCancel -> {
                clearDraft()
                state = state.copy(cancelled = true)
            }

            is ScoreDetailIntent.DismissCancelConfirm -> {
                state = state.copy(showCancelConfirm = false)
            }

            is ScoreDetailIntent.Terminate -> {
                validateRounds().fold(
                    onFailure = { e ->
                        state = state.copy(error = e.message)
                        return@handle
                    },
                    onSuccess = {
                        if (gameType.winCondition == WinCondition.MANUAL) {
                            state = state.copy(showWinnerModal = true, modalWinners = emptySet(), error = null)
                            return@handle
                        }
                        val playerScores = state.players.map { player ->
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
                )
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
                val playerScores = state.players.map { player ->
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
                val playerScores = state.players.map { player ->
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
                val playerScores = state.players.map { player ->
                    PlayerScore(player.id, state.totals[player.id] ?: 0)
                }
                saveMatch(
                    playerScores,
                    manualWinners = state.manualSelectionWinners.toList(),
                    secondaryPlayerScores = state.collectedSecondaryScores,
                )
            }

             is ScoreDetailIntent.KeepTie -> {
                 val playerScores = state.players.map { player ->
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

    private fun validateRounds(): Result<List<Map<String, String>>> {
        // Check at least 1 round
        if (state.rounds.isEmpty()) {
            return Result.failure(Exception("At least one round is required"))
        }
        
        // Validate each cell: empty ("") is OK, non-empty must be integer
        state.rounds.forEachIndexed { roundIndex, round ->
            round.forEach { (playerId, scoreStr) ->
                if (scoreStr.isNotEmpty() && scoreStr.toIntOrNull() == null) {
                    val playerName = state.players.find { it.id == playerId }?.name ?: playerId
                    return Result.failure(
                        Exception("Invalid score for $playerName in round ${roundIndex + 1}: expected a number")
                    )
                }
            }
        }
        
        return Result.success(state.rounds)
    }

    private fun saveMatch(
        playerScores: List<PlayerScore>,
        manualWinners: List<String> = emptyList(),
        secondaryPlayerScores: List<PlayerScore> = emptyList(),
    ) {
        try {
            val editingId = state.editingMatchId
            if (editingId != null && updateMatchUseCase != null && matchRepository != null) {
                // Update existing match
                val originalMatch = matchRepository.findById(editingId) ?: run {
                    state = state.copy(error = "Could not find original match to update")
                    return
                }
                val updatedMatch = originalMatch.copy(
                    playerScores = playerScores,
                    manualWinners = manualWinners,
                    secondaryPlayerScores = secondaryPlayerScores,
                )
                updateMatchUseCase(updatedMatch)
                clearDraft()
                state = state.copy(saved = true)
            } else {
                // Create new match
                val result = createMatch(
                    gameTypeId = gameType.id,
                    playerScores = playerScores,
                    date = currentDate(),
                    manualWinners = manualWinners,
                    secondaryPlayerScores = secondaryPlayerScores,
                )
                result.fold(
                    onSuccess = { 
                        clearDraft()
                        state = state.copy(saved = true) 
                    },
                    onFailure = { e -> state = state.copy(error = e.message) },
                )
            }
        } catch (e: Exception) {
            state = state.copy(error = "Failed to save match: ${e.message}")
        }
    }

    fun reset() {
        state = ScoreDetailState(gameType = gameType, players = players)
        clearDraft()
    }

    private fun saveDraft() {
         if (matchDraftRepository == null) return
         val draft = com.scoreo.domain.model.MatchDraft(
             gameTypeId = gameType.id,
             playerIds = state.players.map { it.id },
             rounds = state.rounds,
         )
         matchDraftRepository.save(draft)
     }

    private fun clearDraft() {
        matchDraftRepository?.clear()
    }

    private fun hasUnsavedScores(): Boolean {
        // Check if any cell has data (non-empty, non-whitespace)
        state.rounds.forEach { round ->
            round.forEach { (_, value) ->
                if (value.trim().isNotEmpty()) return true
            }
        }
        return false
    }
}
