package com.scoreo.application

import com.scoreo.FakeGameTypeRepository
import com.scoreo.FakeMatchRepository
import com.scoreo.FakePlayerRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class CreateMatchUseCaseTest {

    private fun setup(winCondition: WinCondition): Triple<CreateMatchUseCase, FakeGameTypeRepository, FakeMatchRepository> {
        val gameTypeRepo = FakeGameTypeRepository()
        val matchRepo = FakeMatchRepository()
        gameTypeRepo.save(GameType("gt1", "TestGame", winCondition))
        val useCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        return Triple(useCase, gameTypeRepo, matchRepo)
    }

    @Test
    fun `creates match with valid data`() {
        val (useCase, _, matchRepo) = setup(WinCondition.HIGHEST_SCORE)
        useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), "2026-01-01")
        assertEquals(1, matchRepo.getAll().size)
    }

    @Test
    fun `throws when game type not found`() {
        val (useCase) = setup(WinCondition.HIGHEST_SCORE)
        assertFailsWith<IllegalArgumentException> {
            useCase("unknown", listOf(PlayerScore("p1", 10)), "2026-01-01")
        }
    }

    @Test
    fun `stores manual winners when MANUAL condition`() {
        val (useCase, _, matchRepo) = setup(WinCondition.MANUAL)
        useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), "2026-01-01", manualWinners = listOf("p1"))
        assertEquals(listOf("p1"), matchRepo.getAll().first().manualWinners)
    }
}
