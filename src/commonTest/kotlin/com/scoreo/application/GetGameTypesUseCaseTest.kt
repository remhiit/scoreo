package com.scoreo.application

import com.scoreo.FakeGameTypeRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GetGameTypesUseCaseTest {

    @Test
    fun `returns empty list when no game types saved`() {
        val repo = FakeGameTypeRepository()
        val useCase = GetGameTypesUseCase(repo)
        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `returns all saved game types`() {
        val repo = FakeGameTypeRepository()
        repo.save(GameType("1", "Belote", WinCondition.HIGHEST_SCORE))
        repo.save(GameType("2", "Golf", WinCondition.LOWEST_SCORE))
        val useCase = GetGameTypesUseCase(repo)
        val result = useCase()
        assertEquals(2, result.size)
        assertEquals(listOf("Belote", "Golf"), result.map { it.name })
    }
}
