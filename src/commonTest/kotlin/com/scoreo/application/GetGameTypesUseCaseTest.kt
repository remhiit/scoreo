package com.scoreo.application

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertNull

class GetGameTypesUseCaseTest {

    @Test
    fun `returns empty list when no game types saved`() {
        val repo = InMemoryGameTypeRepository()
        val useCase = GetGameTypesUseCase(repo)
        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `returns all saved game types`() {
        val repo = InMemoryGameTypeRepository()
        repo.save(GameType("1", "Belote", WinCondition.HIGHEST_SCORE))
        repo.save(GameType("2", "Golf", WinCondition.LOWEST_SCORE))
        val useCase = GetGameTypesUseCase(repo)
        val result = useCase()
        assertEquals(2, result.size)
        assertEquals(listOf("Belote", "Golf"), result.map { it.name })
    }

    @Test
    fun `excludes inactive game types by default`() {
        val repo = InMemoryGameTypeRepository()
        repo.save(GameType("1", "Belote", WinCondition.HIGHEST_SCORE, active = true))
        repo.save(GameType("2", "Golf", WinCondition.LOWEST_SCORE, active = false))
        repo.save(GameType("3", "Bridge", WinCondition.HIGHEST_SCORE, active = true))
        val useCase = GetGameTypesUseCase(repo)
        val result = useCase()
        assertEquals(2, result.size)
        assertEquals(listOf("Belote", "Bridge"), result.map { it.name })
    }

    @Test
    fun `findById includes inactive games`() {
        val repo = InMemoryGameTypeRepository()
        val archivedGame = GameType("1", "Archived", WinCondition.HIGHEST_SCORE, active = false)
        repo.save(archivedGame)
        
        val found = repo.findById("1")
        assertEquals("Archived", found?.name)
        assertEquals(false, found?.active)
    }

    @Test
    fun `getAll with includeInactive true returns all games`() {
        val repo = InMemoryGameTypeRepository()
        repo.save(GameType("1", "Belote", WinCondition.HIGHEST_SCORE, active = true))
        repo.save(GameType("2", "Golf", WinCondition.LOWEST_SCORE, active = false))
        repo.save(GameType("3", "Bridge", WinCondition.HIGHEST_SCORE, active = true))
        val result = repo.getAll(includeInactive = true)
        assertEquals(3, result.size)
        assertEquals(listOf("Belote", "Golf", "Bridge"), result.map { it.name })
    }
}

