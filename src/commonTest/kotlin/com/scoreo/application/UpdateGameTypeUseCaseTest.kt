package com.scoreo.application

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals

class UpdateGameTypeUseCaseTest {

    @Test
    fun `updates game type in repository`() {
        val repo = InMemoryGameTypeRepository()
        val addUseCase = AddGameTypeUseCase(repo)
        val updateUseCase = UpdateGameTypeUseCase(repo)
        
        val created = addUseCase("Belote", WinCondition.HIGHEST_SCORE)
        val updated = created.copy(name = "Belote Updated")
        updateUseCase(updated)
        
        val result = repo.findById(created.id)
        assertEquals("Belote Updated", result?.name)
    }

    @Test
    fun `updates tie break rule`() {
        val repo = InMemoryGameTypeRepository()
        val addUseCase = AddGameTypeUseCase(repo)
        val updateUseCase = UpdateGameTypeUseCase(repo)
        
        val created = addUseCase("Golf", WinCondition.HIGHEST_SCORE)
        val updated = created.copy(
            tieBreakRule = TieBreakRule.SECONDARY_SCORE,
            tieBreakCondition = WinCondition.LOWEST_SCORE,
            tieBreakLabel = "Handicap",
        )
        updateUseCase(updated)
        
        val result = repo.findById(created.id)
        assertEquals(TieBreakRule.SECONDARY_SCORE, result?.tieBreakRule)
        assertEquals(WinCondition.LOWEST_SCORE, result?.tieBreakCondition)
        assertEquals("Handicap", result?.tieBreakLabel)
    }

    @Test
    fun `preserves game type id`() {
        val repo = InMemoryGameTypeRepository()
        val addUseCase = AddGameTypeUseCase(repo)
        val updateUseCase = UpdateGameTypeUseCase(repo)
        
        val created = addUseCase("Belote", WinCondition.HIGHEST_SCORE)
        val originalId = created.id
        val updated = created.copy(name = "Belote Updated")
        updateUseCase(updated)
        
        val result = repo.findById(originalId)
        assertEquals(originalId, result?.id)
    }
}
