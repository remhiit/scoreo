package com.scoreo.ui.import

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import com.scoreo.TestImportData
import com.scoreo.application.ImportMatchesUseCase
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull

class ImportHandlerTest {

    private fun buildHandler(
        playerRepo: InMemoryPlayerRepository = InMemoryPlayerRepository(),
        gameTypeRepo: InMemoryGameTypeRepository = InMemoryGameTypeRepository(),
        matchRepo: InMemoryMatchRepository = InMemoryMatchRepository(),
        currentDate: () -> Long = { 1767225600000L },
    ) = ImportHandler(
        importUseCase = ImportMatchesUseCase(playerRepo, gameTypeRepo, matchRepo, currentDate),
    )

    @Test
    fun `initial state is IDLE`() {
        val handler = buildHandler()
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertNull(handler.state.preview)
        assertNull(handler.state.error)
    }

    @Test
    fun `FileLoaded with valid JSON transitions to READY`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.FileLoaded(TestImportData.validJson))
        assertEquals(ImportStep.READY, handler.state.step)
        assertNotNull(handler.state.preview)
        assertNull(handler.state.error)
    }

    @Test
    fun `FileLoaded with invalid JSON stays in IDLE with error`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.FileLoaded(TestImportData.invalidJson))
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertNull(handler.state.preview)
        assertNotNull(handler.state.error)
    }

    @Test
    fun `Execute in READY transitions to DONE`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.FileLoaded(TestImportData.validJson))
        handler.handle(ImportIntent.Execute)
        assertEquals(ImportStep.DONE, handler.state.step)
        assertNotNull(handler.state.result)
        assertNull(handler.state.error)
    }

    @Test
    fun `Execute reports imported count`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.FileLoaded(TestImportData.validJson))
        handler.handle(ImportIntent.Execute)
        assertEquals(1, handler.state.result?.imported)
    }

    @Test
    fun `Execute in IDLE does nothing`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.Execute)
        assertEquals(ImportStep.IDLE, handler.state.step)
    }

    @Test
    fun `Reset returns to IDLE`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.FileLoaded(TestImportData.validJson))
        handler.handle(ImportIntent.Execute)
        assertEquals(ImportStep.DONE, handler.state.step)
        handler.handle(ImportIntent.Reset)
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertNull(handler.state.preview)
        assertNull(handler.state.result)
        assertNull(handler.state.error)
    }

    @Test
    fun `FileLoaded with empty games array sets error`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.FileLoaded(TestImportData.emptyGamesJson))
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertNotNull(handler.state.error)
    }

    // ============ FileError Tests ============

    @Test
    fun `FileError sets error message in state`() {
        val handler = buildHandler()
        val errorMessage = "Access denied: cannot read file"
        handler.handle(ImportIntent.FileError(errorMessage))
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertEquals(errorMessage, handler.state.error)
        assertNull(handler.state.preview)
    }

    @Test
    fun `FileError with access denied message`() {
        val handler = buildHandler()
        val errorMessage = "Permission denied: insufficient privileges to read file"
        handler.handle(ImportIntent.FileError(errorMessage))
        assertEquals(errorMessage, handler.state.error)
    }

    @Test
    fun `FileError with file too large message`() {
        val handler = buildHandler()
        val errorMessage = "File too large: exceeds maximum size of 10MB"
        handler.handle(ImportIntent.FileError(errorMessage))
        assertEquals(errorMessage, handler.state.error)
    }

    @Test
    fun `FileError with invalid format message`() {
        val handler = buildHandler()
        val errorMessage = "Invalid file format: expected JSON but got binary data"
        handler.handle(ImportIntent.FileError(errorMessage))
        assertEquals(errorMessage, handler.state.error)
    }

    @Test
    fun `FileError with read error message`() {
        val handler = buildHandler()
        val errorMessage = "Read error: I/O exception while reading file"
        handler.handle(ImportIntent.FileError(errorMessage))
        assertEquals(errorMessage, handler.state.error)
    }

    @Test
    fun `FileError with file not found message`() {
        val handler = buildHandler()
        val errorMessage = "File not found or was deleted"
        handler.handle(ImportIntent.FileError(errorMessage))
        assertEquals(errorMessage, handler.state.error)
    }

    @Test
    fun `FileError dismissal via Reset returns to IDLE`() {
        val handler = buildHandler()
        val errorMessage = "Read error: cannot access file"
        handler.handle(ImportIntent.FileError(errorMessage))
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertEquals(errorMessage, handler.state.error)

        // Dismiss error with Reset
        handler.handle(ImportIntent.Reset)
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertNull(handler.state.error)
        assertNull(handler.state.preview)
    }

    @Test
    fun `FileError prevents partial import - no data saved`() {
        val playerRepo = InMemoryPlayerRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        val matchRepo = InMemoryMatchRepository()
        val handler = buildHandler(playerRepo, gameTypeRepo, matchRepo)

        // Trigger file error
        val errorMessage = "File corrupted"
        handler.handle(ImportIntent.FileError(errorMessage))

        // Verify no data was imported
        assertEquals(0, playerRepo.getAll(includeInactive = true).size)
        assertEquals(0, gameTypeRepo.getAll().size)
        assertEquals(0, matchRepo.getAll().size)
        assertEquals(errorMessage, handler.state.error)
    }

    @Test
    fun `FileError from READY state resets to IDLE`() {
        val handler = buildHandler()
        // Load valid file first
        handler.handle(ImportIntent.FileLoaded(TestImportData.validJson))
        assertEquals(ImportStep.READY, handler.state.step)
        assertNotNull(handler.state.preview)

        // Then error occurs
        val errorMessage = "Connection lost during processing"
        handler.handle(ImportIntent.FileError(errorMessage))

        // Should revert to IDLE with error
        assertEquals(ImportStep.IDLE, handler.state.step)
        assertEquals(errorMessage, handler.state.error)
        assertNull(handler.state.preview) // Preview should be cleared
    }

    @Test
    fun `Multiple FileErrors update message correctly`() {
        val handler = buildHandler()
        handler.handle(ImportIntent.FileError("First error"))
        assertEquals("First error", handler.state.error)

        handler.handle(ImportIntent.FileError("Second error"))
        assertEquals("Second error", handler.state.error)
    }
}
