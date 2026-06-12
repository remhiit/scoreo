package com.scoreo.ui.stats

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetHeadToHeadUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class StatsHandlerTest {

    private fun buildHandler(
        playerRepo: InMemoryPlayerRepository = InMemoryPlayerRepository(),
        gameTypeRepo: InMemoryGameTypeRepository = InMemoryGameTypeRepository(),
        matchRepo: InMemoryMatchRepository = InMemoryMatchRepository(),
    ) = StatsHandler(
        getHeadToHead = GetHeadToHeadUseCase(matchRepo, gameTypeRepo, playerRepo),
        getGameTypes = GetGameTypesUseCase(gameTypeRepo),
    )

    @Test
    fun `initial state has empty leaderboard`() {
        val handler = buildHandler()
        assertTrue(handler.state.leaderboard.isEmpty())
        assertNull(handler.state.selectedPlayerId)
    }

    @Test
    fun `refresh populates leaderboard`() {
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
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)

        handler.refresh()

        assertEquals(2, handler.state.leaderboard.size)
    }

    @Test
    fun `SelectPlayer sets selectedPlayerId`() {
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
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)
        handler.refresh()

        handler.handle(StatsIntent.SelectPlayer("p1"))

        assertEquals("p1", handler.state.selectedPlayerId)
        assertNotNull(handler.state.selectedPlayer)
    }

    @Test
    fun `leaderboard sorted by elo`() {
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
        }
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)
        handler.refresh()

        assertEquals(2, handler.state.leaderboard.size)
        assertEquals("Bob", handler.state.leaderboard.first().name)
        assertTrue(handler.state.leaderboard.first().elo > handler.state.leaderboard.last().elo)
    }

    @Test
    fun `BackToLeaderboard clears selectedPlayerId`() {
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
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)
        handler.refresh()

        handler.handle(StatsIntent.SelectPlayer("p1"))
        handler.handle(StatsIntent.BackToLeaderboard)

        assertNull(handler.state.selectedPlayerId)
        assertNull(handler.state.selectedPlayer)
    }

    @Test
    fun `SelectGameType filters leaderboard and loads gameTypes`() {
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
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)
        handler.refresh()

        assertEquals(2, handler.state.gameTypes.size)
        assertEquals(2, handler.state.leaderboard.size)

        handler.handle(StatsIntent.SelectGameType("gt1"))

        assertEquals("gt1", handler.state.selectedGameTypeId)
        assertEquals(2, handler.state.leaderboard.size)
        assertEquals(1216, handler.state.leaderboard.find { it.playerId == "p1" }?.elo)
        assertEquals(1184, handler.state.leaderboard.find { it.playerId == "p2" }?.elo)

        handler.handle(StatsIntent.SelectGameType("gt2"))

        assertEquals("gt2", handler.state.selectedGameTypeId)
        assertEquals(1184, handler.state.leaderboard.find { it.playerId == "p1" }?.elo)
        assertEquals(1216, handler.state.leaderboard.find { it.playerId == "p2" }?.elo)

        handler.handle(StatsIntent.SelectGameType(null))

        assertNull(handler.state.selectedGameTypeId)
    }
}
