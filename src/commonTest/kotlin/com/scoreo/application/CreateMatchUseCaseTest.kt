package com.scoreo.application

import com.scoreo.FakeGameTypeRepository
import com.scoreo.FakeMatchRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class CreateMatchUseCaseTest {

    private fun setup(winCondition: WinCondition): Pair<CreateMatchUseCase, FakeMatchRepository> {
        val gameTypeRepo = FakeGameTypeRepository()
        val matchRepo = FakeMatchRepository()
        gameTypeRepo.save(GameType("gt1", "TestGame", winCondition))
        val useCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        return Pair(useCase, matchRepo)
    }

    @Test
    fun `creates match with valid data`() {
        val (useCase, matchRepo) = setup(WinCondition.HIGHEST_SCORE)
        useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), 1767225600000L)
        assertEquals(1, matchRepo.getAll().size)
    }

    @Test
    fun `throws when game type not found`() {
        val (useCase, _) = setup(WinCondition.HIGHEST_SCORE)
        assertFailsWith<IllegalArgumentException> {
            useCase("unknown", listOf(PlayerScore("p1", 10)), 1767225600000L)
        }
    }

    @Test
    fun `stores manual winners when MANUAL condition`() {
        val (useCase, matchRepo) = setup(WinCondition.MANUAL)
        useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), 1767225600000L, manualWinners = listOf("p1"))
        assertEquals(listOf("p1"), matchRepo.getAll().first().manualWinners)
    }
}
