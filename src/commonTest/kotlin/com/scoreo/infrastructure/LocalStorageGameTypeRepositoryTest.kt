package com.scoreo.infrastructure

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import com.scoreo.infrastructure.fake.FakeLocalStorage
import com.scoreo.infrastructure.fake.LocalStorageGameTypeRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class LocalStorageGameTypeRepositoryTest {
    
    private val fakeStorage = FakeLocalStorage()
    private val repo = LocalStorageGameTypeRepository(fakeStorage)
    
    @Test
    fun getAll_empty() {
        val result = repo.getAll()
        assertEquals(0, result.size)
    }
    
    @Test
    fun save_and_getAll() {
        val gt = GameType(
            id = "1",
            name = "Belote",
            winCondition = WinCondition.HIGHEST_SCORE,
            tieBreakRule = TieBreakRule.NONE,
            tieBreakCondition = WinCondition.HIGHEST_SCORE,
            tieBreakLabel = null,
            active = true
        )
        repo.save(gt)
        
        val result = repo.getAll()
        assertEquals(1, result.size)
        assertEquals(gt, result[0])
    }
    
    @Test
    fun saveAll_multiple() {
        val gt1 = GameType("1", "Belote", WinCondition.HIGHEST_SCORE)
        val gt2 = GameType("2", "Tarot", WinCondition.LOWEST_SCORE)
        
        repo.saveAll(listOf(gt1, gt2))
        
        val result = repo.getAll()
        assertEquals(2, result.size)
    }
    
    @Test
    fun findById_exists() {
        val gt = GameType("test-id", "Test Game", WinCondition.MANUAL)
        repo.save(gt)
        
        val found = repo.findById("test-id")
        assertEquals(gt, found)
    }
    
    @Test
    fun findById_notExists() {
        val found = repo.findById("nonexistent")
        assertNull(found)
    }
    
    @Test
    fun roundtrip_serialization() {
        val original = GameType(
            id = "round-trip",
            name = "Game Name",
            winCondition = WinCondition.MANUAL,
            tieBreakRule = TieBreakRule.SECONDARY_SCORE,
            tieBreakCondition = WinCondition.LOWEST_SCORE,
            tieBreakLabel = "Cards",
            active = true
        )
        repo.save(original)
        
        val loaded = repo.findById("round-trip")
        assertEquals(original, loaded)
    }
    
    @Test
    fun getAll_excludeInactive() {
        val active = GameType("1", "Active", WinCondition.HIGHEST_SCORE, active = true)
        val inactive = GameType("2", "Inactive", WinCondition.HIGHEST_SCORE, active = false)
        
        repo.saveAll(listOf(active, inactive))
        
        val result = repo.getAll(includeInactive = false)
        assertEquals(1, result.size)
        assertEquals("Active", result[0].name)
    }
    
    @Test
    fun getAll_includeInactive() {
        val active = GameType("1", "Active", WinCondition.HIGHEST_SCORE, active = true)
        val inactive = GameType("2", "Inactive", WinCondition.HIGHEST_SCORE, active = false)
        
        repo.saveAll(listOf(active, inactive))
        
        val result = repo.getAll(includeInactive = true)
        assertEquals(2, result.size)
    }
    
    @Test
    fun default_tieBreakRule_applied() {
        val stored = GameType("1", "Test", WinCondition.HIGHEST_SCORE)
        repo.save(stored)
        
        val loaded = repo.findById("1")
        assertEquals(TieBreakRule.NONE, loaded?.tieBreakRule)
    }
    
    @Test
    fun default_active_applied() {
        val stored = GameType("1", "Test", WinCondition.HIGHEST_SCORE)
        repo.save(stored)
        
        val loaded = repo.findById("1")
        assertEquals(true, loaded?.active)
    }
}
