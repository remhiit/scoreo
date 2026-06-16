package com.scoreo.application

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class CreateMatchUseCaseTest {

    private fun setup(winCondition: WinCondition): Pair<CreateMatchUseCase, InMemoryMatchRepository> {
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        gameTypeRepo.save(GameType("gt1", "TestGame", winCondition))
        val useCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        return Pair(useCase, matchRepo)
    }

    @Test
    fun `creates match with valid data`() {
        val (useCase, matchRepo) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), 1767225600000L)
        assertTrue(result.isSuccess)
        assertEquals(1, matchRepo.getAll().size)
    }

    @Test
    fun `fails when game type not found`() {
        val (useCase, _) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase("unknown", listOf(PlayerScore("p1", 10)), 1767225600000L)
        assertTrue(result.isFailure)
    }

    @Test
    fun `stores manual winners when MANUAL condition`() {
        val (useCase, matchRepo) = setup(WinCondition.MANUAL)
        val result = useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), 1767225600000L, manualWinners = listOf("p1"))
        assertTrue(result.isSuccess)
        assertEquals(listOf("p1"), matchRepo.getAll().first().manualWinners)
    }

    @Test
    fun `fails when manualWinners provided with non-MANUAL win condition`() {
        val (useCase, _) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), 1767225600000L, manualWinners = listOf("p1"))
        assertTrue(result.isFailure)
    }

    @Test
    fun `passes when manualWinners empty with non-MANUAL win condition`() {
        val (useCase, matchRepo) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), 1767225600000L)
        assertTrue(result.isSuccess)
        assertEquals(1, matchRepo.getAll().size)
    }
}
