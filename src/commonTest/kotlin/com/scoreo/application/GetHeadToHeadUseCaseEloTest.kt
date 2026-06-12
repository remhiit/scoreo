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

class GetHeadToHeadUseCaseEloTest {

    private val gt1 = GameType("gt1", "HIGHEST", WinCondition.HIGHEST_SCORE)
    private val gt2 = GameType("gt2", "LOWEST", WinCondition.LOWEST_SCORE)

    @Test
    fun `two players one match basic elo`() {
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob"),
            gameTypes(gt1),
            matches(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)))),
        )
        val result = useCase()
        assertEquals(1216, result.find { it.playerId == "p1" }?.elo)
        assertEquals(1184, result.find { it.playerId == "p2" }?.elo)
    }

    @Test
    fun `two players two matches elo reverses`() {
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob"),
            gameTypes(gt1),
            matches(
                Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))),
                Match("m2", 2000L, "gt1", listOf(PlayerScore("p1", 3), PlayerScore("p2", 8))),
            ),
        )
        val result = useCase()
        assertTrue(result.find { it.playerId == "p2" }!!.elo > result.find { it.playerId == "p1" }!!.elo)
        assertEquals(2, result.size)
    }

    @Test
    fun `three players one winner elo normalized`() {
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob", "p3" to "Charlie"),
            gameTypes(gt1),
            matches(Match("m1", 1000L, "gt1", listOf(
                PlayerScore("p1", 10), PlayerScore("p2", 5), PlayerScore("p3", 3)
            ))),
        )
        val result = useCase()
        val alice = result.find { it.playerId == "p1" }!!
        val bob = result.find { it.playerId == "p2" }!!
        val charlie = result.find { it.playerId == "p3" }!!

        assertTrue(alice.elo > 1200)
        assertTrue(bob.elo < 1200)
        assertTrue(charlie.elo < 1200)
        assertTrue(result.all { it.elo == 1200 || it.playerId == "p1" } || alice.elo > bob.elo)
    }

    @Test
    fun `three players two winners`() {
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob", "p3" to "Charlie"),
            gameTypes(gt1),
            matches(Match("m1", 1000L, "gt1", listOf(
                PlayerScore("p1", 10), PlayerScore("p2", 10), PlayerScore("p3", 5)
            ))),
        )
        val result = useCase()
        val alice = result.find { it.playerId == "p1" }!!
        val bob = result.find { it.playerId == "p2" }!!
        val charlie = result.find { it.playerId == "p3" }!!

        assertEquals(1208, alice.elo)
        assertEquals(1208, bob.elo)
        assertEquals(1184, charlie.elo)
    }

    @Test
    fun `four players one winner elo normalized`() {
        val useCase = useCase(
            players("p1" to "A", "p2" to "B", "p3" to "C", "p4" to "D"),
            gameTypes(gt1),
            matches(Match("m1", 1000L, "gt1", listOf(
                PlayerScore("p1", 10), PlayerScore("p2", 5), PlayerScore("p3", 4), PlayerScore("p4", 3)
            ))),
        )
        val result = useCase()

        val winner = result.find { it.playerId == "p1" }!!
        assertTrue(winner.elo > 1208)
        assertTrue(winner.elo < 1220)
        result.filter { it.playerId != "p1" }.forEach { assertTrue(it.elo < 1200) }
    }

    @Test
    fun `ex-aequo match elo unchanged`() {
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob"),
            gameTypes(gt1),
            matches(Match("m1", 1000L, "gt1", listOf(
                PlayerScore("p1", 10), PlayerScore("p2", 10)
            ))),
        )
        val result = useCase()
        assertEquals(1200, result.find { it.playerId == "p1" }?.elo)
        assertEquals(1200, result.find { it.playerId == "p2" }?.elo)
    }

    @Test
    fun `lowest score win condition`() {
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob"),
            gameTypes(gt2),
            matches(Match("m1", 1000L, "gt2", listOf(
                PlayerScore("p1", 3), PlayerScore("p2", 10)
            ))),
        )
        val result = useCase()
        assertEquals(1216, result.find { it.playerId == "p1" }?.elo)
        assertEquals(1184, result.find { it.playerId == "p2" }?.elo)
    }

    @Test
    fun `manual win condition`() {
        val gt = GameType("gt3", "MANUAL", WinCondition.MANUAL)
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob"),
            gameTypes(gt),
            matches(Match("m1", 1000L, "gt3", listOf(
                PlayerScore("p1", 10), PlayerScore("p2", 5)
            ), manualWinners = listOf("p1"))),
        )
        val result = useCase()
        assertEquals(1216, result.find { it.playerId == "p1" }?.elo)
        assertEquals(1184, result.find { it.playerId == "p2" }?.elo)
    }

    @Test
    fun `players with zero wins and losses excluded from leaderboard`() {
        val useCase = useCase(
            players("p1" to "Alice", "p2" to "Bob", "p3" to "Charlie"),
            gameTypes(gt1),
            matches(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)))),
        )
        val result = useCase()
        assertEquals(2, result.size)
        assertTrue(result.none { it.playerId == "p3" })
    }

    @Test
    fun `elo floor does not go negative`() {
        val useCase = useCase(
            players("p1" to "Loser", "p2" to "Winner"),
            gameTypes(gt1),
            List(100) { i ->
                Match("m$i", i.toLong(), "gt1", listOf(
                    PlayerScore("p2", 10), PlayerScore("p1", 0)
                ))
            },
        )
        val result = useCase()
        assertTrue(result.find { it.playerId == "p1" }!!.elo >= 0)
    }

    private fun useCase(
        players: List<Player>,
        gameTypes: List<GameType>,
        matches: List<Match>,
    ): GetHeadToHeadUseCase {
        val pr = InMemoryPlayerRepository()
        players.forEach { pr.save(it) }
        val gtr = InMemoryGameTypeRepository()
        gameTypes.forEach { gtr.save(it) }
        val mr = InMemoryMatchRepository()
        matches.forEach { mr.save(it) }
        return GetHeadToHeadUseCase(mr, gtr, pr)
    }

    private fun players(vararg p: Pair<String, String>): List<Player> =
        p.map { (id, name) -> Player(id, name) }

    private fun gameTypes(vararg gt: GameType): List<GameType> = gt.toList()

    private fun matches(vararg m: Match): List<Match> = m.toList()
}
