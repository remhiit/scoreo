package com.scoreo.ui.history

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player

data class MatchDisplay(
    val match: Match,
    val gameType: GameType?,
    val players: Map<String, Player>,
    val winners: List<String>,
)

class HistoryHandler(
    private val getMatches: GetMatchesUseCase,
    private val getPlayers: GetPlayersUseCase,
    private val getGameTypes: GetGameTypesUseCase,
) {
    val state by mutableStateOf(buildState())

    private fun buildState(): List<MatchDisplay> {
        val playerMap = getPlayers().associateBy { it.id }
        val gameTypeMap = getGameTypes().associateBy { it.id }
        return getMatches().sortedByDescending { it.date }.map { match ->
            val gameType = gameTypeMap[match.gameTypeId]
            MatchDisplay(
                match = match,
                gameType = gameType,
                players = playerMap,
                winners = gameType?.let { match.getWinners(it) } ?: emptyList(),
            )
        }
    }
}
