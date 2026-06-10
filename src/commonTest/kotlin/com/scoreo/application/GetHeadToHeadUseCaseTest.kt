package com.scoreo.application

import com.scoreo.FakeGameTypeRepository
import com.scoreo.FakeMatchRepository
import com.scoreo.FakePlayerRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class GetHeadToHeadUseCaseTest {

    private fun buildUseCase(
        matchRepo: FakeMatchRepository = FakeMatchRepository(),
        gameTypeRepo: FakeGameTypeRepository = FakeGameTypeRepository(),
        playerRepo: FakePlayerRepository = FakePlayerRepository(),
    ) = GetHeadToHeadUseCase(matchRepo, gameTypeRepo, playerRepo)

    @Test
    fun `empty when no matches`() {
        val useCase = buildUseCase()
        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `returns player detail with total wins and losses`() {
        val playerRepo = FakePlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = FakeGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = FakeMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()

        assertEquals(2, result.size)
        val alice = result.find { it.playerId == "p1" }
        assertEquals(1, alice?.wins)
        assertEquals(0, alice?.losses)
    }

    @Test
    fun `leaderboard sorted by win percentage descending`() {
        val playerRepo = FakePlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
            it.save(Player("p3", "Charlie"))
        }
        val gameTypeRepo = FakeGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = FakeMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
            it.save(Match("m2", 2000L, "gt1", listOf(PlayerScore("p1", 8), PlayerScore("p2", 12))))
            it.save(Match("m3", 3000L, "gt1", listOf(PlayerScore("p3", 10), PlayerScore("p1", 3))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()

        assertEquals(listOf("p3", "p2", "p1"), result.map { it.playerId })
    }

    @Test
    fun `excludes players with zero matches`() {
        val playerRepo = FakePlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val useCase = buildUseCase(playerRepo = playerRepo)

        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `head to head computed correctly`() {
        val playerRepo = FakePlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = FakeGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = FakeMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
            it.save(Match("m2", 2000L, "gt1", listOf(PlayerScore("p1", 8), PlayerScore("p2", 12))))
            it.save(Match("m3", 3000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 6))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()
        val alice = result.find { it.playerId == "p1" }!!
        val bob = result.find { it.playerId == "p2" }!!

        assertEquals(1, alice.headToHead.size)
        assertEquals(2, alice.headToHead.first().wins)
        assertEquals(1, alice.headToHead.first().losses)
        assertEquals(1, bob.headToHead.size)
        assertEquals(1, bob.headToHead.first().wins)
        assertEquals(2, bob.headToHead.first().losses)
    }

    @Test
    fun `head to head in multi player match`() {
        val playerRepo = FakePlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
            it.save(Player("p3", "Charlie"))
        }
        val gameTypeRepo = FakeGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = FakeMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(
                PlayerScore("p1", 10), PlayerScore("p2", 5), PlayerScore("p3", 3)
            )))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()
        val alice = result.find { it.playerId == "p1" }!!
        val bob = result.find { it.playerId == "p2" }!!
        val charlie = result.find { it.playerId == "p3" }!!

        assertEquals(2, alice.headToHead.size)
        assertEquals(1, alice.headToHead.find { it.opponentId == "p2" }?.wins)
        assertEquals(1, alice.headToHead.find { it.opponentId == "p3" }?.wins)
        assertEquals(1, bob.headToHead.find { it.opponentId == "p1" }?.losses)
        assertEquals(1, charlie.headToHead.find { it.opponentId == "p1" }?.losses)
    }

    @Test
    fun `includes inactive players in results`() {
        val playerRepo = FakePlayerRepository().also {
            it.save(Player("p1", "Alice", active = false))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = FakeGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = FakeMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()

        assertEquals(2, result.size)
        assertTrue(result.any { it.playerId == "p1" })
    }
}
