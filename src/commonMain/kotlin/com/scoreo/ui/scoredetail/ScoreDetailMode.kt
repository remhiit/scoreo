package com.scoreo.ui.scoredetail

import com.scoreo.application.UpdateMatchUseCase
import com.scoreo.domain.port.GameTypeRepository
import com.scoreo.domain.port.MatchRepository
import com.scoreo.domain.port.PlayerRepository

sealed class ScoreDetailMode {
    object Create : ScoreDetailMode()
    
    data class Edit(
        val matchId: String,
        val updateMatchUseCase: UpdateMatchUseCase,
        val matchRepository: MatchRepository,
        val playerRepository: PlayerRepository,
        val gameTypeRepository: GameTypeRepository,
    ) : ScoreDetailMode()
}
