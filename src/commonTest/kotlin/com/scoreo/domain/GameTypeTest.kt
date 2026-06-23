package com.scoreo.domain

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals

class GameTypeTest {

    private fun scores(vararg pairs: Pair<String, Int>) =
        pairs.map { PlayerScore(it.first, it.second) }

    @Test
    fun `HIGHEST_SCORE returns player with max score`() {
        val gt = GameType("1", "Belote", WinCondition.HIGHEST_SCORE)
        assertEquals(listOf("bob"), gt.computeWinners(scores("alice" to 5, "bob" to 10, "charlie" to 3)))
    }

    @Test
    fun `HIGHEST_SCORE returns all tied winners`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE)
        val winners = gt.computeWinners(scores("alice" to 10, "bob" to 10, "charlie" to 3))
        assertEquals(setOf("alice", "bob"), winners.toSet())
    }

    @Test
    fun `LOWEST_SCORE returns player with min score`() {
        val gt = GameType("1", "Golf", WinCondition.LOWEST_SCORE)
        assertEquals(listOf("alice"), gt.computeWinners(scores("alice" to 1, "bob" to 5, "charlie" to 3)))
    }

    @Test
    fun `LOWEST_SCORE returns all tied winners`() {
        val gt = GameType("1", "Golf", WinCondition.LOWEST_SCORE)
        val winners = gt.computeWinners(scores("alice" to 1, "bob" to 1, "charlie" to 3))
        assertEquals(setOf("alice", "bob"), winners.toSet())
    }

    @Test
    fun `MANUAL returns empty list from computeWinners`() {
        val gt = GameType("1", "Custom", WinCondition.MANUAL)
        assertEquals(emptyList(), gt.computeWinners(scores("alice" to 5, "bob" to 10)))
    }

    @Test
    fun `computeWinners returns empty for empty scores`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE)
        assertEquals(emptyList(), gt.computeWinners(emptyList()))
    }

    @Test
    fun `computeWinners with custom condition uses that condition`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE)
        val winners = gt.computeWinners(
            scores("alice" to 10, "bob" to 5, "charlie" to 3),
            WinCondition.LOWEST_SCORE,
        )
        assertEquals(listOf("charlie"), winners)
    }

    @Test
    fun `computeWinners with HIGHEST_SCORE condition returns max`() {
        val gt = GameType("1", "Belote", WinCondition.LOWEST_SCORE)
        val winners = gt.computeWinners(
            scores("alice" to 5, "bob" to 10, "charlie" to 3),
            WinCondition.HIGHEST_SCORE,
        )
        assertEquals(listOf("bob"), winners)
    }

    @Test
    fun `computeWinners with custom condition returns all tied`() {
        val gt = GameType("1", "Game", WinCondition.HIGHEST_SCORE)
        val winners = gt.computeWinners(
            scores("alice" to 1, "bob" to 1, "charlie" to 3),
            WinCondition.LOWEST_SCORE,
        )
        assertEquals(setOf("alice", "bob"), winners.toSet())
    }
}
