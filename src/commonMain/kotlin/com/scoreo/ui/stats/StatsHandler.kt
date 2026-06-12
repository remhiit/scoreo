package com.scoreo.ui.stats

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetHeadToHeadUseCase

class StatsHandler(
    private val getHeadToHead: GetHeadToHeadUseCase,
    private val getGameTypes: GetGameTypesUseCase,
) {
    var state by mutableStateOf(StatsState())
        private set

    fun handle(intent: StatsIntent) {
        when (intent) {
            is StatsIntent.SelectPlayer -> state = state.copy(selectedPlayerId = intent.playerId)
            is StatsIntent.BackToLeaderboard -> state = state.copy(selectedPlayerId = null)
            is StatsIntent.SelectGameType -> {
                state = state.copy(selectedGameTypeId = intent.gameTypeId)
                refresh()
            }
        }
    }

    fun refresh() {
        val gameTypes = getGameTypes()
        state = StatsState(
            leaderboard = getHeadToHead(gameTypeId = state.selectedGameTypeId),
            gameTypes = gameTypes,
            selectedGameTypeId = state.selectedGameTypeId,
        )
    }
}
