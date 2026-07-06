package com.scoreo.infrastructure

import com.scoreo.domain.model.MatchDraft
import com.scoreo.infrastructure.fake.FakeLocalStorage
import com.scoreo.infrastructure.fake.LocalStorageMatchDraftRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LocalStorageMatchDraftRepositoryTest {
    
    private val fakeStorage = FakeLocalStorage()
    private val repo = LocalStorageMatchDraftRepository(fakeStorage)
    
    @Test
    fun load_empty() {
        val result = repo.load()
        assertNull(result)
    }
    
    @Test
    fun save_and_load() {
        val draft = MatchDraft(
            gameTypeId = "gt1",
            playerIds = listOf("p1", "p2"),
            rounds = listOf(mapOf("p1" to "10", "p2" to "5")),
            updatedAt = 1000L
        )
        repo.save(draft)
        
        val loaded = repo.load()
        assertEquals(draft, loaded)
    }
    
    @Test
    fun save_overwrites_previous() {
        val draft1 = MatchDraft("gt1", listOf("p1", "p2"), listOf(), 1000L)
        val draft2 = MatchDraft("gt2", listOf("p1", "p3"), listOf(), 2000L)
        
        repo.save(draft1)
        repo.save(draft2)
        
        val loaded = repo.load()
        assertEquals(draft2, loaded)
    }
    
    @Test
    fun clear_removes_draft() {
        val draft = MatchDraft("gt1", listOf("p1", "p2"), listOf(), 1000L)
        repo.save(draft)
        repo.clear()
        
        val loaded = repo.load()
        assertNull(loaded)
    }
    
    @Test
    fun roundtrip_serialization() {
        val original = MatchDraft(
            gameTypeId = "game-type-id",
            playerIds = listOf("player1", "player2", "player3"),
            rounds = listOf(
                mapOf("player1" to "10", "player2" to "5", "player3" to "8"),
                mapOf("player1" to "15", "player2" to "12", "player3" to "10")
            ),
            updatedAt = 1672566300000L
        )
        repo.save(original)
        
        val loaded = repo.load()
        assertEquals(original, loaded)
    }
    
    @Test
    fun multiple_rounds() {
        val draft = MatchDraft(
            gameTypeId = "gt1",
            playerIds = listOf("p1", "p2"),
            rounds = listOf(
                mapOf("p1" to "10", "p2" to "5"),
                mapOf("p1" to "8", "p2" to "12"),
                mapOf("p1" to "15", "p2" to "10")
            ),
            updatedAt = 1000L
        )
        repo.save(draft)
        
        val loaded = repo.load()
        assertEquals(3, loaded?.rounds?.size)
    }
    
    @Test
    fun empty_rounds() {
        val draft = MatchDraft(
            gameTypeId = "gt1",
            playerIds = listOf("p1", "p2"),
            rounds = emptyList(),
            updatedAt = 1000L
        )
        repo.save(draft)
        
        val loaded = repo.load()
        assertEquals(0, loaded?.rounds?.size)
    }
}
