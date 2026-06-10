package com.scoreo.domain

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
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
}
