package com.scoreo.application

import com.scoreo.domain.DomainError
import com.scoreo.domain.model.Player
import com.scoreo.infrastructure.InMemoryPlayerRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue

class RenamePlayerUseCaseTest {

    @Test
    fun `renames existing player`() {
        val repo = InMemoryPlayerRepository()
        val player = Player(id = "p1", name = "Alice")
        repo.save(player)
        val useCase = RenamePlayerUseCase(repo)

        useCase("p1", "Alicia")

        val renamed = repo.getAll()[0]
        assertEquals("Alicia", renamed.name)
        assertEquals("p1", renamed.id)
    }

    @Test
    fun `preserves player ID after rename`() {
        val repo = InMemoryPlayerRepository()
        val player = Player(id = "p1", name = "Alice")
        repo.save(player)
        val useCase = RenamePlayerUseCase(repo)

        useCase("p1", "Bob")

        assertEquals("p1", repo.getAll()[0].id)
    }

    @Test
    fun `throws when player not found`() {
        val repo = InMemoryPlayerRepository()
        val useCase = RenamePlayerUseCase(repo)

        assertFailsWith<DomainError.NotFound> {
            useCase("nonexistent", "NewName")
        }
    }

    @Test
    fun `trims whitespace from new name`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = RenamePlayerUseCase(repo)

        useCase("p1", "  Bob  ")

        assertEquals("Bob", repo.getAll()[0].name)
    }

    @Test
    fun `throws when new name is blank`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = RenamePlayerUseCase(repo)

        assertFailsWith<DomainError.Validation> {
            useCase("p1", "   ")
        }
    }

    @Test
    fun `throws when name exceeds 50 characters`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = RenamePlayerUseCase(repo)
        val longName = "A".repeat(51)

        val exception = assertFailsWith<DomainError.Validation> {
            useCase("p1", longName)
        }
        assertTrue(exception.message!!.contains("50"))
    }

    @Test
    fun `accepts name of exactly 50 characters`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = RenamePlayerUseCase(repo)
        val name = "A".repeat(50)

        useCase("p1", name)

        assertEquals(50, repo.getAll()[0].name.length)
    }

    @Test
    fun `allows renaming to same name`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val useCase = RenamePlayerUseCase(repo)

        useCase("p1", "Alice")

        assertEquals("Alice", repo.getAll()[0].name)
    }

    @Test
    fun `works with inactive players`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice", active = false))
        val useCase = RenamePlayerUseCase(repo)

        useCase("p1", "Bob")

        val inactive = repo.getAll(includeInactive = true)
        assertEquals("Bob", inactive[0].name)
        assertEquals(false, inactive[0].active)
    }
}
