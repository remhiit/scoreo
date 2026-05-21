package com.scoreo.application

import com.scoreo.FakePlayerRepository
import com.scoreo.domain.model.Player
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GetPlayersUseCaseTest {

    @Test
    fun `returns empty list when no players saved`() {
        val repo = FakePlayerRepository()
        val useCase = GetPlayersUseCase(repo)

        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `returns all saved players`() {
        val repo = FakePlayerRepository()
        repo.save(Player(id = "1", name = "Alice"))
        repo.save(Player(id = "2", name = "Bob"))
        val useCase = GetPlayersUseCase(repo)

        val result = useCase()

        assertEquals(2, result.size)
        assertEquals(listOf("Alice", "Bob"), result.map { it.name })
    }
}
