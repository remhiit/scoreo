package com.scoreo.application

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

class IdGeneratorTest {

    private val UUID_REGEX = Regex(
        "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$"
    )

    @Test
    fun `generated id matches UUID v4 format`() {
        val id = IdGenerator.newId()
        assertTrue(UUID_REGEX.matches(id), "ID '$id' does not match UUID v4 format")
    }

    @Test
    fun `generated id has correct length`() {
        val id = IdGenerator.newId()
        assertEquals(36, id.length)
    }

    @Test
    fun `generated id has version 4 at position 14`() {
        val id = IdGenerator.newId()
        assertEquals('4', id[14])
    }

    @Test
    fun `generated id has correct variant bits at position 19`() {
        val id = IdGenerator.newId()
        assertTrue(id[19] in listOf('8', '9', 'a', 'b'))
    }

    @Test
    fun `generated ids are unique`() {
        val ids = (1..100).map { IdGenerator.newId() }.toSet()
        assertEquals(100, ids.size, "Expected 100 unique IDs")
    }

    @Test
    fun `generated id has hyphens at correct positions`() {
        val id = IdGenerator.newId()
        assertEquals('-', id[8])
        assertEquals('-', id[13])
        assertEquals('-', id[18])
        assertEquals('-', id[23])
    }
}
