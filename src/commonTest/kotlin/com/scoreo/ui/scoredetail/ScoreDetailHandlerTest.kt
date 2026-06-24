package com.scoreo.ui.scoredetail

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.application.UpdateMatchUseCase
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
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ScoreDetailHandlerTest {

    private fun buildHandler(
        winCondition: WinCondition = WinCondition.HIGHEST_SCORE,
        players: List<Player> = listOf(Player("alice", "Alice"), Player("bob", "Bob")),
    ): Pair<ScoreDetailHandler, InMemoryMatchRepository> {
        val gameType = GameType("gt1", "TestGame", winCondition)
        val gameTypeRepo = InMemoryGameTypeRepository().also { it.save(gameType) }
        val matchRepo = InMemoryMatchRepository()
        val createMatch = CreateMatchUseCase(matchRepo, gameTypeRepo)
        val handler = ScoreDetailHandler(gameType, players, createMatch, { 1767225600000L })
        return Pair(handler, matchRepo)
    }

    private fun buildHandlerWithGameType(
        gameType: GameType,
        players: List<Player> = listOf(Player("alice", "Alice"), Player("bob", "Bob")),
    ): Pair<ScoreDetailHandler, InMemoryMatchRepository> {
        val gameTypeRepo = InMemoryGameTypeRepository().also { it.save(gameType) }
        val matchRepo = InMemoryMatchRepository()
        val createMatch = CreateMatchUseCase(matchRepo, gameTypeRepo)
        val handler = ScoreDetailHandler(gameType, players, createMatch, { 1767225600000L })
        return Pair(handler, matchRepo)
    }

    private fun ScoreDetailHandler.givenManualGameWithScores(): ScoreDetailHandler {
        handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        handle(ScoreDetailIntent.UpdateScore(0, "bob", "5"))
        handle(ScoreDetailIntent.Terminate)
        return this
    }

    private fun ScoreDetailHandler.givenTiedScores(): ScoreDetailHandler {
        handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        handle(ScoreDetailIntent.UpdateScore(0, "bob", "10"))
        handle(ScoreDetailIntent.Terminate)
        return this
    }

    @Test
    fun `initial state has one empty round and no modal`() {
        val (handler, _) = buildHandler()
        assertEquals(1, handler.state.rounds.size)
        assertTrue(handler.state.rounds[0].isEmpty())
        assertFalse(handler.state.showWinnerModal)
        assertNull(handler.state.error)
        assertFalse(handler.state.saved)
    }

    @Test
    fun `AddRound appends an empty round`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.AddRound)
        assertEquals(2, handler.state.rounds.size)
        assertTrue(handler.state.rounds[1].isEmpty())
    }

    @Test
    fun `RemoveRound removes round at given index`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.AddRound)
        handler.handle(ScoreDetailIntent.AddRound)
        assertEquals(3, handler.state.rounds.size)
        handler.handle(ScoreDetailIntent.RemoveRound(1))
        assertEquals(2, handler.state.rounds.size)
    }

    @Test
    fun `RemoveRound does not remove the last remaining round`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.RemoveRound(0))
        assertEquals(1, handler.state.rounds.size)
    }

    @Test
    fun `RemoveRound with negative index does nothing`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.RemoveRound(-1))
        assertEquals(1, handler.state.rounds.size)
    }

    @Test
    fun `RemoveRound with out of bounds index does nothing`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.RemoveRound(99))
        assertEquals(1, handler.state.rounds.size)
    }

    @Test
    fun `UpdateScore stores value and clears error`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        assertEquals("10", handler.state.rounds[0]["alice"])
        assertNull(handler.state.error)
    }

    @Test
    fun `Terminate with valid scores and HIGHEST_SCORE saves match`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", "5"))
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        assertEquals("gt1", matchRepo.getAll().first().gameTypeId)
    }

    @Test
    fun `Terminate with valid scores and LOWEST_SCORE saves match`() {
        val (handler, matchRepo) = buildHandler(winCondition = WinCondition.LOWEST_SCORE)
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "5"))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", "10"))
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
    }

    @Test
    fun `Terminate with MANUAL winCondition opens modal instead of saving`() {
        val (handler, matchRepo) = buildHandler(winCondition = WinCondition.MANUAL)
        handler.givenManualGameWithScores()
        assertTrue(handler.state.showWinnerModal)
        assertFalse(handler.state.saved)
        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `Terminate with empty score treats as zero and saves`() {
        val (handler, matchRepo) = buildHandler()
        // All cells empty - should now be treated as valid (0 points each)
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        val match = matchRepo.getAll().first()
        assertEquals(0, match.playerScores.find { it.playerId == "alice" }?.score)
        assertEquals(0, match.playerScores.find { it.playerId == "bob" }?.score)
    }

    // ── P1-01: Numeric Input Tests ──

    @Test
    fun `test_ValidateRounds_emptyStringIsZero`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", ""))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", "5"))
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        val match = matchRepo.getAll().first()
        assertEquals(0, match.playerScores.find { it.playerId == "alice" }?.score)
        assertEquals(5, match.playerScores.find { it.playerId == "bob" }?.score)
    }

    @Test
    fun `test_ValidateRounds_allEmptyRound`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", ""))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", ""))
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        val match = matchRepo.getAll().first()
        assertEquals(0, match.playerScores.find { it.playerId == "alice" }?.score)
        assertEquals(0, match.playerScores.find { it.playerId == "bob" }?.score)
    }

    @Test
    fun `Terminate with invalid score sets error and does not save`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "abc"))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", "5"))
        handler.handle(ScoreDetailIntent.Terminate)
        assertEquals("Invalid score for Alice in round 1: expected a number", handler.state.error)
        assertFalse(handler.state.saved)
        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `test_ValidateRounds_partiallyFilledOk`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", ""))
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        val match = matchRepo.getAll().first()
        assertEquals(10, match.playerScores.find { it.playerId == "alice" }?.score)
        assertEquals(0, match.playerScores.find { it.playerId == "bob" }?.score)
    }

    @Test
    fun `test_TotalsComputation_treatsEmptyAsZero`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", ""))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", "5"))
        assertEquals(0, handler.state.totals["alice"])
        assertEquals(5, handler.state.totals["bob"])
    }

    @Test
    fun `test_Terminate_acceptsAllEmptyRound`() {
        val (handler, matchRepo) = buildHandler()
        // All cells empty in the single round - should be treated as 0 (valid)
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        val match = matchRepo.getAll().first()
        assertEquals(0, match.playerScores.find { it.playerId == "alice" }?.score)
        assertEquals(0, match.playerScores.find { it.playerId == "bob" }?.score)
    }

    @Test
    fun `test_ManualWinnerSelection_totalsNeverNull`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.MANUAL)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", ""))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", ""))
        handler.handle(ScoreDetailIntent.Terminate)
        assertTrue(handler.state.showWinnerModal)
        // Verify that totals are computed and never null
        val aliceTotal = handler.state.totals["alice"]
        val bobTotal = handler.state.totals["bob"]
        assertNotNull(aliceTotal)
        assertNotNull(bobTotal)
        assertEquals(0, aliceTotal)
        assertEquals(0, bobTotal)
    }

    @Test
    fun `DismissModal closes modal and clears error`() {
        val (handler, _) = buildHandler(winCondition = WinCondition.MANUAL)
        handler.givenManualGameWithScores()
        assertTrue(handler.state.showWinnerModal)
        handler.handle(ScoreDetailIntent.DismissModal)
        assertFalse(handler.state.showWinnerModal)
        assertNull(handler.state.error)
    }

    @Test
    fun `ToggleModalWinner adds and removes winner`() {
        val (handler, _) = buildHandler(winCondition = WinCondition.MANUAL)
        handler.givenManualGameWithScores()
        handler.handle(ScoreDetailIntent.ToggleModalWinner("alice"))
        assertTrue("alice" in handler.state.modalWinners)
        handler.handle(ScoreDetailIntent.ToggleModalWinner("alice"))
        assertFalse("alice" in handler.state.modalWinners)
    }

    @Test
    fun `ConfirmWinners with empty selection sets error and does not save`() {
        val (handler, matchRepo) = buildHandler(winCondition = WinCondition.MANUAL)
        handler.givenManualGameWithScores()
        handler.handle(ScoreDetailIntent.ConfirmWinners)
        assertEquals("Select at least one winner", handler.state.error)
        assertFalse(handler.state.saved)
        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `ConfirmWinners with valid selection saves match with manual winners`() {
        val (handler, matchRepo) = buildHandler(winCondition = WinCondition.MANUAL)
        handler.givenManualGameWithScores()
        handler.handle(ScoreDetailIntent.ToggleModalWinner("alice"))
        handler.handle(ScoreDetailIntent.ConfirmWinners)
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        assertEquals(listOf("alice"), matchRepo.getAll().first().manualWinners)
    }

    @Test
    fun `saveMatch computes total scores across multiple rounds`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", "5"))
        handler.handle(ScoreDetailIntent.AddRound)
        handler.handle(ScoreDetailIntent.UpdateScore(1, "alice", "3"))
        handler.handle(ScoreDetailIntent.UpdateScore(1, "bob", "7"))
        handler.handle(ScoreDetailIntent.Terminate)
        val match = matchRepo.getAll().first()
        val aliceScore = match.playerScores.find { it.playerId == "alice" }
        val bobScore = match.playerScores.find { it.playerId == "bob" }
        assertNotNull(aliceScore)
        assertNotNull(bobScore)
        assertEquals(13, aliceScore.score)
        assertEquals(12, bobScore.score)
    }

    // ── P0-05: Tie-Break Resolution Tests ──

    @Test
    fun `Terminate with tie and NONE rule saves match with all tied winners`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.NONE)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        // Both players are tied → both are manualWinners
        assertEquals(listOf("alice", "bob"), matchRepo.getAll().first().manualWinners)
    }

    @Test
    fun `Terminate with tie and MANUAL_SELECTION shows manual dialog`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.MANUAL_SELECTION)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showManualSelectionDialog)
        assertEquals(listOf("alice", "bob"), handler.state.tiedPlayerIds)
        assertFalse(handler.state.saved)
        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `Terminate with tie and SECONDARY_SCORE shows secondary score dialog`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.SECONDARY_SCORE, tieBreakLabel = "Handicap")
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showSecondaryScoreDialog)
        assertEquals(listOf("alice", "bob"), handler.state.tiedPlayerIds)
        assertEquals("", handler.state.secondaryScoreInputs["alice"])
        assertEquals("", handler.state.secondaryScoreInputs["bob"])
        assertFalse(handler.state.saved)
        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `SECONDARY_SCORE submit breaks tie and saves match`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.SECONDARY_SCORE)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showSecondaryScoreDialog)

        // Alice gets higher secondary score → she wins
        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("alice", "100"))
        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("bob", "50"))
        handler.handle(ScoreDetailIntent.SubmitSecondaryScores)

        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        val saved = matchRepo.getAll().first()
        assertEquals(listOf("alice"), saved.manualWinners)
        assertEquals(2, saved.secondaryPlayerScores.size)
    }

    @Test
    fun `SECONDARY_SCORE submit with tie persists shows manual selection`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.SECONDARY_SCORE)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showSecondaryScoreDialog)

        // Both get the same secondary score → tie persists
        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("alice", "50"))
        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("bob", "50"))
        handler.handle(ScoreDetailIntent.SubmitSecondaryScores)

        assertFalse(handler.state.showSecondaryScoreDialog)
        assertTrue(handler.state.showManualSelectionDialog)
        assertEquals(listOf("alice", "bob"), handler.state.tiedPlayerIds)
        assertEquals(2, handler.state.collectedSecondaryScores.size)
        assertFalse(handler.state.saved)
        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `SECONDARY_SCORE with invalid input shows error`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.SECONDARY_SCORE)
        val (handler, _) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showSecondaryScoreDialog)

        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("alice", "abc"))
        handler.handle(ScoreDetailIntent.SubmitSecondaryScores)

        assertEquals("Invalid secondary score for one of the tied players", handler.state.error)
        assertTrue(handler.state.showSecondaryScoreDialog)
    }

    @Test
    fun `MANUAL_SELECTION with selection saves match with chosen winner`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.MANUAL_SELECTION)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showManualSelectionDialog)

        handler.handle(ScoreDetailIntent.ToggleManualSelectionWinner("alice"))
        handler.handle(ScoreDetailIntent.ConfirmManualWinners)

        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        assertEquals(listOf("alice"), matchRepo.getAll().first().manualWinners)
    }

    @Test
    fun `MANUAL_SELECTION with keep tie saves all tied players as winners`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.MANUAL_SELECTION)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showManualSelectionDialog)

        handler.handle(ScoreDetailIntent.KeepTie)

        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        assertEquals(listOf("alice", "bob"), matchRepo.getAll().first().manualWinners)
    }

    @Test
    fun `MANUAL_SELECTION with empty selection shows error`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.MANUAL_SELECTION)
        val (handler, _) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showManualSelectionDialog)

        handler.handle(ScoreDetailIntent.ConfirmManualWinners)

        assertEquals("Select at least one winner", handler.state.error)
        assertTrue(handler.state.showManualSelectionDialog)
    }

    @Test
    fun `ToggleManualSelectionWinner adds and removes selection`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.MANUAL_SELECTION)
        val (handler, _) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()

        handler.handle(ScoreDetailIntent.ToggleManualSelectionWinner("alice"))
        assertTrue("alice" in handler.state.manualSelectionWinners)

        handler.handle(ScoreDetailIntent.ToggleManualSelectionWinner("alice"))
        assertFalse("alice" in handler.state.manualSelectionWinners)
    }

    @Test
    fun `DismissTieBreak closes all tie-break dialogs`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.MANUAL_SELECTION)
        val (handler, _) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showManualSelectionDialog)

        handler.handle(ScoreDetailIntent.DismissTieBreak)

        assertFalse(handler.state.showManualSelectionDialog)
        assertFalse(handler.state.showSecondaryScoreDialog)
        assertNull(handler.state.error)
    }

    @Test
    fun `SECONDARY_SCORE then secondary tie broken via manual selection saves correctly`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.SECONDARY_SCORE)
        val (handler, matchRepo) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()
        assertTrue(handler.state.showSecondaryScoreDialog)

        // Both tie on secondary → escalates to manual
        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("alice", "50"))
        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("bob", "50"))
        handler.handle(ScoreDetailIntent.SubmitSecondaryScores)
        assertTrue(handler.state.showManualSelectionDialog)

        // Select Alice manually
        handler.handle(ScoreDetailIntent.ToggleManualSelectionWinner("alice"))
        handler.handle(ScoreDetailIntent.ConfirmManualWinners)

        assertTrue(handler.state.saved)
        assertEquals(1, matchRepo.getAll().size)
        val saved = matchRepo.getAll().first()
        assertEquals(listOf("alice"), saved.manualWinners)
        assertEquals(2, saved.secondaryPlayerScores.size)
    }

    @Test
    fun `UpdateSecondaryScoreInput updates input map`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.SECONDARY_SCORE)
        val (handler, _) = buildHandlerWithGameType(gameType)
        handler.givenTiedScores()

        handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput("alice", "75"))
        assertEquals("75", handler.state.secondaryScoreInputs["alice"])
        assertNull(handler.state.error)
    }

    @Test
    fun `reset restores initial state`() {
        val (handler, _) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        handler.handle(ScoreDetailIntent.AddRound)
        handler.handle(ScoreDetailIntent.UpdateScore(1, "bob", "5"))
        handler.reset()
        assertEquals(1, handler.state.rounds.size)
        assertTrue(handler.state.rounds[0].isEmpty())
        assertFalse(handler.state.showWinnerModal)
        assertNull(handler.state.error)
        assertFalse(handler.state.saved)
    }

    @Test
    fun `LoadMatchForEditing_populatesState`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE)
        val gameTypeRepo = InMemoryGameTypeRepository().also { it.save(gameType) }
        val matchRepo = InMemoryMatchRepository()
        val playerRepo = InMemoryPlayerRepository()
        
        val players = listOf(Player("alice", "Alice"), Player("bob", "Bob"))
        players.forEach { playerRepo.save(it) }
        
        val match = Match(
            id = "m1",
            gameTypeId = gameType.id,
            date = 1000L,
            playerScores = listOf(
                PlayerScore("alice", 10),
                PlayerScore("bob", 5)
            )
        )
        matchRepo.save(match)
        
        val createMatchUseCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        val updateMatchUseCase = UpdateMatchUseCase(matchRepo)
        
        val handler = ScoreDetailHandler(
            gameType = gameType,
            players = players,
            createMatch = createMatchUseCase,
            currentDate = { 1767225600000L },
            updateMatchUseCase = updateMatchUseCase,
            matchRepository = matchRepo,
            playerRepository = playerRepo,
            gameTypeRepository = gameTypeRepo,
            matchId = "m1"
        )
        
        assertEquals("m1", handler.state.editingMatchId)
        assertEquals(1, handler.state.rounds.size)
        assertEquals("10", handler.state.rounds[0]["alice"])
        assertEquals("5", handler.state.rounds[0]["bob"])
    }

    @Test
    fun `ReconstructRounds_alwaysOnlyOneRound`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE)
        val gameTypeRepo = InMemoryGameTypeRepository().also { it.save(gameType) }
        val matchRepo = InMemoryMatchRepository()
        val playerRepo = InMemoryPlayerRepository()
        
        val players = listOf(Player("alice", "Alice"), Player("bob", "Bob"))
        players.forEach { playerRepo.save(it) }
        
        // Create a match with multiple rounds stored (if that were possible)
        val match = Match(
            id = "m1",
            gameTypeId = gameType.id,
            date = 1000L,
            playerScores = listOf(
                PlayerScore("alice", 30),  // total across all rounds
                PlayerScore("bob", 20)
            )
        )
        matchRepo.save(match)
        
        val createMatchUseCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        val updateMatchUseCase = UpdateMatchUseCase(matchRepo)
        
        val handler = ScoreDetailHandler(
            gameType = gameType,
            players = players,
            createMatch = createMatchUseCase,
            currentDate = { 1767225600000L },
            updateMatchUseCase = updateMatchUseCase,
            matchRepository = matchRepo,
            playerRepository = playerRepo,
            gameTypeRepository = gameTypeRepo,
            matchId = "m1"
        )
        
        // Should always reconstruct as 1 round with totals
        assertEquals(1, handler.state.rounds.size)
        assertEquals("30", handler.state.rounds[0]["alice"])
        assertEquals("20", handler.state.rounds[0]["bob"])
    }

    @Test
    fun `Terminate_callsUpdateUseCase`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE)
        val gameTypeRepo = InMemoryGameTypeRepository().also { it.save(gameType) }
        val matchRepo = InMemoryMatchRepository()
        val playerRepo = InMemoryPlayerRepository()
        
        val players = listOf(Player("alice", "Alice"), Player("bob", "Bob"))
        players.forEach { playerRepo.save(it) }
        
        val match = Match(
            id = "m1",
            gameTypeId = gameType.id,
            date = 1000L,
            playerScores = listOf(
                PlayerScore("alice", 10),
                PlayerScore("bob", 5)
            )
        )
        matchRepo.save(match)
        
        val createMatchUseCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        val updateMatchUseCase = UpdateMatchUseCase(matchRepo)
        
        val handler = ScoreDetailHandler(
            gameType = gameType,
            players = players,
            createMatch = createMatchUseCase,
            currentDate = { 1767225600000L },
            updateMatchUseCase = updateMatchUseCase,
            matchRepository = matchRepo,
            playerRepository = playerRepo,
            gameTypeRepository = gameTypeRepo,
            matchId = "m1"
        )
        
        // Update scores and terminate
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "15"))
        handler.handle(ScoreDetailIntent.UpdateScore(0, "bob", "10"))
        handler.handle(ScoreDetailIntent.Terminate)
        
        assertTrue(handler.state.saved)
        
        // Verify updated match was saved with new scores
        val updatedMatch = matchRepo.findById("m1")
        assertEquals(15, updatedMatch?.playerScores?.find { it.playerId == "alice" }?.score)
        assertEquals(10, updatedMatch?.playerScores?.find { it.playerId == "bob" }?.score)
    }

    @Test
    fun `EditMode_preservesMatchId`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE)
        val gameTypeRepo = InMemoryGameTypeRepository().also { it.save(gameType) }
        val matchRepo = InMemoryMatchRepository()
        val playerRepo = InMemoryPlayerRepository()
        
        val players = listOf(Player("alice", "Alice"), Player("bob", "Bob"))
        players.forEach { playerRepo.save(it) }
        
        val match = Match(
            id = "m1",
            gameTypeId = gameType.id,
            date = 1000L,
            playerScores = listOf(
                PlayerScore("alice", 10),
                PlayerScore("bob", 5)
            )
        )
        matchRepo.save(match)
        
        val createMatchUseCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        val updateMatchUseCase = UpdateMatchUseCase(matchRepo)
        
        val handler = ScoreDetailHandler(
            gameType = gameType,
            players = players,
            createMatch = createMatchUseCase,
            currentDate = { 1767225600000L },
            updateMatchUseCase = updateMatchUseCase,
            matchRepository = matchRepo,
            playerRepository = playerRepo,
            gameTypeRepository = gameTypeRepo,
            matchId = "m1"
        )
        
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "20"))
        handler.handle(ScoreDetailIntent.Terminate)
        
        // Verify the saved match still has the same ID
        val savedMatch = matchRepo.findById("m1")
        assertEquals("m1", savedMatch?.id)
    }

    @Test
    fun `EditMatch_preservesOriginalDate`() {
        val gameType = GameType("gt1", "TestGame", WinCondition.HIGHEST_SCORE)
        val gameTypeRepo = InMemoryGameTypeRepository().also { it.save(gameType) }
        val matchRepo = InMemoryMatchRepository()
        val playerRepo = InMemoryPlayerRepository()
        
        val players = listOf(Player("alice", "Alice"), Player("bob", "Bob"))
        players.forEach { playerRepo.save(it) }
        
        val originalDate = 1000L
        val match = Match(
            id = "m1",
            gameTypeId = gameType.id,
            date = originalDate,
            playerScores = listOf(
                PlayerScore("alice", 10),
                PlayerScore("bob", 5)
            )
        )
        matchRepo.save(match)
        
        val createMatchUseCase = CreateMatchUseCase(matchRepo, gameTypeRepo)
        val updateMatchUseCase = UpdateMatchUseCase(matchRepo)
        
        // Handler is created with a different current date
        val handler = ScoreDetailHandler(
            gameType = gameType,
            players = players,
            createMatch = createMatchUseCase,
            currentDate = { 9999999L },  // Different date
            updateMatchUseCase = updateMatchUseCase,
            matchRepository = matchRepo,
            playerRepository = playerRepo,
            gameTypeRepository = gameTypeRepo,
            matchId = "m1"
        )
        
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "20"))
        handler.handle(ScoreDetailIntent.Terminate)
        
        // Verify the saved match still has the original date
        val savedMatch = matchRepo.findById("m1")
        assertEquals(originalDate, savedMatch?.date)
    }
}
