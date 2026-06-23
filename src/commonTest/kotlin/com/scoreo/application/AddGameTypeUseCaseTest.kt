package com.scoreo.application

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class AddGameTypeUseCaseTest {

    @Test
    fun `adds game type to repository`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("Belote", WinCondition.HIGHEST_SCORE)
        assertEquals(1, repo.getAll().size)
        assertEquals("Belote", repo.getAll().first().name)
    }

    @Test
    fun `trims whitespace from name`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("  Golf  ", WinCondition.LOWEST_SCORE)
        assertEquals("Golf", repo.getAll().first().name)
    }

    @Test
    fun `each game type gets a unique id`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("Belote", WinCondition.HIGHEST_SCORE)
        useCase("Golf", WinCondition.LOWEST_SCORE)
        val ids = repo.getAll().map { it.id }
        assertNotEquals(ids[0], ids[1])
    }

    @Test
    fun `returns the created game type`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        val result = useCase("Belote", WinCondition.HIGHEST_SCORE)
        assertNotNull(result.id)
        assertEquals("Belote", result.name)
        assertEquals(WinCondition.HIGHEST_SCORE, result.winCondition)
    }

    @Test
    fun `stores winCondition correctly`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("Golf", WinCondition.LOWEST_SCORE)
        assertEquals(WinCondition.LOWEST_SCORE, repo.getAll().first().winCondition)
    }

    @Test
    fun `multiple game types are all saved`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        useCase("A", WinCondition.HIGHEST_SCORE)
        useCase("B", WinCondition.LOWEST_SCORE)
        useCase("C", WinCondition.MANUAL)
        assertEquals(3, repo.getAll().size)
    }

    @Test
    fun `rejects name exceeding 50 characters`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        val longName = "A".repeat(51)
        val exception = assertFailsWith<IllegalArgumentException> {
            useCase(longName, WinCondition.HIGHEST_SCORE)
        }
        assertTrue(exception.message!!.contains("50"))
    }

    @Test
    fun `accepts name of exactly 50 characters`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = AddGameTypeUseCase(repo)
        val name = "A".repeat(50)
        val gameType = useCase(name, WinCondition.HIGHEST_SCORE)
        assertEquals(50, gameType.name.length)
    }
}
