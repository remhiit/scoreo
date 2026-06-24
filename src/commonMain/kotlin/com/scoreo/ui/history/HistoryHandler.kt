package com.scoreo.ui.history

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.DeleteMatchUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

class HistoryHandler(
    private val getMatches: GetMatchesUseCase,
    private val getPlayers: GetPlayersUseCase,
    private val getGameTypes: GetGameTypesUseCase,
    private val deleteMatchUseCase: DeleteMatchUseCase,
) {
    var state by mutableStateOf(HistoryState())
        private set

    fun handle(intent: HistoryIntent) {
        when (intent) {
            is HistoryIntent.Refresh -> refresh()
            is HistoryIntent.ShowDeleteConfirm -> {
                state = state.copy(deleteConfirmMatchId = intent.matchId)
            }
            is HistoryIntent.DeleteMatch -> {
                try {
                    deleteMatchUseCase(intent.matchId)
                    state = state.copy(deleteConfirmMatchId = null, error = null)
                    refresh()
                } catch (e: Exception) {
                    state = state.copy(error = "Failed to delete match: ${e.message}")
                }
            }
            is HistoryIntent.DismissDeleteConfirm -> {
                state = state.copy(deleteConfirmMatchId = null)
            }
        }
    }

    private fun refresh() {
        val playerMap = getPlayers(includeInactive = true).associateBy { it.id }
        val gameTypeMap = getGameTypes().associateBy { it.id }
        state = HistoryState(
            displays = getMatches().sortedByDescending { it.date }.map { match ->
                val gameType = gameTypeMap[match.gameTypeId]
                val dateFormatted = try {
                    Instant.fromEpochMilliseconds(match.date)
                        .toLocalDateTime(TimeZone.currentSystemDefault())
                        .date.toString()
                } catch (_: Exception) { "??" }
                MatchDisplay(
                    match = match,
                    gameType = gameType,
                    players = playerMap,
                    playerLabels = playerMap.mapValues { (_, p) ->
                        if (p.active) p.name else if (p.name.isBlank()) "Deleted player" else "${p.name} (deleted)"
                    },
                    winners = gameType?.let { match.getWinners(it) } ?: emptyList(),
                    dateFormatted = dateFormatted,
                    isTieBreakIndeterminate = gameType?.let { match.isTieBreakIndeterminate(it) } ?: false,
                )
            },
            deleteConfirmMatchId = null,
            error = null,
        )
    }
}
