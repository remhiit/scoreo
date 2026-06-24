package com.scoreo.application

import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import kotlin.test.Test
import kotlin.test.assertEquals

class DeleteMatchUseCaseTest {
    private lateinit var matchRepository: InMemoryMatchRepository
    private lateinit var useCase: DeleteMatchUseCase

    private fun setup() {
        matchRepository = InMemoryMatchRepository()
        useCase = DeleteMatchUseCase(matchRepository)
    }

    @Test
    fun testDeleteExistingMatch() {
        setup()
        val match = Match(id = "m1", gameTypeId = "g1", date = 1000L, playerScores = listOf())
        matchRepository.save(match)

        useCase.invoke("m1")

        assertEquals(0, matchRepository.getAll().size)
    }

    @Test
    fun testDeleteNonExistentMatch() {
        setup()
        // Should not throw
        useCase.invoke("nonexistent")
        assertEquals(0, matchRepository.getAll().size)
    }

    @Test
    fun testDeleteDoesNotAffectOtherMatches() {
        setup()
        val m1 = Match(id = "m1", gameTypeId = "g1", date = 1000L, playerScores = listOf())
        val m2 = Match(id = "m2", gameTypeId = "g1", date = 2000L, playerScores = listOf())
        matchRepository.save(m1)
        matchRepository.save(m2)

        useCase.invoke("m1")

        assertEquals(1, matchRepository.getAll().size)
        assertEquals("m2", matchRepository.getAll()[0].id)
    }
}
