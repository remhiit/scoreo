package com.scoreo.application

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class ArchiveGameTypeUseCaseTest {

    private lateinit var gameTypeRepository: InMemoryGameTypeRepository
    private lateinit var useCase: ArchiveGameTypeUseCase

    @Test
    fun `archive game type sets active to false`() {
        gameTypeRepository = InMemoryGameTypeRepository()
        useCase = ArchiveGameTypeUseCase(gameTypeRepository)
        
        val gameType = GameType(id = "g1", name = "Belote", winCondition = WinCondition.HIGHEST_SCORE)
        gameTypeRepository.save(gameType)
        
        useCase.invoke("g1")
        
        val archived = gameTypeRepository.findById("g1")!!
        assertEquals(false, archived.active)
    }

    @Test
    fun `archive preserves game type id and name`() {
        gameTypeRepository = InMemoryGameTypeRepository()
        useCase = ArchiveGameTypeUseCase(gameTypeRepository)
        
        val gameType = GameType(id = "g1", name = "Belote", winCondition = WinCondition.HIGHEST_SCORE)
        gameTypeRepository.save(gameType)
        
        useCase.invoke("g1")
        
        val archived = gameTypeRepository.findById("g1")!!
        assertEquals("g1", archived.id)
        assertEquals("Belote", archived.name)
    }

    @Test
    fun `archive non-existent game type throws`() {
        gameTypeRepository = InMemoryGameTypeRepository()
        useCase = ArchiveGameTypeUseCase(gameTypeRepository)
        
        assertFailsWith<IllegalArgumentException> {
            useCase.invoke("nonexistent")
        }
    }
}
