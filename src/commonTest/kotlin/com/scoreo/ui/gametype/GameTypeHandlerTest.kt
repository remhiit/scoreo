package com.scoreo.ui.gametype

import com.scoreo.FakeGameTypeRepository
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GameTypeHandlerTest {

    private fun buildHandler(repo: FakeGameTypeRepository = FakeGameTypeRepository()) =
        GameTypeHandler(
            addGameType = AddGameTypeUseCase(repo),
            getGameTypes = GetGameTypesUseCase(repo),
        )

    @Test
    fun `initial state has empty game type list and empty input`() {
        val handler = buildHandler()
        assertTrue(handler.state.gameTypes.isEmpty())
        assertEquals("", handler.state.inputName)
        assertEquals(WinCondition.HIGHEST_SCORE, handler.state.selectedWinCondition)
        assertNull(handler.state.error)
    }

    @Test
    fun `UpdateName updates inputName and clears error`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.AddGameType)
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        assertEquals("Belote", handler.state.inputName)
        assertNull(handler.state.error)
    }

    @Test
    fun `SelectWinCondition updates selectedWinCondition`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.SelectWinCondition(WinCondition.LOWEST_SCORE))
        assertEquals(WinCondition.LOWEST_SCORE, handler.state.selectedWinCondition)
    }

    @Test
    fun `AddGameType with valid name adds game type and clears input`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        assertEquals(1, handler.state.gameTypes.size)
        assertEquals("Belote", handler.state.gameTypes.first().name)
        assertEquals("", handler.state.inputName)
        assertNull(handler.state.error)
    }

    @Test
    fun `AddGameType with blank name sets error and does not add`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("   "))
        handler.handle(GameTypeIntent.AddGameType)
        assertTrue(handler.state.gameTypes.isEmpty())
        assertEquals("Name cannot be empty", handler.state.error)
    }

    @Test
    fun `AddGameType with empty name sets error`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.AddGameType)
        assertTrue(handler.state.gameTypes.isEmpty())
        assertEquals("Name cannot be empty", handler.state.error)
    }

    @Test
    fun `adding multiple game types accumulates in state`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        handler.handle(GameTypeIntent.UpdateName("Golf"))
        handler.handle(GameTypeIntent.AddGameType)
        assertEquals(2, handler.state.gameTypes.size)
    }
}
