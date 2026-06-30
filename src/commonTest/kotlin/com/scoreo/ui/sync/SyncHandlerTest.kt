package com.scoreo.ui.sync

import com.scoreo.application.SyncUseCase
import com.scoreo.domain.model.Player
import com.scoreo.domain.port.SyncData
import com.scoreo.infrastructure.InMemoryCloudSyncRepository
import com.scoreo.infrastructure.InMemoryGameTypeRepository
import com.scoreo.infrastructure.InMemoryMatchRepository
import com.scoreo.infrastructure.InMemoryPlayerRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

@OptIn(ExperimentalCoroutinesApi::class)
class SyncHandlerTest {

    private fun buildHandler(
        cloudRepo: InMemoryCloudSyncRepository = InMemoryCloudSyncRepository(),
        playerRepo: InMemoryPlayerRepository = InMemoryPlayerRepository(),
        gameTypeRepo: InMemoryGameTypeRepository = InMemoryGameTypeRepository(),
        matchRepo: InMemoryMatchRepository = InMemoryMatchRepository(),
        scope: CoroutineScope = CoroutineScope(Dispatchers.Default),
    ) = SyncHandler(
        SyncUseCase(cloudRepo, playerRepo, gameTypeRepo, matchRepo),
        scope,
    )

    @Test
    fun `initial state is Disconnected with no error`() {
        val handler = buildHandler()

        assertEquals(SyncPhase.Disconnected, handler.state.phase)
        assertNull(handler.state.email)
        assertNull(handler.state.conflict)
        assertNull(handler.state.result)
        assertNull(handler.state.error)
    }

    @Test
    fun `Login with empty data results in Resolved`() = runTest {
        val handler = buildHandler(scope = this)

        handler.handle(SyncIntent.Login)
        advanceUntilIdle()

        assertEquals(SyncPhase.Resolved, handler.state.phase)
        assertEquals("test@example.com", handler.state.email)
        assertNotNull(handler.state.result)
        assertNull(handler.state.error)
        assertNull(handler.state.conflict)
    }

    @Test
    fun `Login with conflict shows Conflict phase`() = runTest {
        val cloudRepo = InMemoryCloudSyncRepository()
        val playerRepo = InMemoryPlayerRepository()

        // Local has Alice
        playerRepo.save(Player("p1", "Alice"))

        // Remote has Bob
        cloudRepo.storedData = SyncData(
            players = listOf(Player("p2", "Bob")),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1000L,
        )

        val handler = buildHandler(cloudRepo = cloudRepo, playerRepo = playerRepo, scope = this)

        handler.handle(SyncIntent.Login)
        advanceUntilIdle()

        assertEquals(SyncPhase.Conflict, handler.state.phase)
        assertEquals("test@example.com", handler.state.email)
        assertNotNull(handler.state.conflict)
        assertNull(handler.state.error)

        // local snapshot should have 1 player (Alice)
        assertEquals(1, handler.state.conflict?.localSnapshot?.playerCount)
        assertEquals(0, handler.state.conflict?.localSnapshot?.matchCount)
        assertEquals(0, handler.state.conflict?.localSnapshot?.gameTypeCount)

        // remote snapshot should have 1 player (Bob)
        assertEquals(1, handler.state.conflict?.remoteSnapshot?.playerCount)
        assertEquals(0, handler.state.conflict?.remoteSnapshot?.matchCount)
        assertEquals(0, handler.state.conflict?.remoteSnapshot?.gameTypeCount)
    }

    @Test
    fun `Logout resets state to Disconnected with null fields`() = runTest {
        val handler = buildHandler(scope = this)

        // Login first to get into a non-disconnected state
        handler.handle(SyncIntent.Login)
        advanceUntilIdle()
        assertEquals(SyncPhase.Resolved, handler.state.phase)

        // Now logout
        handler.handle(SyncIntent.Logout)
        advanceUntilIdle()

        assertEquals(SyncPhase.Disconnected, handler.state.phase)
        assertNull(handler.state.email)
        assertNull(handler.state.conflict)
        assertNull(handler.state.result)
        assertNull(handler.state.error)
    }

