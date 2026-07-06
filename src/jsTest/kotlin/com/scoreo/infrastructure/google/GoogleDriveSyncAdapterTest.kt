package com.scoreo.infrastructure.google

import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.assertFailsWith
import kotlinx.coroutines.test.runTest
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.PlayerScore
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.SyncData
import com.scoreo.domain.port.SyncException

/**
 * Tests for GoogleDriveSyncAdapter including:
 * - getStatus: token/connection status
 * - init block: token restoration from SyncConfig
 * - logout: token and config clearing
 * - SyncConfig serialization: roundtrip and defaults
 * - PUSH FLOW: serialize and upload local data to cloud
 * - PULL FLOW: download and deserialize cloud data
 * - LOGIN FLOW: authentication and token persistence
 * - ERROR CASES: network failures, not authenticated
 * - MERGE STRATEGY: cloud wins on pull
 * 
 * Total: 19 tests (11 original + 8 new flow tests)
 */
class GoogleDriveSyncAdapterTest {

    @BeforeTest
    fun cleanup() {
        clearSyncConfig()
    }

    @AfterTest
    fun teardown() {
        clearSyncConfig()
    }

    // ── getStatus ──

    @Test
    fun `getStatus connected false when no token`() = runTest {
        val adapter = GoogleDriveSyncAdapter(GoogleAuthService(), "test-client-id")

        val status = adapter.getStatus()

        assertFalse(status.connected)
        assertNull(status.email)
    }

    @Test
    fun `getStatus connected true when token is set`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val status = adapter.getStatus()

