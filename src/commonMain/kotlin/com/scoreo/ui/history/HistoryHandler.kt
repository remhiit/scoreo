package com.scoreo.ui.history

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import kotlinx.datetime.Instant
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toLocalDateTime

data class MatchDisplay(
    val match: Match,
    val gameType: GameType?,
    val players: Map<String, Player>,
    val playerLabels: Map<String, String>,
    val winners: List<String>,
    val dateFormatted: String,
)

class HistoryHandler(
    private val getMatches: GetMatchesUseCase,
    private val getPlayers: GetPlayersUseCase,
    private val getGameTypes: GetGameTypesUseCase,
) {
    var state by mutableStateOf(emptyList<MatchDisplay>())
        private set

    fun refresh() {
        val playerMap = getPlayers(includeInactive = true).associateBy { it.id }
        val gameTypeMap = getGameTypes().associateBy { it.id }
        state = getMatches().sortedByDescending { it.date }.map { match ->
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
                    if (p.active) p.name else if (p.name.isBlank()) "Joueur supprimé" else "${p.name} (supprimé)"
                },
                winners = gameType?.let { match.getWinners(it) } ?: emptyList(),
                dateFormatted = dateFormatted,
            )
        }
    }
}
