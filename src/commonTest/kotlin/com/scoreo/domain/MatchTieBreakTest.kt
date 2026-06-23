package com.scoreo.domain

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class MatchTieBreakTest {

    private fun scores(vararg pairs: Pair<String, Int>) =
        pairs.map { PlayerScore(it.first, it.second) }

    // ── isTieBreakIndeterminate ──

    @Test
    fun `indeterminate when MANUAL_SELECTION and manualWinners empty with tie`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10, "charlie" to 3),
            manualWinners = emptyList(),
        )
        assertTrue(match.isTieBreakIndeterminate(gt))
    }

    @Test
    fun `indeterminate when SECONDARY_SCORE and secondaryPlayerScores empty with tie`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.SECONDARY_SCORE)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10, "charlie" to 3),
            secondaryPlayerScores = emptyList(),
        )
        assertTrue(match.isTieBreakIndeterminate(gt))
    }

    @Test
    fun `not indeterminate when NONE tie-break rule`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.NONE)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10, "charlie" to 3),
        )
        assertFalse(match.isTieBreakIndeterminate(gt))
    }

    @Test
    fun `not indeterminate when MANUAL_SELECTION and manualWinners populated`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10, "charlie" to 3),
            manualWinners = listOf("alice"),
        )
        assertFalse(match.isTieBreakIndeterminate(gt))
    }

    @Test
    fun `not indeterminate when SECONDARY_SCORE and secondaryPlayerScores populated`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.SECONDARY_SCORE)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10, "charlie" to 3),
            secondaryPlayerScores = scores("alice" to 5, "bob" to 3),
        )
        assertFalse(match.isTieBreakIndeterminate(gt))
    }

    @Test
    fun `not indeterminate when no tie exists`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 5, "charlie" to 3),
            manualWinners = emptyList(),
        )
        assertFalse(match.isTieBreakIndeterminate(gt))
    }

    @Test
    fun `not indeterminate when MANUAL win condition`() {
        val gt = GameType("1", "Custom", WinCondition.MANUAL, TieBreakRule.MANUAL_SELECTION)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10),
            manualWinners = emptyList(),
        )
        assertFalse(match.isTieBreakIndeterminate(gt))
    }

    // ── getWinners fallback ──

    @Test
    fun `getWinners returns all tied when indeterminate`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10, "charlie" to 3),
            manualWinners = emptyList(),
        )
        assertEquals(setOf("alice", "bob"), match.getWinners(gt).toSet())
    }

    @Test
    fun `getWinners respects manualWinners when not indeterminate`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE, TieBreakRule.MANUAL_SELECTION)
        val match = Match("m1", 0L, "1",
            playerScores = scores("alice" to 10, "bob" to 10, "charlie" to 3),
            manualWinners = listOf("bob"),
        )
        assertEquals(listOf("bob"), match.getWinners(gt))
    }
}
