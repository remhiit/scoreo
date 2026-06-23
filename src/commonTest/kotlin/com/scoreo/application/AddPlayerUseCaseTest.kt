package com.scoreo.application

import com.scoreo.domain.DomainError
import com.scoreo.infrastructure.InMemoryPlayerRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class AddPlayerUseCaseTest {

    @Test
    fun `adds player to repository`() {
        val repo = InMemoryPlayerRepository()
        val useCase = AddPlayerUseCase(repo)

        useCase("Alice")

        assertEquals(1, repo.getAll().size)
        assertEquals("Alice", repo.getAll().first().name)
    }

    @Test
    fun `trims whitespace from name`() {
        val repo = InMemoryPlayerRepository()
        val useCase = AddPlayerUseCase(repo)

        useCase("  Bob  ")

        assertEquals("Bob", repo.getAll().first().name)
    }

    @Test
    fun `each player gets a unique id`() {
        val repo = InMemoryPlayerRepository()
        val useCase = AddPlayerUseCase(repo)

        useCase("Alice")
        useCase("Bob")

        val ids = repo.getAll().map { it.id }
        assertNotEquals(ids[0], ids[1])
    }

    @Test
    fun `multiple players are all saved`() {
        val repo = InMemoryPlayerRepository()
        val useCase = AddPlayerUseCase(repo)

        useCase("Alice")
        useCase("Bob")
        useCase("Charlie")

        assertEquals(3, repo.getAll().size)
    }

    @Test
    fun `rejects name exceeding 50 characters`() {
        val repo = InMemoryPlayerRepository()
        val useCase = AddPlayerUseCase(repo)
        val longName = "A".repeat(51)
        val exception = assertFailsWith<DomainError.Validation> {
            useCase(longName)
        }
        assertTrue(exception.message!!.contains("50"))
    }

    @Test
    fun `accepts name of exactly 50 characters`() {
        val repo = InMemoryPlayerRepository()
        val useCase = AddPlayerUseCase(repo)
        val name = "A".repeat(50)
        val player = useCase(name)
        assertEquals(50, player.name.length)
    }
}
