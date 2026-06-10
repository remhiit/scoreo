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
}