    @Test
    fun `ResolveConflict keepLocal transitions to Resolved with no conflict`() = runTest {
        val cloudRepo = InMemoryCloudSyncRepository()
        val playerRepo = InMemoryPlayerRepository()

        // Local has Alice
        playerRepo.save(Player("p1", "Alice"))

        // Remote has Bob — triggers conflict during autoSync
        cloudRepo.storedData = SyncData(
            players = listOf(Player("p2", "Bob")),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1000L,
        )

        val handler = buildHandler(cloudRepo = cloudRepo, playerRepo = playerRepo, scope = this)

        // Login triggers autoSync which detects conflict
        handler.handle(SyncIntent.Login)
        advanceUntilIdle()
        assertEquals(SyncPhase.Conflict, handler.state.phase)

        // Resolve keeping local data
        handler.handle(SyncIntent.ResolveConflict(keepLocal = true))
        advanceUntilIdle()

        assertEquals(SyncPhase.Resolved, handler.state.phase)
        assertNull(handler.state.conflict)
        assertNotNull(handler.state.result)
        assertNull(handler.state.error)
        assertTrue(handler.state.result!!.pushed > 0)
    }

    @Test
    fun `ResolveConflict keepRemote transitions to Resolved with no conflict`() = runTest {
        val cloudRepo = InMemoryCloudSyncRepository()
        val playerRepo = InMemoryPlayerRepository()

        // Local has Alice
        playerRepo.save(Player("p1", "Alice"))

        // Remote has Bob — triggers conflict during autoSync
        cloudRepo.storedData = SyncData(
            players = listOf(Player("p2", "Bob")),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1000L,
        )

        val handler = buildHandler(cloudRepo = cloudRepo, playerRepo = playerRepo, scope = this)

        // Login triggers autoSync which detects conflict
        handler.handle(SyncIntent.Login)
        advanceUntilIdle()
        assertEquals(SyncPhase.Conflict, handler.state.phase)

        // Resolve keeping remote data
        handler.handle(SyncIntent.ResolveConflict(keepLocal = false))
        advanceUntilIdle()

        assertEquals(SyncPhase.Resolved, handler.state.phase)
        assertNull(handler.state.conflict)
        assertNotNull(handler.state.result)
        assertNull(handler.state.error)
        assertTrue(handler.state.result!!.pulled > 0)
    }

    @Test
    fun `DismissError clears error field from state`() = runTest {
        val cloudRepo = InMemoryCloudSyncRepository()

        // Make autoSync fail (pull throws) so error gets set
        cloudRepo.failNext = { Exception("Network timeout") }

        val handler = buildHandler(cloudRepo = cloudRepo, scope = this)

        handler.handle(SyncIntent.Login)
        advanceUntilIdle()

        // Login succeeded, but autoSync failed -> error set
        assertEquals(SyncPhase.Disconnected, handler.state.phase)
        assertEquals("Network timeout", handler.state.error)

        // Dismiss the error
        handler.handle(SyncIntent.DismissError)

        assertNull(handler.state.error)
        // Other fields remain unchanged
        assertEquals(SyncPhase.Disconnected, handler.state.phase)
        assertEquals("test@example.com", handler.state.email)
    }

    @Test
    fun `RestoreSession does nothing when not connected`() = runTest {
        val handler = buildHandler(scope = this)

        handler.handle(SyncIntent.RestoreSession)
        advanceUntilIdle()

        assertEquals(SyncPhase.Disconnected, handler.state.phase)
        assertNull(handler.state.email)
        assertNull(handler.state.error)
    }

    @Test
    fun `RestoreSession runs autoSync when already connected`() = runTest {
        val cloudRepo = InMemoryCloudSyncRepository().apply {
            connected = true
            email = "restored@example.com"
        }
        val handler = buildHandler(cloudRepo = cloudRepo, scope = this)

        handler.handle(SyncIntent.RestoreSession)
        advanceUntilIdle()

        assertEquals(SyncPhase.Resolved, handler.state.phase)
        assertEquals("restored@example.com", handler.state.email)
        assertNotNull(handler.state.result)
        assertNull(handler.state.error)
    }

    @Test
    fun `Logout after login returns to Disconnected phase`() = runTest {
        val cloudRepo = InMemoryCloudSyncRepository()
        val playerRepo = InMemoryPlayerRepository()

        // Get into a conflict state first
        playerRepo.save(Player("p1", "Alice"))
        cloudRepo.storedData = SyncData(
            players = listOf(Player("p2", "Bob")),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1000L,
        )

        val handler = buildHandler(cloudRepo = cloudRepo, playerRepo = playerRepo, scope = this)

        handler.handle(SyncIntent.Login)
        advanceUntilIdle()
        assertEquals(SyncPhase.Conflict, handler.state.phase)

        // Logout resets completely
        handler.handle(SyncIntent.Logout)
        advanceUntilIdle()

        assertEquals(SyncPhase.Disconnected, handler.state.phase)
        assertNull(handler.state.email)
        assertNull(handler.state.conflict)
        assertNull(handler.state.result)
        assertNull(handler.state.error)
    }
}
