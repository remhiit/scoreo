package com.scoreo.application

import com.scoreo.FakePlayerRepository
import com.scoreo.domain.model.Player
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class DeletePlayerUseCaseTest {

    @Test
    fun `delete marks player as inactive`() {
        val repo = FakePlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = DeletePlayerUseCase(repo)

        useCase("p1")

        val all = repo.getAll(includeInactive = true)
        assertEquals(1, all.size)
        assertFalse(all.first().active)
    }

    @Test
    fun `delete keeps name by default`() {
        val repo = FakePlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = DeletePlayerUseCase(repo)

        useCase("p1")

        val all = repo.getAll(includeInactive = true)
        assertEquals("Alice", all.first().name)
    }

    @Test
    fun `delete with anonymize blanks name`() {
        val repo = FakePlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = DeletePlayerUseCase(repo)

        useCase("p1", anonymize = true)

        val all = repo.getAll(includeInactive = true)
        assertEquals("", all.first().name)
    }

    @Test
    fun `active players excluded by default after delete`() {
        val repo = FakePlayerRepository()
        repo.save(Player("p1", "Alice"))
        repo.save(Player("p2", "Bob"))
        val useCase = DeletePlayerUseCase(repo)

        useCase("p1")

        val active = repo.getAll()
        assertEquals(1, active.size)
        assertEquals("Bob", active.first().name)
    }

    @Test
    fun `delete non-existent id does not throw`() {
        val repo = FakePlayerRepository()
        val useCase = DeletePlayerUseCase(repo)

        useCase("non_existent")
        // should not throw
    }

    @Test
    fun `delete is idempotent`() {
        val repo = FakePlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = DeletePlayerUseCase(repo)

        useCase("p1")
        useCase("p1") // second delete

        val all = repo.getAll(includeInactive = true)
        assertEquals(1, all.size)
        assertFalse(all.first().active)
    }
}
