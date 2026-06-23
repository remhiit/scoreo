package com.scoreo.application

import com.scoreo.domain.DomainError
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.GameTypeRepository

private const val MAX_NAME_LENGTH = 50

class AddGameTypeUseCase(private val repository: GameTypeRepository) {
    operator fun invoke(
        name: String,
        winCondition: WinCondition,
        tieBreakRule: TieBreakRule = TieBreakRule.NONE,
        tieBreakCondition: WinCondition = WinCondition.HIGHEST_SCORE,
        tieBreakLabel: String? = null,
    ): GameType {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) throw DomainError.Validation("name", "Game type name must not be blank")
        if (trimmed.length > MAX_NAME_LENGTH) throw DomainError.Validation("name", "Game type name must be $MAX_NAME_LENGTH characters or less")
        val gameType = GameType(
            id = IdGenerator.newId(),
            name = trimmed,
            winCondition = winCondition,
            tieBreakRule = tieBreakRule,
            tieBreakCondition = tieBreakCondition,
            tieBreakLabel = tieBreakLabel,
        )
        repository.save(gameType)
        return gameType
    }
}
