package com.scoreo.application

import com.scoreo.FakeGameTypeRepository
import com.scoreo.FakeMatchRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals

class GetPlayerStatsUseCaseTest {

    @Test
    fun `returns empty stats when no matches`() {
        val stats = GetPlayerStatsUseCase(FakeMatchRepository(), FakeGameTypeRepository())()
        assertEquals(emptyMap(), stats)
    }

    @Test
    fun `counts wins for highest score winner`() {
        val gameTypeRepo = FakeGameTypeRepository()
        val matchRepo = FakeMatchRepository()
        gameTypeRepo.save(GameType("gt1", "Game", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1767225600000L, "gt1", listOf(PlayerScore("alice", 10), PlayerScore("bob", 5))))

        val stats = GetPlayerStatsUseCase(matchRepo, gameTypeRepo)()

        assertEquals(1, stats["alice"]?.wins)
        assertEquals(0, stats["alice"]?.losses)
        assertEquals(0, stats["bob"]?.wins)
        assertEquals(1, stats["bob"]?.losses)
    }

    @Test
    fun `both players counted as winners on ex-aequo`() {
        val gameTypeRepo = FakeGameTypeRepository()
        val matchRepo = FakeMatchRepository()
        gameTypeRepo.save(GameType("gt1", "Game", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1767225600000L, "gt1", listOf(PlayerScore("alice", 10), PlayerScore("bob", 10))))

        val stats = GetPlayerStatsUseCase(matchRepo, gameTypeRepo)()

        assertEquals(1, stats["alice"]?.wins)
        assertEquals(1, stats["bob"]?.wins)
        assertEquals(0, stats["alice"]?.losses)
        assertEquals(0, stats["bob"]?.losses)
    }

    @Test
    fun `accumulates stats across multiple matches`() {
        val gameTypeRepo = FakeGameTypeRepository()
        val matchRepo = FakeMatchRepository()
        gameTypeRepo.save(GameType("gt1", "Game", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1767225600000L, "gt1", listOf(PlayerScore("alice", 10), PlayerScore("bob", 5))))
        matchRepo.save(Match("m2", 1767312000000L, "gt1", listOf(PlayerScore("alice", 3), PlayerScore("bob", 8))))

        val stats = GetPlayerStatsUseCase(matchRepo, gameTypeRepo)()

        assertEquals(1, stats["alice"]?.wins)
        assertEquals(1, stats["alice"]?.losses)
        assertEquals(1, stats["bob"]?.wins)
        assertEquals(1, stats["bob"]?.losses)
    }

    @Test
    fun `ignores matches with unknown game type`() {
        val gameTypeRepo = FakeGameTypeRepository()
        val matchRepo = FakeMatchRepository()
        matchRepo.save(Match("m1", 1000L, "unknown_gt", listOf(PlayerScore("alice", 10))))

        val stats = GetPlayerStatsUseCase(matchRepo, gameTypeRepo)()

        assertEquals(emptyMap(), stats)
    }

    @Test
    fun `uses manual winners for MANUAL condition`() {
        val gameTypeRepo = FakeGameTypeRepository()
        val matchRepo = FakeMatchRepository()
        gameTypeRepo.save(GameType("gt1", "Game", WinCondition.MANUAL))
        matchRepo.save(Match("m1", 1767225600000L, "gt1",
            listOf(PlayerScore("alice", 10), PlayerScore("bob", 5)),
            manualWinners = listOf("bob")))

        val stats = GetPlayerStatsUseCase(matchRepo, gameTypeRepo)()

        assertEquals(1, stats["bob"]?.wins)
        assertEquals(1, stats["alice"]?.losses)
    }
}
