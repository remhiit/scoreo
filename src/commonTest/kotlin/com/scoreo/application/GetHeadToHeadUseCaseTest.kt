package com.scoreo.application

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

private const val ELO_INITIAL = 1200
private const val ELO_K = 32
private val ELO_AFTER_WIN = ELO_INITIAL + (ELO_K * 0.5).toInt()   // 1216
private val ELO_AFTER_LOSS = ELO_INITIAL - (ELO_K * 0.5).toInt()  // 1184

class GetHeadToHeadUseCaseTest {

    private fun buildUseCase(
        matchRepo: InMemoryMatchRepository = InMemoryMatchRepository(),
        gameTypeRepo: InMemoryGameTypeRepository = InMemoryGameTypeRepository(),
        playerRepo: InMemoryPlayerRepository = InMemoryPlayerRepository(),
    ) = GetHeadToHeadUseCase(matchRepo, gameTypeRepo, playerRepo)

    @Test
    fun `empty when no matches`() {
        val useCase = buildUseCase()
        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `returns player detail with total wins and losses`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
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
    fun `leaderboard sorted by elo descending`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
            it.save(Player("p3", "Charlie"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
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
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val useCase = buildUseCase(playerRepo = playerRepo)

        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `head to head computed correctly`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
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
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
            it.save(Player("p3", "Charlie"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
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
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice", active = false))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()

        assertEquals(2, result.size)
        assertTrue(result.any { it.playerId == "p1" })
    }

    @Test
    fun `elo is 1200 for players with no matches`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
        }
        val useCase = buildUseCase(playerRepo = playerRepo)

        assertTrue(useCase().isEmpty())
    }

    @Test
    fun `elo changes after a match`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()
        val alice = result.find { it.playerId == "p1" }!!
        val bob = result.find { it.playerId == "p2" }!!

        assertEquals(ELO_AFTER_WIN, alice.elo)
        assertEquals(ELO_AFTER_LOSS, bob.elo)
    }

    @Test
    fun `filters by gameTypeId`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Type A", WinCondition.HIGHEST_SCORE))
            it.save(GameType("gt2", "Type B", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
            it.save(Match("m2", 2000L, "gt2", listOf(PlayerScore("p1", 3), PlayerScore("p2", 10))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val gt1 = useCase(gameTypeId = "gt1")
        assertEquals(ELO_AFTER_WIN, gt1.find { it.playerId == "p1" }?.elo)
        assertEquals(ELO_AFTER_LOSS, gt1.find { it.playerId == "p2" }?.elo)

        val gt2 = useCase(gameTypeId = "gt2")
        assertEquals(ELO_AFTER_LOSS, gt2.find { it.playerId == "p1" }?.elo)
        assertEquals(ELO_AFTER_WIN, gt2.find { it.playerId == "p2" }?.elo)

        val empty = useCase(gameTypeId = "nonexistent")
        assertTrue(empty.isEmpty())
    }

    @Test
    fun `elo with multiple matches`() {
        val playerRepo = InMemoryPlayerRepository().also {
            it.save(Player("p1", "Alice"))
            it.save(Player("p2", "Bob"))
            it.save(Player("p3", "Charlie"))
        }
        val gameTypeRepo = InMemoryGameTypeRepository().also {
            it.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        }
        val matchRepo = InMemoryMatchRepository().also {
            it.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
            it.save(Match("m2", 2000L, "gt1", listOf(PlayerScore("p1", 8), PlayerScore("p2", 12))))
            it.save(Match("m3", 3000L, "gt1", listOf(PlayerScore("p3", 10), PlayerScore("p1", 3))))
        }
        val useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

        val result = useCase()
        val alice = result.find { it.playerId == "p1" }!!
        val bob = result.find { it.playerId == "p2" }!!
        val charlie = result.find { it.playerId == "p3" }!!

        assertTrue(alice.elo < bob.elo)
        assertTrue(bob.elo < charlie.elo)
        assertEquals(listOf("p3", "p2", "p1"), result.map { it.playerId })
    }
}
