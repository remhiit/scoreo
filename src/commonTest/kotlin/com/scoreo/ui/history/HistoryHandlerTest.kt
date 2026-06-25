package com.scoreo.ui.history

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import com.scoreo.application.DeleteMatchUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.GetMatchesUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
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
        deleteMatchUseCase = DeleteMatchUseCase(matchRepo),
    )

    @Test
    fun `initial state has empty displays`() {
        val handler = buildHandler()
        assertTrue(handler.state.displays.isEmpty())
    }

    @Test
    fun `handle Refresh populates state from repositories`() {
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)

        playerRepo.save(Player("p1", "Alice"))
        playerRepo.save(Player("p2", "Bob"))
        gameTypeRepo.save(GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))

        handler.handle(HistoryIntent.Refresh)

        assertEquals(1, handler.state.displays.size)
    }

    @Test
    fun `matches sorted by date descending`() {
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(matchRepo = matchRepo)

        matchRepo.save(Match("m1", 3000L, "gt1", listOf(PlayerScore("p1", 10))))
        matchRepo.save(Match("m2", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        matchRepo.save(Match("m3", 2000L, "gt1", listOf(PlayerScore("p1", 10))))

        handler.handle(HistoryIntent.Refresh)

        assertEquals(listOf("m1", "m3", "m2"), handler.state.displays.map { it.match.id })
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
        handler2.handle(HistoryIntent.Refresh)

        val display = handler2.state.displays.first()
        assertNotNull(display.players["p1"])
        assertEquals("Alice", display.players["p1"]?.name)
        assertEquals("Alice", display.playerLabels["p1"])
    }

    @Test
    fun `unknown gameType is null`() {
        val matchRepo = InMemoryMatchRepository()
        matchRepo.save(Match("m1", 1000L, "unknown_gt", listOf(PlayerScore("p1", 10))))

        val handler = buildHandler(matchRepo = matchRepo)
        handler.handle(HistoryIntent.Refresh)

        assertEquals(null, handler.state.displays.first().gameType)
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
        handler.handle(HistoryIntent.Refresh)

        assertEquals(listOf("p1"), handler.state.displays.first().winners)
    }

    @Test
    fun `date is formatted correctly for valid timestamp`() {
        val matchRepo = InMemoryMatchRepository()
        matchRepo.save(Match("m1", 1767225600000L, "gt1", listOf(PlayerScore("p1", 10))))

        val handler = buildHandler(matchRepo = matchRepo)
        handler.handle(HistoryIntent.Refresh)

        assertNotNull(handler.state.displays.first().dateFormatted)
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

        handler.handle(HistoryIntent.Refresh)

        assertEquals("Alice (deleted)", handler.state.displays.first().playerLabels["p1"])
    }

    @Test
    fun `playerLabels shows generic text when name is blank`() {
        val playerRepo = InMemoryPlayerRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo = playerRepo, matchRepo = matchRepo)
        playerRepo.save(Player("p1", "", active = false))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))

        handler.handle(HistoryIntent.Refresh)

        assertEquals("Deleted player", handler.state.displays.first().playerLabels["p1"])
    }

    @Test
    fun `handle Refresh updates state when data changes`() {
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(matchRepo = matchRepo)

        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        handler.handle(HistoryIntent.Refresh)
        assertEquals(1, handler.state.displays.size)

        matchRepo.save(Match("m2", 2000L, "gt1", listOf(PlayerScore("p1", 10))))
        handler.handle(HistoryIntent.Refresh)
        assertEquals(2, handler.state.displays.size)
    }

    @Test
    fun `isTieBreakIndeterminate true when MANUAL_SELECTION and empty manualWinners`() {
        val matchRepo = InMemoryMatchRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        gameTypeRepo.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION))
        matchRepo.save(Match("m1", 1000L, "gt1",
            playerScores = listOf(PlayerScore("p1", 10), PlayerScore("p2", 10)),
            manualWinners = emptyList(),
        ))
        val handler = buildHandler(matchRepo = matchRepo, gameTypeRepo = gameTypeRepo)
        handler.handle(HistoryIntent.Refresh)
        assertTrue(handler.state.displays.first().isTieBreakIndeterminate)
    }

    @Test
    fun `isTieBreakIndeterminate false when tie resolved`() {
        val matchRepo = InMemoryMatchRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        gameTypeRepo.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION))
        matchRepo.save(Match("m1", 1000L, "gt1",
            playerScores = listOf(PlayerScore("p1", 10), PlayerScore("p2", 10)),
            manualWinners = listOf("p1"),
        ))
        val handler = buildHandler(matchRepo = matchRepo, gameTypeRepo = gameTypeRepo)
        handler.handle(HistoryIntent.Refresh)
        assertFalse(handler.state.displays.first().isTieBreakIndeterminate)
    }

    @Test
    fun `isTieBreakIndeterminate false when no tie`() {
        val matchRepo = InMemoryMatchRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        gameTypeRepo.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION))
        matchRepo.save(Match("m1", 1000L, "gt1",
            playerScores = listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)),
            manualWinners = emptyList(),
        ))
        val handler = buildHandler(matchRepo = matchRepo, gameTypeRepo = gameTypeRepo)
        handler.handle(HistoryIntent.Refresh)
        assertFalse(handler.state.displays.first().isTieBreakIndeterminate)
    }

    @Test
    fun `test_ShowDeleteConfirm_setsMatchId`() {
        val handler = buildHandler()
        handler.handle(HistoryIntent.ShowDeleteConfirm("match123"))
        assertEquals("match123", handler.state.deleteConfirmMatchId)
    }

    @Test
    fun `test_DeleteMatch_callsUseCase`() {
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(matchRepo = matchRepo)
        val match = Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))
        matchRepo.save(match)

        handler.handle(HistoryIntent.DeleteMatch("m1"))

        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `test_DeleteMatch_refreshesAfterDelete`() {
        val matchRepo = InMemoryMatchRepository()
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)

        playerRepo.save(Player("p1", "Alice"))
        gameTypeRepo.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        matchRepo.save(Match("m2", 2000L, "gt1", listOf(PlayerScore("p1", 20))))

        handler.handle(HistoryIntent.Refresh)
        assertEquals(2, handler.state.displays.size)

        handler.handle(HistoryIntent.DeleteMatch("m1"))

        assertEquals(1, handler.state.displays.size)
        assertEquals("m2", handler.state.displays[0].match.id)
    }

    @Test
    fun `test_DeleteMatch_clearsConfirm`() {
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(matchRepo = matchRepo)
        val match = Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10)))
        matchRepo.save(match)

        handler.handle(HistoryIntent.ShowDeleteConfirm("m1"))
        assertEquals("m1", handler.state.deleteConfirmMatchId)

        handler.handle(HistoryIntent.DeleteMatch("m1"))

        assertNotNull(handler.state)
        assertEquals(null, handler.state.deleteConfirmMatchId)
     }

    @Test
    fun `test_DeleteMatch_error`() {
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(matchRepo = matchRepo)
        // Try to delete a non-existent match - should not throw but also should succeed
        handler.handle(HistoryIntent.DeleteMatch("nonexistent"))
        // The state should not have an error (delete is idempotent)
        assertEquals(null, handler.state.error)
    }

    @Test
    fun `test_DeleteMatch_exception_setsError`() {
        // Create a custom repository that throws an exception when delete is called
        val failingMatchRepo = object : com.scoreo.domain.port.MatchRepository {
            override fun getAll(): List<Match> = emptyList()
            override fun save(match: Match) {}
            override fun saveAll(matches: List<Match>) {}
            override fun findById(id: String): Match? = null
            override fun delete(id: String) {
                throw IllegalStateException("Storage error: failed to delete match")
            }
        }
        
        val handler = HistoryHandler(
            getMatches = com.scoreo.application.GetMatchesUseCase(failingMatchRepo),
            getPlayers = com.scoreo.application.GetPlayersUseCase(InMemoryPlayerRepository()),
            getGameTypes = com.scoreo.application.GetGameTypesUseCase(InMemoryGameTypeRepository()),
            deleteMatchUseCase = com.scoreo.application.DeleteMatchUseCase(failingMatchRepo),
        )
        
        // Try to delete - should catch exception and set error
        handler.handle(HistoryIntent.DeleteMatch("m1"))
        
        // Verify error is set (handler wraps the exception message)
        assertNotNull(handler.state.error)
        assertEquals("Failed to delete match: Storage error: failed to delete match", handler.state.error)
    }


    @Test
    fun `test_DismissDeleteConfirm_clearsId`() {
        val handler = buildHandler()
        handler.handle(HistoryIntent.ShowDeleteConfirm("match123"))
        assertEquals("match123", handler.state.deleteConfirmMatchId)

        handler.handle(HistoryIntent.DismissDeleteConfirm)

        assertEquals(null, handler.state.deleteConfirmMatchId)
    }

    @Test
    fun `test_DateFormatting_includesTime`() {
        val matchRepo = InMemoryMatchRepository()
        // 2023-01-01 11:45:00 UTC -> milliseconds
        // Use a known timestamp: 1672566300000L ≈ 2023-01-01T11:45:00Z
        matchRepo.save(Match("m1", 1672566300000L, "gt1", listOf(PlayerScore("p1", 10))))

        val handler = buildHandler(matchRepo = matchRepo)
        handler.handle(HistoryIntent.Refresh)

        val dateFormatted = handler.state.displays.first().dateFormatted
        // Should be formatted as "YYYY-MM-DD HH:mm"
        assertTrue(dateFormatted.contains(":"), "Date should include time with colon")
        assertTrue(dateFormatted.matches(Regex("""\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}""")), 
            "Date format should be YYYY-MM-DD HH:mm, got: $dateFormatted")
    }

    @Test
    fun `test_SelectGameTypeFilter_filtersDisplays`() {
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)

        // Create game types
        gameTypeRepo.save(GameType("gt1", "Belote", WinCondition.HIGHEST_SCORE))
        gameTypeRepo.save(GameType("gt2", "Poker", WinCondition.HIGHEST_SCORE))

        // Create players
        playerRepo.save(Player("p1", "Alice"))

        // Create matches
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))
        matchRepo.save(Match("m2", 2000L, "gt2", listOf(PlayerScore("p1", 20))))
        matchRepo.save(Match("m3", 3000L, "gt1", listOf(PlayerScore("p1", 30))))

        handler.handle(HistoryIntent.Refresh)
        assertEquals(3, handler.state.displays.size)

        // Filter to Belote (gt1)
        handler.handle(HistoryIntent.SelectGameTypeFilter("gt1"))
        assertEquals("gt1", handler.state.selectedGameTypeFilter)
        // Note: Handler does NOT filter displays automatically;
        // filtering is done in the UI layer (HistoryScreen)
        assertEquals(3, handler.state.displays.size)  // All displays still present in state
    }

    @Test
    fun `test_SelectGameTypeFilter_null_resetsFilter`() {
        val handler = buildHandler()
        handler.handle(HistoryIntent.SelectGameTypeFilter("gt1"))
        assertEquals("gt1", handler.state.selectedGameTypeFilter)

        // Reset filter to null (All games)
        handler.handle(HistoryIntent.SelectGameTypeFilter(null))
        assertEquals(null, handler.state.selectedGameTypeFilter)
    }

    @Test
    fun `test_FilterPersistsAcrossRefresh`() {
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)

        gameTypeRepo.save(GameType("gt1", "Belote", WinCondition.HIGHEST_SCORE))
        playerRepo.save(Player("p1", "Alice"))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10))))

        handler.handle(HistoryIntent.Refresh)
        handler.handle(HistoryIntent.SelectGameTypeFilter("gt1"))

        // Refresh again
        handler.handle(HistoryIntent.Refresh)

        // Filter should persist
        assertEquals("gt1", handler.state.selectedGameTypeFilter)
    }
}
