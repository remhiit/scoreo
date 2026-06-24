package com.scoreo.ui.gametype

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.application.AddGameTypeUseCase
import com.scoreo.application.ArchiveGameTypeUseCase
import com.scoreo.application.GetGameTypesUseCase
import com.scoreo.application.UpdateGameTypeUseCase
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class GameTypeHandlerTest {

    private fun buildHandler(repo: InMemoryGameTypeRepository = InMemoryGameTypeRepository()) =
        GameTypeHandler(
            addGameType = AddGameTypeUseCase(repo),
            updateGameType = UpdateGameTypeUseCase(repo),
            getGameTypes = GetGameTypesUseCase(repo),
            gameTypeRepository = repo,
            archiveGameType = ArchiveGameTypeUseCase(repo),
        )

    @Test
    fun `initial state has empty game type list and empty input`() {
        val handler = buildHandler()
        assertTrue(handler.state.gameTypes.isEmpty())
        assertEquals("", handler.state.inputName)
        assertEquals(WinCondition.HIGHEST_SCORE, handler.state.selectedWinCondition)
        assertEquals(TieBreakRule.NONE, handler.state.selectedTieBreakRule)
        assertEquals(WinCondition.HIGHEST_SCORE, handler.state.selectedTieBreakCondition)
        assertNull(handler.state.selectedTieBreakLabel)
        assertNull(handler.state.editingGameId)
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
        assertEquals("name: Game type name must not be blank", handler.state.error)
    }

    @Test
    fun `AddGameType with empty name sets error`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.AddGameType)
        assertTrue(handler.state.gameTypes.isEmpty())
        assertEquals("name: Game type name must not be blank", handler.state.error)
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

    // P0-04: Tie Break Configuration UI Tests
    @Test
    fun `UpdateTieBreakRule updates selectedTieBreakRule`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateTieBreakRule(TieBreakRule.SECONDARY_SCORE))
        assertEquals(TieBreakRule.SECONDARY_SCORE, handler.state.selectedTieBreakRule)
    }

    @Test
    fun `UpdateTieBreakCondition updates selectedTieBreakCondition`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateTieBreakCondition(WinCondition.LOWEST_SCORE))
        assertEquals(WinCondition.LOWEST_SCORE, handler.state.selectedTieBreakCondition)
    }

    @Test
    fun `UpdateTieBreakLabel updates selectedTieBreakLabel`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateTieBreakLabel("Points"))
        assertEquals("Points", handler.state.selectedTieBreakLabel)
    }

    @Test
    fun `UpdateTieBreakLabel with blank string sets to null`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateTieBreakLabel("Points"))
        handler.handle(GameTypeIntent.UpdateTieBreakLabel("   "))
        assertNull(handler.state.selectedTieBreakLabel)
    }

    @Test
    fun `AddGameType includes tie break configuration`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Golf"))
        handler.handle(GameTypeIntent.UpdateTieBreakRule(TieBreakRule.SECONDARY_SCORE))
        handler.handle(GameTypeIntent.UpdateTieBreakCondition(WinCondition.LOWEST_SCORE))
        handler.handle(GameTypeIntent.UpdateTieBreakLabel("Handicap"))
        handler.handle(GameTypeIntent.AddGameType)
        
        assertEquals(1, handler.state.gameTypes.size)
        val gameType = handler.state.gameTypes.first()
        assertEquals("Golf", gameType.name)
        assertEquals(TieBreakRule.SECONDARY_SCORE, gameType.tieBreakRule)
        assertEquals(WinCondition.LOWEST_SCORE, gameType.tieBreakCondition)
        assertEquals("Handicap", gameType.tieBreakLabel)
    }

    // P0-06: Game Type Edit Logic Tests
    @Test
    fun `EditGameType pre-fills state with game type values`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameTypeId = handler.state.gameTypes.first().id
        handler.handle(GameTypeIntent.EditGameType(gameTypeId))
        
        assertEquals("Belote", handler.state.inputName)
        assertEquals(gameTypeId, handler.state.editingGameId)
    }

    @Test
    fun `EditGameType pre-fills tie break configuration`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Golf"))
        handler.handle(GameTypeIntent.UpdateTieBreakRule(TieBreakRule.SECONDARY_SCORE))
        handler.handle(GameTypeIntent.UpdateTieBreakCondition(WinCondition.LOWEST_SCORE))
        handler.handle(GameTypeIntent.UpdateTieBreakLabel("Handicap"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameTypeId = handler.state.gameTypes.first().id
        handler.handle(GameTypeIntent.EditGameType(gameTypeId))
        
        assertEquals(TieBreakRule.SECONDARY_SCORE, handler.state.selectedTieBreakRule)
        assertEquals(WinCondition.LOWEST_SCORE, handler.state.selectedTieBreakCondition)
        assertEquals("Handicap", handler.state.selectedTieBreakLabel)
    }

    @Test
    fun `CancelEdit clears all input fields and resets editingGameId`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameTypeId = handler.state.gameTypes.first().id
        handler.handle(GameTypeIntent.EditGameType(gameTypeId))
        assertEquals(gameTypeId, handler.state.editingGameId)
        
        handler.handle(GameTypeIntent.CancelEdit)
        assertEquals("", handler.state.inputName)
        assertNull(handler.state.editingGameId)
        assertEquals(TieBreakRule.NONE, handler.state.selectedTieBreakRule)
        assertNull(handler.state.selectedTieBreakLabel)
    }

    @Test
    fun `UpdateGameType modifies existing game type`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val originalGameType = handler.state.gameTypes.first()
        val updatedGameType = originalGameType.copy(
            name = "Belote Updated",
            tieBreakRule = TieBreakRule.MANUAL_SELECTION,
        )
        handler.handle(GameTypeIntent.EditGameType(originalGameType.id))
        handler.handle(GameTypeIntent.UpdateGameType(updatedGameType))
        
        assertEquals(1, handler.state.gameTypes.size)
        assertEquals("Belote Updated", handler.state.gameTypes.first().name)
        assertEquals(TieBreakRule.MANUAL_SELECTION, handler.state.gameTypes.first().tieBreakRule)
    }

    @Test
    fun `UpdateGameType resets edit mode`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameType = handler.state.gameTypes.first()
        handler.handle(GameTypeIntent.EditGameType(gameType.id))
        handler.handle(GameTypeIntent.UpdateGameType(gameType))
        
        assertNull(handler.state.editingGameId)
        assertEquals("", handler.state.inputName)
    }

    // P2-03: Archive Game Type Tests
    @Test
    fun `ShowArchiveConfirm sets archiveConfirmGameTypeId`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameTypeId = handler.state.gameTypes.first().id
        handler.handle(GameTypeIntent.ShowArchiveConfirm(gameTypeId))
        
        assertEquals(gameTypeId, handler.state.archiveConfirmGameTypeId)
    }

    @Test
    fun `DismissArchiveConfirm clears archiveConfirmGameTypeId`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameTypeId = handler.state.gameTypes.first().id
        handler.handle(GameTypeIntent.ShowArchiveConfirm(gameTypeId))
        assertEquals(gameTypeId, handler.state.archiveConfirmGameTypeId)
        
        handler.handle(GameTypeIntent.DismissArchiveConfirm)
        assertNull(handler.state.archiveConfirmGameTypeId)
    }

    @Test
    fun `ArchiveGameType archives the game and refreshes list`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        handler.handle(GameTypeIntent.UpdateName("Golf"))
        handler.handle(GameTypeIntent.AddGameType)
        
        assertEquals(2, handler.state.gameTypes.size)
        val gameTypeIdToArchive = handler.state.gameTypes.first().id
        
        handler.handle(GameTypeIntent.ArchiveGameType(gameTypeIdToArchive))
        
        // After archiving, only active games should appear
        assertEquals(1, handler.state.gameTypes.size)
        assertEquals("Golf", handler.state.gameTypes.first().name)
    }

    @Test
    fun `ArchiveGameType clears archiveConfirmGameTypeId`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameTypeId = handler.state.gameTypes.first().id
        handler.handle(GameTypeIntent.ShowArchiveConfirm(gameTypeId))
        handler.handle(GameTypeIntent.ArchiveGameType(gameTypeId))
        
        assertNull(handler.state.archiveConfirmGameTypeId)
    }

    @Test
    fun `ArchiveGameType clears selectedGameId`() {
        val handler = buildHandler()
        handler.handle(GameTypeIntent.UpdateName("Belote"))
        handler.handle(GameTypeIntent.AddGameType)
        
        val gameTypeId = handler.state.gameTypes.first().id
        handler.handle(GameTypeIntent.SelectGame(gameTypeId))
        assertEquals(gameTypeId, handler.state.selectedGameId)
        
        handler.handle(GameTypeIntent.ArchiveGameType(gameTypeId))
        assertNull(handler.state.selectedGameId)
    }
}

