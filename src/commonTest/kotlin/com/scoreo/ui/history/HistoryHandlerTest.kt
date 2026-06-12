package com.scoreo.ui.history

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class HistoryHandlerTest {

    private fun buildHandler(
        playerRepo: InMemoryPlayerRepository = InMemoryPlayerRepository(),
        gameTypeRepo: InMemoryGameTypeRepository = InMemoryGameTypeRepository(),
        matchRepo: InMemoryMatchRepository = InMemoryMatchRepository(),
    ) = HistoryHandler(
        getMatches = GetMatchesUseCase(matchRepo),
        getPlayers = GetPlayersUseCase(playerRepo),
        getGameTypes = GetGameTypesUseCase(gameTypeRepo),
    )

    @Test
    fun `initial state is empty`() {
        val handler = buildHandler()
        assertTrue(handler.state.isEmpty())
    }

    @Test
    fun `refresh populates state from repositories`() {
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)

        playerRepo.save(Player("p1", "Alice"))
        playerRepo.save(Player("p2", "Bob"))
        gameTypeRepo.save(GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))

        handler.refresh()

        assertEquals(1, handler.state.size)
    }

    @Test
    fun `matches sorted by date descending`() {
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(matchRepo = matchRepo)

        matchRepo.save(Match("m1", 3000L, "gt1", listOf(PlayerScore("p1", 10))))
        matchRepo.save(Match("m2", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        matchRepo.save(Match("m3", 2000L, "gt1", listOf(PlayerScore("p1", 10))))

        handler.refresh()

        assertEquals(listOf("m1", "m3", "m2"), handler.state.map { it.match.id })
    }

    @Test
    fun `player names are resolved from repository`() {
        val playerRepo = InMemoryPlayerRepository()
        val handler = buildHandler(playerRepo = playerRepo)
        playerRepo.save(Player("p1", "Alice"))
        playerRepo.save(Player("p2", "Bob"))

        val gameTypeRepo = InMemoryGameTypeRepository()
        gameTypeRepo.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))

        val matchRepo = InMemoryMatchRepository()
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))

        val handler2 = buildHandler(playerRepo, gameTypeRepo, matchRepo)
        handler2.refresh()

        val display = handler2.state.first()
        assertNotNull(display.players["p1"])
        assertEquals("Alice", display.players["p1"]?.name)
        assertEquals("Alice", display.playerLabels["p1"])
    }

    @Test
    fun `unknown gameType is null`() {
        val matchRepo = InMemoryMatchRepository()
        matchRepo.save(Match("m1", 1000L, "unknown_gt", listOf(PlayerScore("p1", 10))))

        val handler = buildHandler(matchRepo = matchRepo)
        handler.refresh()

        assertEquals(null, handler.state.first().gameType)
    }

    @Test
    fun `winners computed for HIGHEST_SCORE`() {
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

        assertEquals(listOf("p1"), handler.state.first().winners)
    }

    @Test
    fun `date is formatted correctly for valid timestamp`() {
        val matchRepo = InMemoryMatchRepository()
        matchRepo.save(Match("m1", 1767225600000L, "gt1", listOf(PlayerScore("p1", 10))))

        val handler = buildHandler(matchRepo = matchRepo)
        handler.refresh()

        assertNotNull(handler.state.first().dateFormatted)
    }

    @Test
    fun `playerLabels shows deleted player suffix`() {
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)
        playerRepo.save(Player("p1", "Alice", active = false))
        gameTypeRepo.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))

        handler.refresh()

        assertEquals("Alice (deleted)", handler.state.first().playerLabels["p1"])
    }

    @Test
    fun `playerLabels shows generic text when name is blank`() {
        val playerRepo = InMemoryPlayerRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo = playerRepo, matchRepo = matchRepo)
        playerRepo.save(Player("p1", "", active = false))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))

        handler.refresh()

        assertEquals("Deleted player", handler.state.first().playerLabels["p1"])
    }

    @Test
    fun `refresh updates state when data changes`() {
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(matchRepo = matchRepo)

        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        handler.refresh()
        assertEquals(1, handler.state.size)

        matchRepo.save(Match("m2", 2000L, "gt1", listOf(PlayerScore("p1", 10))))
        handler.refresh()
        assertEquals(2, handler.state.size)
    }
}
