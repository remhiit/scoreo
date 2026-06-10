package com.scoreo.ui.scoredetail

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.application.CreateMatchUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
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

    private fun ScoreDetailHandler.givenManualGameWithScores(): ScoreDetailHandler {
        handle(ScoreDetailIntent.UpdateScore(0, "alice", "10"))
        handle(ScoreDetailIntent.UpdateScore(0, "bob", "5"))
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
    fun `Terminate with invalid score sets error and does not save`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.UpdateScore(0, "alice", "abc"))
        handler.handle(ScoreDetailIntent.Terminate)
        assertEquals("Invalid score for Alice in round 1", handler.state.error)
        assertFalse(handler.state.saved)
        assertEquals(0, matchRepo.getAll().size)
    }

    @Test
    fun `Terminate with empty score sets error`() {
        val (handler, matchRepo) = buildHandler()
        handler.handle(ScoreDetailIntent.Terminate)
        assertEquals("Invalid score for Alice in round 1", handler.state.error)
        assertFalse(handler.state.saved)
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
}
