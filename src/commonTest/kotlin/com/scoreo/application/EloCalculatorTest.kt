package com.scoreo.application

import com.scoreo.domain.model.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class EloCalculatorTest {

    private val calculator = EloCalculator()

    @Test
    fun `match with single participant is ignored`() {
        val gameType = GameType(id = "g1", name = "Solo", winCondition = WinCondition.HIGHEST_SCORE)
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(PlayerScore("p1", 10)),
            manualWinners = emptyList(),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        assertEquals(emptyMap(), result)
    }

    @Test
    fun `empty match list returns empty map`() {
        val result = calculator.compute(emptyList(), emptyMap())
        assertEquals(emptyMap(), result)
    }

    @Test
    fun `normal two-player match computes ELO correctly`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        assertTrue(result["p1"]!! > 1200)  // winner gains ELO
        assertTrue(result["p2"]!! < 1200)  // loser loses ELO
    }
}
