package com.scoreo.domain

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.MatchDraft
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals

private val testJson = Json { ignoreUnknownKeys = true }

class SerializationTest {

    @Test
    fun `Player serialization round-trip`() {
        val original = Player("p1", "Alice")
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<Player>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `GameType serialization round-trip`() {
        val original = GameType("gt1", "Belote", WinCondition.HIGHEST_SCORE)
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<GameType>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `GameType with MANUAL winCondition serialization round-trip`() {
        val original = GameType("gt2", "Custom", WinCondition.MANUAL)
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<GameType>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `PlayerScore serialization round-trip`() {
        val original = PlayerScore("p1", 42)
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<PlayerScore>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Match serialization round-trip`() {
        val original = Match(
            id = "m1",
            date = 1000000L,
            gameTypeId = "gt1",
            playerScores = listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)),
            manualWinners = emptyList(),
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<Match>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Match with manual winners serialization round-trip`() {
        val original = Match(
            id = "m2",
            date = 2000000L,
            gameTypeId = "gt1",
            playerScores = listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)),
            manualWinners = listOf("p1"),
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<Match>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Match ignores unknown fields (backward compat)`() {
        val json = """{
            "id": "m1",
            "date": 1000000,
            "gameTypeId": "gt1",
            "playerScores": [{"playerId": "p1", "score": 10}],
            "manualWinners": [],
            "futureField": "should be ignored"
        }"""
        val decoded = testJson.decodeFromString<Match>(json)
        assertEquals("m1", decoded.id)
    }

    @Test
    fun `PlayerScore with extra fields ignores them`() {
        val json = """{"playerId": "p1", "score": 42, "rank": 1}"""
        val decoded = testJson.decodeFromString<PlayerScore>(json)
        assertEquals("p1", decoded.playerId)
        assertEquals(42, decoded.score)
    }

    @Test
    fun `Player with active field serialization round-trip`() {
        val original = Player("p1", "Alice", active = true)
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<Player>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Player with active false serialization round-trip`() {
        val original = Player("p1", "Alice", active = false)
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<Player>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Player with anonymized name serialization round-trip`() {
        val original = Player("p1", "", active = false)
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<Player>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Player without active field defaults to true (backward compat)`() {
        val json = """{"id": "p1", "name": "Alice"}"""
        val decoded = testJson.decodeFromString<Player>(json)
        assertEquals(Player("p1", "Alice", active = true), decoded)
    }

    @Test
    fun `Match without manualWinners defaults to emptyList (backward compat)`() {
        val json = """{"id": "m1", "date": 1000000, "gameTypeId": "gt1", "playerScores": []}"""
        val decoded = testJson.decodeFromString<Match>(json)
        assertEquals(emptyList<String>(), decoded.manualWinners)
    }

    @Test
    fun `PlayerScore backward compat deserialization`() {
        val json = """{"playerId": "p1", "score": 10}"""
        val decoded = testJson.decodeFromString<PlayerScore>(json)
        assertEquals(PlayerScore("p1", 10), decoded)
    }

    @Test
    fun `GameType backward compat deserialization`() {
        val json = """{"id": "gt1", "name": "Test", "winCondition": "HIGHEST_SCORE"}"""
        val decoded = testJson.decodeFromString<GameType>(json)
        assertEquals(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE), decoded)
    }

    @Test
    fun `GameType with new tie-break fields serialization round-trip`() {
        val original = GameType(
            id = "gt3",
            name = "Belote with tie-break",
            winCondition = WinCondition.HIGHEST_SCORE,
            tieBreakRule = TieBreakRule.SECONDARY_SCORE,
            tieBreakCondition = WinCondition.LOWEST_SCORE,
            tieBreakLabel = "Best Secondary"
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<GameType>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `GameType without tie-break fields defaults correctly (backward compat)`() {
        val json = """{"id": "gt1", "name": "Classic", "winCondition": "HIGHEST_SCORE"}"""
        val decoded = testJson.decodeFromString<GameType>(json)
        val expected = GameType(
            id = "gt1",
            name = "Classic",
            winCondition = WinCondition.HIGHEST_SCORE,
            tieBreakRule = TieBreakRule.NONE,
            tieBreakCondition = WinCondition.HIGHEST_SCORE,
            tieBreakLabel = null
        )
        assertEquals(expected, decoded)
    }

    @Test
    fun `GameType with MANUAL_SELECTION tie-break serialization round-trip`() {
        val original = GameType(
            id = "gt4",
            name = "Tournament",
            winCondition = WinCondition.HIGHEST_SCORE,
            tieBreakRule = TieBreakRule.MANUAL_SELECTION
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<GameType>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Match with secondaryPlayerScores serialization round-trip`() {
        val original = Match(
            id = "m3",
            date = 3000000L,
            gameTypeId = "gt3",
            playerScores = listOf(PlayerScore("p1", 100), PlayerScore("p2", 100)),
            manualWinners = emptyList(),
            secondaryPlayerScores = listOf(PlayerScore("p1", 50), PlayerScore("p2", 75))
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<Match>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `Match without secondaryPlayerScores defaults to emptyList (backward compat)`() {
        val json = """{
            "id": "m1",
            "date": 1000000,
            "gameTypeId": "gt1",
            "playerScores": [{"playerId": "p1", "score": 10}],
            "manualWinners": []
        }"""
        val decoded = testJson.decodeFromString<Match>(json)
        assertEquals(emptyList<PlayerScore>(), decoded.secondaryPlayerScores)
    }

    @Test
    fun `TieBreakRule enum serialization round-trip`() {
        val rules = listOf(TieBreakRule.NONE, TieBreakRule.MANUAL_SELECTION, TieBreakRule.SECONDARY_SCORE)
        rules.forEach { original ->
            val json = testJson.encodeToString(original)
            val decoded = testJson.decodeFromString<TieBreakRule>(json)
            assertEquals(original, decoded)
        }
    }

    @Test
    fun `TieBreakRule enum label generation`() {
        assertEquals("No tie-break", TieBreakRule.NONE.label())
        assertEquals("Manual selection", TieBreakRule.MANUAL_SELECTION.label())
        assertEquals("Secondary score", TieBreakRule.SECONDARY_SCORE.label())
    }

    @Test
    fun `MatchDraft serialization round-trip`() {
        val original = MatchDraft(
            gameTypeId = "gt1",
            playerIds = listOf("alice", "bob"),
            rounds = listOf(
                mapOf("alice" to "10", "bob" to "5"),
                mapOf("alice" to "3", "bob" to "7")
            ),
            updatedAt = 1767225600000L
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<MatchDraft>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `MatchDraft without updatedAt defaults to current time (backward compat)`() {
        val json = """{
            "gameTypeId": "gt1",
            "playerIds": ["alice", "bob"],
            "rounds": [{"alice": "10", "bob": "5"}]
        }"""
        val decoded = testJson.decodeFromString<MatchDraft>(json)
        assertEquals("gt1", decoded.gameTypeId)
        assertEquals(listOf("alice", "bob"), decoded.playerIds)
        assertEquals(1, decoded.rounds.size)
        assertEquals("10", decoded.rounds[0]["alice"])
        // updatedAt has a default value, so it won't be null
        assertEquals(true, decoded.updatedAt > 0L)
    }

    @Test
    fun `MatchDraft with empty rounds round-trip`() {
        val original = MatchDraft(
            gameTypeId = "gt1",
            playerIds = listOf("alice", "bob"),
            rounds = emptyList(),
            updatedAt = 1000L
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<MatchDraft>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `MatchDraft with single empty round round-trip`() {
        val original = MatchDraft(
            gameTypeId = "gt1",
            playerIds = listOf("alice", "bob"),
            rounds = listOf(emptyMap()),
            updatedAt = 2000L
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<MatchDraft>(json)
        assertEquals(original, decoded)
    }

    @Test
    fun `MatchDraft with partial round data (missing players) round-trip`() {
        val original = MatchDraft(
            gameTypeId = "gt1",
            playerIds = listOf("alice", "bob", "charlie"),
            rounds = listOf(
                mapOf("alice" to "10")  // bob and charlie missing
            ),
            updatedAt = 3000L
        )
        val json = testJson.encodeToString(original)
        val decoded = testJson.decodeFromString<MatchDraft>(json)
        assertEquals(original, decoded)
        assertEquals("10", decoded.rounds[0]["alice"])
        assertEquals(null, decoded.rounds[0]["bob"])  // missing entries remain null
    }
}
