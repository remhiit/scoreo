package com.scoreo.ui.player

import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import com.scoreo.application.AddPlayerUseCase
import com.scoreo.application.DeletePlayerUseCase
import com.scoreo.application.GetPlayerStatsUseCase
import com.scoreo.application.GetPlayersUseCase
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PlayerHandlerTest {

    private fun buildHandler(
        repo: InMemoryPlayerRepository = InMemoryPlayerRepository(),
        matchRepo: InMemoryMatchRepository = InMemoryMatchRepository(),
        gameTypeRepo: InMemoryGameTypeRepository = InMemoryGameTypeRepository(),
    ) = PlayerHandler(
        addPlayer = AddPlayerUseCase(repo),
        getPlayers = GetPlayersUseCase(repo),
        getPlayerStats = GetPlayerStatsUseCase(matchRepo, gameTypeRepo),
        deletePlayer = DeletePlayerUseCase(repo),
        renamePlayerUseCase = com.scoreo.application.RenamePlayerUseCase(repo),
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
        assertEquals("name: Player name must not be blank", handler.state.error)
    }

    @Test
    fun `AddPlayer with empty input sets error`() {
        val handler = buildHandler()

        handler.handle(PlayerIntent.AddPlayer)

        assertTrue(handler.state.players.isEmpty())
        assertEquals("name: Player name must not be blank", handler.state.error)
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

    @Test
    fun `ShowDeleteConfirm sets deleteConfirmPlayerId`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.ShowDeleteConfirm("p1"))

        assertEquals("p1", handler.state.deleteConfirmPlayerId)
    }

    @Test
    fun `DismissDeleteConfirm clears deleteConfirmPlayerId`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.ShowDeleteConfirm("p1"))
        handler.handle(PlayerIntent.DismissDeleteConfirm)

        assertNull(handler.state.deleteConfirmPlayerId)
    }

    @Test
    fun `DeletePlayer removes player from active list`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        repo.save(Player("p2", "Bob"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.ShowDeleteConfirm("p1"))
        handler.handle(PlayerIntent.DeletePlayer("p1"))

        assertEquals(1, handler.state.players.size)
        assertEquals("Bob", handler.state.players.first().name)
        assertNull(handler.state.deleteConfirmPlayerId)
    }

    @Test
    fun `DeletePlayer with anonymize blanks the name`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.DeletePlayer("p1", anonymize = true))

        assertTrue(handler.state.players.isEmpty())
        val all = repo.getAll(includeInactive = true)
        assertEquals(1, all.size)
        assertEquals("", all.first().name)
        assertEquals(false, all.first().active)
    }

    @Test
    fun `DeletePlayer without anonymize keeps the name`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.DeletePlayer("p1", anonymize = false))

        assertTrue(handler.state.players.isEmpty())
        val all = repo.getAll(includeInactive = true)
        assertEquals(1, all.size)
        assertEquals("Alice", all.first().name)
        assertEquals(false, all.first().active)
    }

    @Test
    fun `DeletePlayer keeps stats for remaining players`() {
        val repo = InMemoryPlayerRepository()
        val matchRepo = InMemoryMatchRepository()
        val gameTypeRepo = InMemoryGameTypeRepository()
        repo.save(Player("p1", "Alice"))
        repo.save(Player("p2", "Bob"))
        gameTypeRepo.save(GameType("gt1", "Test", WinCondition.HIGHEST_SCORE))
        matchRepo.save(Match("m1", 1000L, "gt1", listOf(PlayerScore("p1", 10), PlayerScore("p2", 5))))
        val handler = buildHandler(repo, matchRepo, gameTypeRepo)

        handler.handle(PlayerIntent.DeletePlayer("p1"))

        assertEquals(1, handler.state.players.size)
        assertEquals("Bob", handler.state.players.first().name)
        val bobStats = handler.state.stats["p2"]
        assertTrue(bobStats != null && bobStats.losses == 1)
    }

    @Test
    fun `StartRename populates renamingPlayerId and renameInput with current name`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.StartRename("p1"))

        assertEquals("p1", handler.state.renamingPlayerId)
        assertEquals("Alice", handler.state.renameInput)
    }

    @Test
    fun `StartRename with nonexistent player does not update state`() {
        val handler = buildHandler()

        handler.handle(PlayerIntent.StartRename("nonexistent"))

        assertNull(handler.state.renamingPlayerId)
        assertEquals("", handler.state.renameInput)
    }

    @Test
    fun `UpdateRenameInput updates renameInput field`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.StartRename("p1"))
        handler.handle(PlayerIntent.UpdateRenameInput("Alicia"))

        assertEquals("Alicia", handler.state.renameInput)
    }

    @Test
    fun `ConfirmRename calls use case and updates players list`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.StartRename("p1"))
        handler.handle(PlayerIntent.UpdateRenameInput("Alicia"))
        handler.handle(PlayerIntent.ConfirmRename)

        assertEquals("Alicia", handler.state.players.first().name)
    }

    @Test
    fun `ConfirmRename clears rename state after success`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.StartRename("p1"))
        handler.handle(PlayerIntent.UpdateRenameInput("Alicia"))
        handler.handle(PlayerIntent.ConfirmRename)

        assertNull(handler.state.renamingPlayerId)
        assertEquals("", handler.state.renameInput)
        assertNull(handler.state.error)
    }

    @Test
    fun `ConfirmRename with empty name sets error and does not save`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.StartRename("p1"))
        handler.handle(PlayerIntent.UpdateRenameInput("   "))
        handler.handle(PlayerIntent.ConfirmRename)

        assertEquals("name: Player name must not be blank", handler.state.error)
        assertEquals("Alice", handler.state.players.first().name)
        assertEquals("p1", handler.state.renamingPlayerId)
    }

    @Test
    fun `CancelRename discards changes and clears state`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.StartRename("p1"))
        handler.handle(PlayerIntent.UpdateRenameInput("Bob"))
        handler.handle(PlayerIntent.CancelRename)

        assertNull(handler.state.renamingPlayerId)
        assertEquals("", handler.state.renameInput)
        assertEquals("Alice", handler.state.players.first().name)
    }

    @Test
    fun `Rename preserves player ID (tied to stats)`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)
        val originalId = handler.state.players.first().id

        handler.handle(PlayerIntent.StartRename("p1"))
        handler.handle(PlayerIntent.UpdateRenameInput("Alicia"))
        handler.handle(PlayerIntent.ConfirmRename)

        assertEquals(originalId, handler.state.players.first().id)
    }

    @Test
    fun `ConfirmRename without prior StartRename is no-op`() {
        val repo = InMemoryPlayerRepository()
        repo.save(Player("p1", "Alice"))
        val handler = buildHandler(repo)

        handler.handle(PlayerIntent.ConfirmRename)

        assertEquals("Alice", handler.state.players.first().name)
        assertNull(handler.state.renamingPlayerId)
    }
}
