package com.scoreo.application

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.TieBreakRule
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
    fun `passes when manualWinners provided with non-MANUAL win condition (tie-break)`() {
        val (useCase, matchRepo) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 10)), 1767225600000L, manualWinners = listOf("p1"))
        assertTrue(result.isSuccess)
        assertEquals(listOf("p1"), matchRepo.getAll().first().manualWinners)
    }

    @Test
    fun `fails when manualWinners not a subset of playerScores`() {
        val (useCase, _) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase("gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)), 1767225600000L, manualWinners = listOf("unknown"))
        assertTrue(result.isFailure)
    }

    @Test
    fun `stores secondaryPlayerScores when provided`() {
        val (useCase, matchRepo) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase(
            "gt1",
            listOf(PlayerScore("p1", 10), PlayerScore("p2", 10)),
            1767225600000L,
            secondaryPlayerScores = listOf(PlayerScore("p1", 50), PlayerScore("p2", 75)),
        )
        assertTrue(result.isSuccess)
        assertEquals(2, matchRepo.getAll().first().secondaryPlayerScores.size)
    }

    @Test
    fun `fails when secondaryPlayerScores has unknown playerId`() {
        val (useCase, _) = setup(WinCondition.HIGHEST_SCORE)
        val result = useCase(
            "gt1",
            listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)),
            1767225600000L,
            secondaryPlayerScores = listOf(PlayerScore("unknown", 50)),
        )
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
