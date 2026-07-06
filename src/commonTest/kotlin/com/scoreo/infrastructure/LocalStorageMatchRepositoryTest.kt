package com.scoreo.infrastructure

import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import com.scoreo.infrastructure.fake.FakeLocalStorage
import com.scoreo.infrastructure.fake.LocalStorageMatchRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LocalStorageMatchRepositoryTest {
    
    private val fakeStorage = FakeLocalStorage()
    private val repo = LocalStorageMatchRepository(fakeStorage)
    
    @Test
    fun getAll_empty() {
        val result = repo.getAll()
        assertEquals(0, result.size)
    }
    
    @Test
    fun save_and_getAll() {
        val match = Match(
            id = "match1",
            date = 1000L,
            gameTypeId = "gt1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5)
            )
        )
        repo.save(match)
        
        val result = repo.getAll()
        assertEquals(1, result.size)
        assertEquals(match, result[0])
    }
    
    @Test
    fun saveAll_multiple() {
        val m1 = Match("1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))
        val m2 = Match("2", 2000L, "gt1", listOf(PlayerScore("p2", 15)))
        
        repo.saveAll(listOf(m1, m2))
        
        val result = repo.getAll()
        assertEquals(2, result.size)
    }
    
    @Test
    fun findById() {
        val match = Match("match1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))
        repo.save(match)
        
        val found = repo.findById("match1")
        assertEquals(match, found)
    }
    
    @Test
    fun findById_notExists() {
        val found = repo.findById("nonexistent")
        assertNull(found)
    }
    
    @Test
    fun delete() {
        val match = Match("match1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))
        repo.save(match)
        
        repo.delete("match1")
        
        val result = repo.getAll()
        assertEquals(0, result.size)
    }
    
    @Test
    fun delete_nonexistent_idempotent() {
        repo.delete("nonexistent")
        assertEquals(0, repo.getAll().size)
    }
    
    @Test
    fun roundtrip_serialization() {
        val original = Match(
            id = "round-trip",
            date = 1672566300000L,
            gameTypeId = "gt1",
            playerScores = listOf(
                PlayerScore("p1", 25),
                PlayerScore("p2", 18)
            ),
            manualWinners = listOf("p1"),
            secondaryPlayerScores = listOf(PlayerScore("p1", 5), PlayerScore("p2", 3))
        )
        repo.save(original)
        
        val loaded = repo.findById("round-trip")
        assertEquals(original, loaded)
    }
    
    @Test
    fun default_empty_manual_winners() {
        val match = Match("1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))
        repo.save(match)
        
        val loaded = repo.findById("1")
        assertEquals(emptyList(), loaded?.manualWinners)
    }
    
    @Test
    fun default_empty_secondary_scores() {
        val match = Match("1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))
        repo.save(match)
        
        val loaded = repo.findById("1")
        assertEquals(emptyList(), loaded?.secondaryPlayerScores)
    }
}
