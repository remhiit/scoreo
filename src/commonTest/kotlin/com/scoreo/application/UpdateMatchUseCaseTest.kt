package com.scoreo.application

import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import kotlin.test.Test
import kotlin.test.assertEquals

class UpdateMatchUseCaseTest {
    private lateinit var matchRepository: InMemoryMatchRepository
    private lateinit var useCase: UpdateMatchUseCase

    private fun setup() {
        matchRepository = InMemoryMatchRepository()
        useCase = UpdateMatchUseCase(matchRepository)
    }

    @Test
    fun testUpdateExistingMatch() {
        setup()
        val original = Match(
            id = "m1",
            gameTypeId = "g1",
            date = 1000L,
            playerScores = listOf(PlayerScore("p1", 10))
        )
        matchRepository.save(original)

        val updated = original.copy(playerScores = listOf(PlayerScore("p1", 20)))
        useCase.invoke(updated)

        val loaded = matchRepository.findById("m1")
        assertEquals(20, loaded?.playerScores?.get(0)?.score)
    }

    @Test
    fun testUpdatePreservesMatchId() {
        setup()
        val original = Match(
            id = "m1",
            gameTypeId = "g1",
            date = 1000L,
            playerScores = listOf()
        )
        matchRepository.save(original)

        val updated = original.copy(playerScores = listOf(PlayerScore("p1", 5)))
        useCase.invoke(updated)

        assertEquals("m1", matchRepository.getAll()[0].id)
    }

    @Test
    fun testUpdatePreservesDate() {
        setup()
        val original = Match(
            id = "m1",
            gameTypeId = "g1",
            date = 1000L,
            playerScores = listOf(PlayerScore("p1", 10))
        )
        matchRepository.save(original)

        val updated = original.copy(playerScores = listOf(PlayerScore("p1", 20)))
        useCase.invoke(updated)

        val loaded = matchRepository.findById("m1")
        assertEquals(1000L, loaded?.date)
    }
}
