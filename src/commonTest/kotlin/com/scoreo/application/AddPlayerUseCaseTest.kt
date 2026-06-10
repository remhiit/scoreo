package com.scoreo.application

import com.scoreo.infrastructure.InMemoryPlayerRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals

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
}
