package com.scoreo.infrastructure

import com.scoreo.domain.service.isUuid
import com.scoreo.domain.service.migrateMatchesJson
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class MatchMigrationTest {

    private val json = Json { ignoreUnknownKeys = true }
    private val fixedId = "550e8400-e29b-41d4-a716-446655440000"

    @Test
    fun `null when JSON is invalid`() {
        val result = migrateMatchesJson("not json", json) { fixedId }
        assertNull(result)
    }

    @Test
    fun `null when root is not an array`() {
        val result = migrateMatchesJson("""{"key": "value"}""", json) { fixedId }
        assertNull(result)
    }

    @Test
    fun `null when no migration needed`() {
        val input = """[{"id": "$fixedId", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNull(result)
    }

    @Test
    fun `migrates string date to epoch millis`() {
        val input = """[{"id": "$fixedId", "date": "2024-01-15", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNotNull(result)
        val parsed = json.parseToJsonElement(result).jsonArray
        val date = parsed[0].jsonObject["date"]
        assertNotNull(date)
        assertTrue(date is JsonPrimitive && date.isString == false)
        assertEquals(1705276800000L, (date as JsonPrimitive).content.toLong())
    }

    @Test
    fun `replaces non-uuid id with generated id`() {
        val input = """[{"id": "old-id-123", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNotNull(result)
        val parsed = json.parseToJsonElement(result).jsonArray
        assertEquals(fixedId, parsed[0].jsonObject["id"]?.jsonPrimitive?.content)
    }

    @Test
    fun `migrates both date and id in same record`() {
        val input = """[{"id": "old", "date": "2024-06-01", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNotNull(result)
        val parsed = json.parseToJsonElement(result).jsonArray[0].jsonObject
        assertEquals(fixedId, parsed["id"]?.jsonPrimitive?.content)
        assertEquals(1717200000000L, parsed["date"]?.jsonPrimitive?.content?.toLong())
    }

    @Test
    fun `keeps valid uuid unchanged`() {
        val validUuid = "550e8400-e29b-41d4-a716-446655440000"
        val input = """[{"id": "$validUuid", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val result = migrateMatchesJson(input, json) { "should-not-be-used" }
        assertNull(result)
    }

    @Test
    fun `migrates multiple records independently`() {
        val input = """[
            {"id": "old-a", "date": "2024-01-01", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []},
            {"id": "$fixedId", "date": 2000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}
        ]"""
        val result = migrateMatchesJson(input, json) { "new-uuid" }
        assertNotNull(result)
        val arr = json.parseToJsonElement(result).jsonArray
        assertEquals(2, arr.size)
        assertEquals("new-uuid", arr[0].jsonObject["id"]?.jsonPrimitive?.content)
        assertEquals(fixedId, arr[1].jsonObject["id"]?.jsonPrimitive?.content)
    }

    @Test
    fun `handles empty array`() {
        val result = migrateMatchesJson("[]", json) { fixedId }
        assertNull(result)
    }

    @Test
    fun `uppercase uuid is recognized as valid`() {
        assertTrue(isUuid("550E8400-E29B-41D4-A716-446655440000"))
    }

    @Test
    fun `mixed case uuid is recognized as valid`() {
        assertTrue(isUuid("550e8400-e29B-41D4-A716-446655440000"))
    }

    @Test
    fun `invalid date string left unchanged`() {
        val input = """[{"id": "$fixedId", "date": "not-a-date", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNull(result)
    }

    @Test
    fun `empty date string left unchanged`() {
        val input = """[{"id": "$fixedId", "date": "", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNull(result)
    }

    @Test
    fun `migration is idempotent after date migration`() {
        val input = """[{"id": "$fixedId", "date": "2024-01-15", "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val first = migrateMatchesJson(input, json) { "new-id" }
        assertNotNull(first)
        val second = migrateMatchesJson(first!!, json) { "another-id" }
        assertNull(second)
    }

    @Test
    fun `migration is idempotent after id migration`() {
        val input = """[{"id": "old-id", "date": 1000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": []}]"""
        val first = migrateMatchesJson(input, json) { fixedId }
        assertNotNull(first)
        val second = migrateMatchesJson(first!!, json) { "another-id" }
        assertNull(second)
    }

    @Test
    fun `extra fields in playerScores are preserved through migration`() {
        val input = """[{"id": "old-id", "date": 1000000, "gameTypeId": "gt1", "playerScores": [{"playerId": "p1", "score": 10, "extra": "keep"}]}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNotNull(result)
        val parsed = json.parseToJsonElement(result).jsonArray[0].jsonObject
        val scores = parsed["playerScores"]?.jsonArray
        assertNotNull(scores)
        assertEquals("keep", scores[0].jsonObject["extra"]?.jsonPrimitive?.content)
    }

    @Test
    fun `migration preserves manualWinners`() {
        val input = """[{"id": "old-id", "date": 1000000, "gameTypeId": "gt1", "playerScores": [{"playerId": "p1", "score": 10}], "manualWinners": ["p1"]}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNotNull(result)
        val parsed = json.parseToJsonElement(result).jsonArray[0].jsonObject
        assertEquals("p1", parsed["manualWinners"]?.jsonArray?.get(0)?.jsonPrimitive?.content)
    }

    @Test
    fun `records missing id field are still migrated for date`() {
        val input = """[{"date": "2024-01-15", "gameTypeId": "gt1", "playerScores": []}]"""
        val result = migrateMatchesJson(input, json) { fixedId }
        assertNotNull(result)
        val parsed = json.parseToJsonElement(result).jsonArray[0].jsonObject
        assertEquals(1705276800000L, parsed["date"]?.jsonPrimitive?.content?.toLong())
    }
}
