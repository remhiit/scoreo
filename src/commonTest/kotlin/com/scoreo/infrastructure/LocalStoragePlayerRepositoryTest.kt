package com.scoreo.infrastructure

import com.scoreo.domain.model.Player
import com.scoreo.infrastructure.fake.FakeLocalStorage
import com.scoreo.infrastructure.fake.LocalStoragePlayerRepository
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class LocalStoragePlayerRepositoryTest {
    
    private val fakeStorage = FakeLocalStorage()
    private val repo = LocalStoragePlayerRepository(fakeStorage)
    
    @Test
    fun getAll_empty() {
        val result = repo.getAll()
        assertEquals(0, result.size)
    }
    
    @Test
    fun save_and_getAll() {
        val player = Player(id = "1", name = "Alice", active = true)
        repo.save(player)
        
        val result = repo.getAll()
        assertEquals(1, result.size)
        assertEquals(player, result[0])
    }
    
    @Test
    fun saveAll_multiple() {
        val p1 = Player("1", "Alice")
        val p2 = Player("2", "Bob")
        
        repo.saveAll(listOf(p1, p2))
        
        val result = repo.getAll()
        assertEquals(2, result.size)
    }
    
    @Test
    fun roundtrip_serialization() {
        val original = Player("test-id", "Test Player", active = true)
        repo.save(original)
        
        val loaded = repo.getAll()[0]
        assertEquals(original, loaded)
    }
    
    @Test
    fun getAll_excludeInactive() {
        val active = Player("1", "Active", active = true)
        val inactive = Player("2", "Inactive", active = false)
        
        repo.saveAll(listOf(active, inactive))
        
        val result = repo.getAll(includeInactive = false)
        assertEquals(1, result.size)
        assertEquals("Active", result[0].name)
    }
    
    @Test
    fun getAll_includeInactive() {
        val active = Player("1", "Active", active = true)
        val inactive = Player("2", "Inactive", active = false)
        
        repo.saveAll(listOf(active, inactive))
        
        val result = repo.getAll(includeInactive = true)
        assertEquals(2, result.size)
    }
    
    @Test
    fun delete_soft_delete() {
        val player = Player("1", "Alice", active = true)
        repo.save(player)
        
        repo.delete("1", anonymize = false)
        
        val allIncluding = repo.getAll(includeInactive = true)
        val deleted = allIncluding[0]
        assertFalse(deleted.active)
        assertEquals("Alice", deleted.name)
    }
    
    @Test
    fun delete_anonymize() {
        val player = Player("1", "Alice", active = true)
        repo.save(player)
        
        repo.delete("1", anonymize = true)
        
        val allIncluding = repo.getAll(includeInactive = true)
        val deleted = allIncluding[0]
        assertFalse(deleted.active)
        assertEquals("", deleted.name)
    }
    
    @Test
    fun delete_nonexistent_idempotent() {
        repo.delete("nonexistent", anonymize = false)
        assertEquals(0, repo.getAll(includeInactive = true).size)
    }
    
    @Test
    fun default_active_applied() {
        val player = Player("1", "Test")
        repo.save(player)
        
        val loaded = repo.getAll(includeInactive = true)[0]
        assertEquals(true, loaded.active)
    }
}