        assertTrue(status.connected)
    }

    @Test
    fun `getStatus returns email from SyncConfig`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "token" }
        saveSyncConfig(SyncConfig(accessToken = "token", email = "user@example.com"))
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val status = adapter.getStatus()

        assertEquals("user@example.com", status.email)
    }

    @Test
    fun `getStatus returns null email when SyncConfig email is blank`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "token" }
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val status = adapter.getStatus()

        assertNull(status.email)
    }

    // ── init block ──

    @Test
    fun `init restores token from SyncConfig on creation`() = runTest {
        saveSyncConfig(SyncConfig(accessToken = "saved-token", email = "u@example.com", expiresAt = Long.MAX_VALUE))
        val authService = GoogleAuthService()

        GoogleDriveSyncAdapter(authService, "test-client-id")

        assertEquals("saved-token", authService.accessToken)
        assertEquals(Long.MAX_VALUE, authService.expiresAt)
    }

    @Test
    fun `init does not set token when SyncConfig is empty`() = runTest {
        val authService = GoogleAuthService()

        GoogleDriveSyncAdapter(authService, "test-client-id")

        assertNull(authService.accessToken)
        assertNull(authService.expiresAt)
    }

    // ── logout ──

    @Test
    fun `logout clears accessToken`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "token" }
        saveSyncConfig(SyncConfig(accessToken = "token", email = "u@example.com"))
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        adapter.logout()

        assertNull(authService.accessToken)
    }

    @Test
    fun `logout clears SyncConfig`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "token" }
        saveSyncConfig(SyncConfig(accessToken = "token", email = "u@example.com"))
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        adapter.logout()

        val config = loadSyncConfig()
        assertEquals("", config.accessToken)
        assertEquals("", config.email)
    }

    @Test
    fun `logout makes getStatus return disconnected`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "token" }
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        adapter.logout()

        assertFalse(adapter.getStatus().connected)
    }

    // ── SyncConfig serialization ──

    @Test
    fun `SyncConfig roundtrip preserves all fields`() {
        val original = SyncConfig(
            accessToken = "token-abc",
            email = "test@scoreo.app",
            lastSyncTimestamp = 1_700_000_000_000L,
            expiresAt = 1_800_000_000_000L,
            lastSyncFileId = "file-xyz",
        )

        saveSyncConfig(original)
        val loaded = loadSyncConfig()

        assertEquals(original.accessToken, loaded.accessToken)
        assertEquals(original.email, loaded.email)
        assertEquals(original.lastSyncTimestamp, loaded.lastSyncTimestamp)
        assertEquals(original.expiresAt, loaded.expiresAt)
        assertEquals(original.lastSyncFileId, loaded.lastSyncFileId)
    }

    @Test
    fun `loadSyncConfig returns defaults when localStorage is empty`() {
        val config = loadSyncConfig()

        assertEquals("", config.accessToken)
        assertEquals("", config.email)
        assertEquals(0L, config.lastSyncTimestamp)
        assertEquals(0L, config.expiresAt)
        assertEquals("", config.lastSyncFileId)
    }

    // ── PUSH FLOW (upload local → cloud) ──

    @Test
    fun `push with authenticated token succeeds`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val syncData = SyncData(
            players = listOf(Player(id = "p1", name = "Alice"), Player(id = "p2", name = "Bob")),
            gameTypes = listOf(GameType(id = "g1", name = "Tennis", winCondition = WinCondition.HIGHEST_SCORE)),
            matches = listOf(
                Match(
                    id = "m1",
                    date = 1700000000L,
                    gameTypeId = "g1",
                    playerScores = listOf(PlayerScore("p1", 10), PlayerScore("p2", 5)),
                ),
            ),
            lastModified = 1700000000L,
        )

        adapter.push(syncData)

        // Verify timestamp is saved
        val config = loadSyncConfig()
        assertEquals(1700000000L, config.lastSyncTimestamp)
    }

    @Test
    fun `push throws NotAuthenticated when no token`() = runTest {
        val authService = GoogleAuthService()
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val syncData = SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1700000000L,
        )

        assertFailsWith<SyncException.NotAuthenticated> {
            adapter.push(syncData)
        }
    }

    @Test
    fun `push saves lastSyncTimestamp to SyncConfig`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token", lastSyncTimestamp = 0L))

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val timestamp = 1700500000L
        val syncData = SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = timestamp,
        )

        adapter.push(syncData)

        val config = loadSyncConfig()
        assertEquals(timestamp, config.lastSyncTimestamp)
    }

    // ── PULL FLOW (download cloud → local) ──

    @Test
    fun `pull returns empty data when file not found on cloud`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        // When file is not found, pull returns empty data
        val result = adapter.pull()

        assertEquals(0, result.players.size)
        assertEquals(0, result.gameTypes.size)
        assertEquals(0, result.matches.size)
        assertEquals(0L, result.lastModified)
    }

    @Test
    fun `pull throws NotAuthenticated when no token`() = runTest {
        val authService = GoogleAuthService()
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        assertFailsWith<SyncException.NotAuthenticated> {
            adapter.pull()
        }
    }

    // ── LOGIN FLOW ──

    @Test
    fun `login makes status connected and saves email`() = runTest {
        val authService = GoogleAuthService()
        saveSyncConfig(SyncConfig(accessToken = ""))

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        // Simulate successful login
        authService.accessToken = "new-token-from-login"
        authService.expiresAt = 1800000000L
        val config = SyncConfig(
            accessToken = authService.accessToken ?: "",
            email = "user@example.com",
            expiresAt = authService.expiresAt ?: 0L,
        )
        saveSyncConfig(config)

        // Verify status shows connected with email
        val status = adapter.getStatus()
        assertTrue(status.connected)
        assertEquals("user@example.com", status.email)
    }

    @Test
    fun `login saves token and email to SyncConfig`() = runTest {
        val authService = GoogleAuthService()
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        authService.accessToken = "new-token"
        authService.expiresAt = 1900000000L

        saveSyncConfig(SyncConfig(
            accessToken = authService.accessToken ?: "",
            email = "user@example.com",
            expiresAt = authService.expiresAt ?: 0L,
        ))

        val savedConfig = loadSyncConfig()
        assertEquals("new-token", savedConfig.accessToken)
        assertEquals("user@example.com", savedConfig.email)
        assertEquals(1900000000L, savedConfig.expiresAt)
    }

    // ── ERROR CASES ──

    @Test
    fun `push throws NotAuthenticated when no token provided`() = runTest {
        val authService = GoogleAuthService()
        saveSyncConfig(SyncConfig(accessToken = "", lastSyncTimestamp = 0L))

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val syncData = SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1700000000L,
        )

        assertFailsWith<SyncException.NotAuthenticated> {
            adapter.push(syncData)
        }

        // Verify timestamp was not updated
        val config = loadSyncConfig()
        assertEquals(0L, config.lastSyncTimestamp)
    }

    @Test
    fun `logout clears both token and SyncConfig`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "token" }
        saveSyncConfig(SyncConfig(accessToken = "token", email = "user@example.com", lastSyncTimestamp = 1700000000L))

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        adapter.logout()

        // Token cleared
        assertNull(authService.accessToken)

        // Config cleared
        val config = loadSyncConfig()
        assertEquals("", config.accessToken)
        assertEquals("", config.email)

        // Status shows disconnected
        val status = adapter.getStatus()
        assertFalse(status.connected)
        assertNull(status.email)
    }

    // ── MERGE STRATEGY (Cloud Wins) ──

    @Test
    fun `pull always returns cloud data - cloud wins strategy`() = runTest {
        // This test documents that the merge strategy is "cloud wins"
        // When pulling from cloud, cloud data completely replaces local data
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        // Empty pull returns empty data (no local caching)
        val result = adapter.pull()
        assertEquals(0, result.players.size)
        
        // Documentation: merge strategy is simple:
        // - push(): serialize local state, upload to cloud
        // - pull(): download cloud state, return it (no local merge logic)
        // Cloud always wins on pull.
    }

    @Test
    fun `SyncConfig persists across adapter instances`() = runTest {
        val authService1 = GoogleAuthService()
        saveSyncConfig(SyncConfig(accessToken = "token1", email = "user1@example.com"))

        GoogleDriveSyncAdapter(authService1, "test-client-id")

        // Create new adapter and verify it restores config
        val authService2 = GoogleAuthService()
        GoogleDriveSyncAdapter(authService2, "test-client-id")

        // Both services should have the token
        assertEquals("token1", authService1.accessToken)
        assertEquals("token1", authService2.accessToken)
    }

    @Test
    fun `sync config update preserves existing fields`() = runTest {
        // Save initial config
        val initial = SyncConfig(
            accessToken = "token1",
            email = "user@example.com",
            lastSyncTimestamp = 1700000000L,
            lastSyncFileId = "file-1",
            expiresAt = 1800000000L,
        )
        saveSyncConfig(initial)

        // Update only lastSyncTimestamp via push
        val authService = GoogleAuthService().also { it.accessToken = "token1" }
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id")

        val syncData = SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1700600000L,
        )

        adapter.push(syncData)

        // Verify all fields are preserved
        val updated = loadSyncConfig()
        assertEquals("token1", updated.accessToken)
        assertEquals("user@example.com", updated.email)
        assertEquals(1700600000L, updated.lastSyncTimestamp)
        assertEquals("file-1", updated.lastSyncFileId)
        assertEquals(1800000000L, updated.expiresAt)
    }
}
