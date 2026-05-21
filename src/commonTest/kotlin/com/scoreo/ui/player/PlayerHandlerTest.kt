package com.scoreo.ui.player

import com.scoreo.FakeGameTypeRepository
import com.scoreo.FakeMatchRepository
import com.scoreo.FakePlayerRepository
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PlayerHandlerTest {

    private fun buildHandler(repo: FakePlayerRepository = FakePlayerRepository()) =
        PlayerHandler(
            addPlayer = AddPlayerUseCase(repo),
            getPlayers = GetPlayersUseCase(repo),
            getPlayerStats = GetPlayerStatsUseCase(FakeMatchRepository(), FakeGameTypeRepository()),
        )

    @Test
    fun `initial state has empty player list and empty input`() {
        val handler = buildHandler()

        assertTrue(handler.state.players.isEmpty())
        assertEquals("", handler.state.inputName)
        assertNull(handler.state.error)
    }

    @Test
    fun `UpdateInput updates inputName and clears error`() {
        val handler = buildHandler()

        handler.handle(PlayerIntent.AddPlayer) // trigger error first
        handler.handle(PlayerIntent.UpdateInput("Alice"))

        assertEquals("Alice", handler.state.inputName)
        assertNull(handler.state.error)
    }

    @Test
    fun `AddPlayer with valid name adds player and clears input`() {
        val handler = buildHandler()

        handler.handle(PlayerIntent.UpdateInput("Alice"))
        handler.handle(PlayerIntent.AddPlayer)

        assertEquals(1, handler.state.players.size)
        assertEquals("Alice", handler.state.players.first().name)
        assertEquals("", handler.state.inputName)
        assertNull(handler.state.error)
    }

    @Test
    fun `AddPlayer with blank name sets error and does not add player`() {
        val handler = buildHandler()

        handler.handle(PlayerIntent.UpdateInput("   "))
        handler.handle(PlayerIntent.AddPlayer)

        assertTrue(handler.state.players.isEmpty())
        assertNotNull(handler.state.error)
    }

    @Test
    fun `AddPlayer with empty input sets error`() {
        val handler = buildHandler()

        handler.handle(PlayerIntent.AddPlayer)

        assertTrue(handler.state.players.isEmpty())
        assertNotNull(handler.state.error)
    }

    @Test
    fun `adding multiple players accumulates in state`() {
        val handler = buildHandler()

        handler.handle(PlayerIntent.UpdateInput("Alice"))
        handler.handle(PlayerIntent.AddPlayer)
        handler.handle(PlayerIntent.UpdateInput("Bob"))
        handler.handle(PlayerIntent.AddPlayer)

        assertEquals(2, handler.state.players.size)
    }
}
