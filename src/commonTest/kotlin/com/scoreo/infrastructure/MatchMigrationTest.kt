package com.scoreo.infrastructure

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
}
