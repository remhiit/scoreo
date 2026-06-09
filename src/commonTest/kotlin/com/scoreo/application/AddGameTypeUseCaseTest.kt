package com.scoreo.application

import com.scoreo.FakeGameTypeRepository
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull

class AddGameTypeUseCaseTest {

    @Test
    fun `adds game type to repository`() {
        val repo = FakeGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("Belote", WinCondition.HIGHEST_SCORE)
        assertEquals(1, repo.getAll().size)
        assertEquals("Belote", repo.getAll().first().name)
    }

    @Test
    fun `trims whitespace from name`() {
        val repo = FakeGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("  Golf  ", WinCondition.LOWEST_SCORE)
        assertEquals("Golf", repo.getAll().first().name)
    }

    @Test
    fun `each game type gets a unique id`() {
        val repo = FakeGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("Belote", WinCondition.HIGHEST_SCORE)
        useCase("Golf", WinCondition.LOWEST_SCORE)
        val ids = repo.getAll().map { it.id }
        assertNotEquals(ids[0], ids[1])
    }

    @Test
    fun `returns the created game type`() {
        val repo = FakeGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        val result = useCase("Belote", WinCondition.HIGHEST_SCORE)
        assertNotNull(result.id)
        assertEquals("Belote", result.name)
        assertEquals(WinCondition.HIGHEST_SCORE, result.winCondition)
    }

    @Test
    fun `stores winCondition correctly`() {
        val repo = FakeGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("Golf", WinCondition.LOWEST_SCORE)
        assertEquals(WinCondition.LOWEST_SCORE, repo.getAll().first().winCondition)
    }

    @Test
    fun `multiple game types are all saved`() {
        val repo = FakeGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("A", WinCondition.HIGHEST_SCORE)
        useCase("B", WinCondition.LOWEST_SCORE)
        useCase("C", WinCondition.MANUAL)
        assertEquals(3, repo.getAll().size)
    }
}
