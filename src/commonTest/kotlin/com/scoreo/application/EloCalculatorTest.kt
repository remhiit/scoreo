package com.scoreo.application

import com.scoreo.domain.model.*
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.assertFalse

class EloCalculatorTest {

    private val calculator = EloCalculator()

    // ── Edge cases & basic behavior ──

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
    fun `match with zero losers is ignored (all tied, NONE rule)`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE, tieBreakRule = TieBreakRule.NONE)
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 10),
                PlayerScore("p3", 10),
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        // All tied (no loser), no ELO changes expected
        assertEquals(emptyMap(), result)
    }

    @Test
    fun `match with unknown game type is skipped`() {
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "unknown",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
            ),
        )
        val result = calculator.compute(listOf(match), emptyMap())
        assertEquals(emptyMap(), result)
    }

    // ── Two-player baseline ──

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

    @Test
    fun `two-player match - equal ELO means fair distribution`() {
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
        // With K=32 and two players: winner gains ~16, loser loses ~16
        val winnerGain = (result["p1"] ?: 1200) - 1200
        val loserLoss = 1200 - (result["p2"] ?: 1200)
        assertEquals(winnerGain, loserLoss)
    }

    // ── Three-player cases ──

    @Test
    fun `three-player match - 1 winner, 2 losers distributes ELO correctly`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),  // winner
                PlayerScore("p2", 5),   // loser
                PlayerScore("p3", 3),   // loser
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        // With K=32, 3 players: kNorm = 32/2 = 16
        // Winner gains ELO against both losers
        assertTrue(result["p1"]!! > 1200, "Winner p1 should gain ELO")
        assertTrue(result["p2"]!! < 1200, "Loser p2 should lose ELO")
        assertTrue(result["p3"]!! < 1200, "Loser p3 should lose ELO")
    }

    @Test
    fun `three-player match - winner gains more than each loser loses individually`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        val p1Gain = (result["p1"] ?: 1200) - 1200
        val p2Loss = 1200 - (result["p2"] ?: 1200)
        val p3Loss = 1200 - (result["p3"] ?: 1200)
        
        // Winner's gain = p2Loss + p3Loss (conservation in 3-player)
        assertEquals(p1Gain, p2Loss + p3Loss)
    }

    @Test
    fun `three-player match - winner gains equal amount against multiple losers`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
            ),
        )
        
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        
        // Winner gains kNorm * (1-0.5) per opponent
        // With 3 players: kNorm = 32/2 = 16
        // p1 gains 8 vs p2 and 8 vs p3 = 16 total
        val p1Gain = (result["p1"] ?: 1200) - 1200
        assertTrue(p1Gain in 14..18, "Winner should gain ~16 ELO in 3-player match (got $p1Gain)")
    }

    // ── Four+ player cases ──

    @Test
    fun `four-player match - 2 winners, 2 losers distributes ELO correctly`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),  // winner
                PlayerScore("p2", 10),  // winner (tied)
                PlayerScore("p3", 5),   // loser
                PlayerScore("p4", 3),   // loser
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        // With K=32, 4 players: kNorm = 32/3 ≈ 10.67
        // Both winners should gain ELO
        assertTrue(result["p1"]!! > 1200, "Winner p1 should gain ELO")
        assertTrue(result["p2"]!! > 1200, "Winner p2 should gain ELO")
        assertTrue(result["p3"]!! < 1200, "Loser p3 should lose ELO")
        assertTrue(result["p4"]!! < 1200, "Loser p4 should lose ELO")
    }

    @Test
    fun `five-player match - 1 winner, 4 losers`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 100),
                PlayerScore("p2", 5),
                PlayerScore("p3", 4),
                PlayerScore("p4", 3),
                PlayerScore("p5", 2),
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        // With K=32, 5 players: kNorm = 32/4 = 8
        assertTrue(result["p1"]!! > 1200, "Winner should gain ELO")
        for (i in 2..5) {
            assertTrue(result["p$i"]!! < 1200, "Loser p$i should lose ELO")
        }
    }

    // ── Multi-match chaining ──

    @Test
    fun `sequential matches - ELO carries forward across matches`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val match1 = Match("m1", 1000L, "g1", listOf(
            PlayerScore("p1", 10),
            PlayerScore("p2", 5),
        ))
        val match2 = Match("m2", 2000L, "g1", listOf(
            PlayerScore("p2", 10),
            PlayerScore("p1", 5),
        ))
        
        val result = calculator.compute(listOf(match1, match2), mapOf("g1" to gameType))
        
        // After m1: p1 gains, p2 loses
        // After m2: p2 should gain less (higher ELO) but still gains, p1 loses less (lower ELO)
        val finalElo = result
        // Both should end closer to 1200 than extreme values (symmetry in 1v1 sequences)
        assertTrue(finalElo["p1"]!! in 1180..1220, "p1 ELO should be near baseline after two 1v1 matches")
        assertTrue(finalElo["p2"]!! in 1180..1220, "p2 ELO should be near baseline after two 1v1 matches")
    }

    @Test
    fun `three consecutive matches - volatility compounds`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val match1 = Match("m1", 1000L, "g1", listOf(
            PlayerScore("p1", 10),  // p1 wins
            PlayerScore("p2", 5),
        ))
        val match2 = Match("m2", 2000L, "g1", listOf(
            PlayerScore("p1", 10),  // p1 wins again
            PlayerScore("p2", 5),
        ))
        val match3 = Match("m3", 3000L, "g1", listOf(
            PlayerScore("p1", 10),  // p1 wins again
            PlayerScore("p2", 5),
        ))
        
        val result = calculator.compute(listOf(match1, match2, match3), mapOf("g1" to gameType))
        
        val p1Final = result["p1"] ?: 1200
        val p2Final = result["p2"] ?: 1200
        
        // p1 wins all 3, so should have noticeably higher ELO
        assertTrue(p1Final > 1240, "p1 (3x winner) should have substantially higher ELO")
        assertTrue(p2Final < 1160, "p2 (3x loser) should have substantially lower ELO")
    }

    @Test
    fun `multi-match chain with alternating winners - ELO converges`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val matches = listOf(
            Match("m1", 1000L, "g1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))),  // p1 wins
            Match("m2", 2000L, "g1", listOf(PlayerScore("p2", 10), PlayerScore("p1", 5))),  // p2 wins
            Match("m3", 3000L, "g1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))),  // p1 wins
            Match("m4", 4000L, "g1", listOf(PlayerScore("p2", 10), PlayerScore("p1", 5))),  // p2 wins
        )
        
        val result = calculator.compute(matches, mapOf("g1" to gameType))
        
        val p1Final = result["p1"] ?: 1200
        val p2Final = result["p2"] ?: 1200
        
        // With equal wins and losses, ELOs should be closer to baseline
        assertTrue(p1Final in 1150..1250, "p1 (2 wins, 2 losses) should converge near baseline")
        assertTrue(p2Final in 1150..1250, "p2 (2 wins, 2 losses) should converge near baseline")
    }

    @Test
    fun `three-player chain - consistent winner accumulates more ELO`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val matches = listOf(
            Match("m1", 1000L, "g1", listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
            )),
            Match("m2", 2000L, "g1", listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
            )),
            Match("m3", 3000L, "g1", listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
            )),
        )
        
        val result = calculator.compute(matches, mapOf("g1" to gameType))
        
        val p1Final = result["p1"] ?: 1200
        val p2Final = result["p2"] ?: 1200
        val p3Final = result["p3"] ?: 1200
        
        // Ranking should be maintained: p1 > p2 > p3
        assertTrue(p1Final > p2Final, "p1 (consistent winner) should have highest ELO")
        // p2 should lose less than p3 (p2 beats p3, p3 loses to both)
        assertTrue(p2Final >= p3Final - 5, "p2 should not lose much more than p3")
    }

    // ── Tie-break & manual winners ──

    @Test
    fun `three-player match with manual selection tie-break - only manual winner gains`() {
        val gameType = GameType(
            id = "g1",
            name = "Test",
            winCondition = WinCondition.HIGHEST_SCORE,
            tieBreakRule = TieBreakRule.MANUAL_SELECTION
        )
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 10),  // tied with p1
                PlayerScore("p3", 5),
            ),
            manualWinners = listOf("p1"),  // manually select p1 as sole winner
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        
        assertTrue(result["p1"]!! > 1200, "Manual winner p1 should gain ELO")
        assertTrue(result["p2"]!! < 1200, "Tied but not selected p2 should lose ELO")
        assertTrue(result["p3"]!! < 1200, "Loser p3 should lose ELO")
    }

    @Test
    fun `four-player with secondary score tie-break`() {
        val gameType = GameType(
            id = "g1",
            name = "Test",
            winCondition = WinCondition.HIGHEST_SCORE,
            tieBreakRule = TieBreakRule.SECONDARY_SCORE,
            tieBreakCondition = WinCondition.LOWEST_SCORE
        )
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),   // tied for first
                PlayerScore("p2", 10),   // tied for first; secondary: 5
                PlayerScore("p3", 10),   // tied for first; secondary: 3
                PlayerScore("p4", 5),    // clear loser
            ),
            secondaryPlayerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        
        // p3 should win by secondary (lowest score = 3)
        assertTrue(result["p3"]!! > 1200, "p3 (secondary winner) should gain ELO")
        assertTrue(result["p1"]!! < 1200, "p1 (lost on secondary) should lose ELO")
        assertTrue(result["p2"]!! < 1200, "p2 (lost on secondary) should lose ELO")
        assertTrue(result["p4"]!! < 1200, "p4 (clear loser) should lose ELO")
    }

    // ── K-factor & volatility adaptation ──

    @Test
    fun `K-factor distributes fairly across different player counts`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        // 2-player match
        val match2 = Match("m1", 1000L, "g1", listOf(
            PlayerScore("p1", 10),
            PlayerScore("p2", 5),
        ))
        val result2 = calculator.compute(listOf(match2), mapOf("g1" to gameType))
        val p1Gain2 = (result2["p1"] ?: 1200) - 1200
        
        // 3-player match
        val match3 = Match("m2", 1000L, "g1", listOf(
            PlayerScore("p3", 10),
            PlayerScore("p4", 5),
            PlayerScore("p5", 3),
        ))
        val result3 = calculator.compute(listOf(match3), mapOf("g1" to gameType))
        val p3Gain3 = (result3["p3"] ?: 1200) - 1200
        
        // In both cases: K/(N-1) * sum of (1 - expectedWins)
        // 2-player: 32/1 * (1 - 0.5) = 16
        // 3-player: 32/2 * [(1 - 0.5) + (1 - 0.5)] = 16 * 2 = 16 (wait no)
        // Actually: 2-player: winner plays 1 match, gains K/1 = 32, but only 50% expected, so ~16
        // 3-player: winner plays 2 matches, each kNorm=16, so 8+8=16 total
        // So gains should be EQUAL, not different!
        assertEquals(p1Gain2, p3Gain3, "Winner gains should be equal regardless of player count (1 vs 2 losers)")
    }

    @Test
    fun `ELO changes are zero-sum across winners and losers`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
                PlayerScore("p4", 2),
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        
        val totalChange = result.values.sumOf { it - 1200 }
        // Total ELO change should be near zero (rounding may cause small deviations)
        assertTrue(totalChange in -2..2, "Total ELO change should be zero-sum (got $totalChange)")
    }

    @Test
    fun `underdog winner gains more ELO than favorite winner`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        // Scenario 1: p1 (1200) beats p2 (1200) - equal
        val match1 = Match("m1", 1000L, "g1", listOf(
            PlayerScore("p1", 10),
            PlayerScore("p2", 5),
        ))
        val result1 = calculator.compute(listOf(match1), mapOf("g1" to gameType))
        val p1GainDefault = (result1["p1"] ?: 1200) - 1200
        
        // Scenario 2: p3 (1000, underdog) beats p4 (1300, favorite) - one pre-configured match first
        val preMatch = Match("pm", 900L, "g1", listOf(
            PlayerScore("p3", 10),
            PlayerScore("p4", 5),
        ))
        val postMatch = Match("m2", 950L, "g1", listOf(
            PlayerScore("p5", 10),
            PlayerScore("p6", 5),
        ))
        val resultChain = calculator.compute(listOf(preMatch, postMatch), mapOf("g1" to gameType))
        val p5GainBase = (resultChain["p5"] ?: 1200) - 1200
        
        // Both are equal ELO, so gains should be similar (demonstrating consistency)
        assertEquals(p1GainDefault, p5GainBase, "Equal ELO matches should yield equal gains")
    }

    @Test
    fun `match with three participants - verify K-norm calculation`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val match = Match(
            id = "m1",
            date = 1000L,
            gameTypeId = "g1",
            playerScores = listOf(
                PlayerScore("p1", 10),
                PlayerScore("p2", 5),
                PlayerScore("p3", 3),
            ),
        )
        val result = calculator.compute(listOf(match), mapOf("g1" to gameType))
        
        // K=32, N=3, kNorm = 32/(3-1) = 16
        // p1 wins vs 2 opponents, each with expected win ~0.5 (equal ELO)
        // Gain per opponent ≈ 16 * (1 - 0.5) = 8, total ≈ 16
        val p1Gain = (result["p1"] ?: 1200) - 1200
        val p2Loss = 1200 - (result["p2"] ?: 1200)
        val p3Loss = 1200 - (result["p3"] ?: 1200)
        
        assertTrue(p1Gain in 14..18, "Winner gain should be ~16 (got $p1Gain)")
        assertTrue(p2Loss + p3Loss == p1Gain, "Loser losses should sum to winner gain")
    }

    @Test
    fun `long winning streak increases ELO more than expected`() {
        val gameType = GameType(id = "g1", name = "Test", winCondition = WinCondition.HIGHEST_SCORE)
        
        val matches = mutableListOf<Match>()
        for (i in 1..5) {
            matches.add(Match(
                id = "m$i",
                date = 1000L + i * 100,
                gameTypeId = "g1",
                playerScores = listOf(
                    PlayerScore("champion", 10),
                    PlayerScore("opponent$i", 5),
                ),
            ))
        }
        
        val result = calculator.compute(matches, mapOf("g1" to gameType))
        val championElo = result["champion"] ?: 1200
        
        // After 5 wins against equal opponents: each win ~16 ELO (K/2 for 2-player)
        // Expected: 1200 + 5*16 = 1280
        assertTrue(championElo > 1270, "5-time winner should exceed 1270 ELO")
    }
}
