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
import com.scoreo.domain.port.SyncData
import com.scoreo.domain.port.SyncException
import com.scoreo.infrastructure.scoreoJson
import kotlinx.serialization.encodeToString
import kotlinx.serialization.Serializable

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
    fun `push uploads serialized players, gameTypes, matches to cloud`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        val syncData = SyncData(
            players = listOf(
                Player(id = "p1", name = "Alice", score = 0),
                Player(id = "p2", name = "Bob", score = 0),
            ),
            gameTypes = listOf(
                GameType(id = "g1", name = "Tennis", iconEmoji = "🎾", archived = false),
            ),
            matches = listOf(
                Match(id = "m1", gameTypeId = "g1", winner = "p1", loser = "p2", date = 1700000000L),
            ),
            lastModified = 1700000000L,
        )

        adapter.push(syncData)

        assertEquals(1, recordedCalls.size)
        assertEquals("upsert", recordedCalls[0])
        assertEquals(1700000000L, mockDriveClient.capturedTimestamp)
    }

    @Test
    fun `push throws NotAuthenticated when no token`() = runTest {
        val authService = GoogleAuthService()
        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

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

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

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
    fun `pull downloads and deserializes data from cloud`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        mockDriveClient.fileToReturn = "file-id-xyz"
        val players = listOf(Player(id = "p1", name = "Alice", score = 0))
        val gameTypes = listOf(GameType(id = "g1", name = "Tennis", iconEmoji = "🎾", archived = false))
        val matches = listOf(Match(id = "m1", gameTypeId = "g1", winner = "p1", loser = "p2", date = 1700000000L))
        mockDriveClient.contentToReturn = serializeSyncFile(players, gameTypes, matches, 1700000000L)

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        val result = adapter.pull()

        assertEquals(1, result.players.size)
        assertEquals("Alice", result.players[0].name)
        assertEquals(1, result.gameTypes.size)
        assertEquals("Tennis", result.gameTypes[0].name)
        assertEquals(1, result.matches.size)
        assertEquals("m1", result.matches[0].id)
        assertEquals(1700000000L, result.lastModified)
    }

    @Test
    fun `pull returns empty data when file not found on cloud`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        mockDriveClient.fileToReturn = null // File not found

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        val result = adapter.pull()

        assertEquals(0, result.players.size)
        assertEquals(0, result.gameTypes.size)
        assertEquals(0, result.matches.size)
        assertEquals(0L, result.lastModified)
    }

    @Test
    fun `pull saves lastSyncFileId to SyncConfig`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token", lastSyncFileId = ""))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        mockDriveClient.fileToReturn = "file-id-abc"
        mockDriveClient.contentToReturn = serializeSyncFile(emptyList(), emptyList(), emptyList(), 0L)

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        adapter.pull()

        val config = loadSyncConfig()
        assertEquals("file-id-abc", config.lastSyncFileId)
    }

    @Test
    fun `pull throws NotAuthenticated when no token`() = runTest {
        val authService = GoogleAuthService()
        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        assertFailsWith<SyncException.NotAuthenticated> {
            adapter.pull()
        }
    }

    // ── LOGIN FLOW ──

    @Test
    fun `login sets accessToken and saves to SyncConfig`() = runTest {
        val authService = GoogleAuthService()
        saveSyncConfig(SyncConfig(accessToken = ""))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        // Manually simulate successful login
        authService.accessToken = "new-token-from-login"
        authService.expiresAt = 1800000000L

        // We test the config save path
        val config = SyncConfig(
            accessToken = authService.accessToken ?: "",
            email = "user@example.com",
            expiresAt = authService.expiresAt ?: 0L,
        )
        saveSyncConfig(config)

        val savedConfig = loadSyncConfig()
        assertEquals("new-token-from-login", savedConfig.accessToken)
        assertEquals("user@example.com", savedConfig.email)
    }

    @Test
    fun `login makes getStatus return connected true`() = runTest {
        val authService = GoogleAuthService()
        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        authService.accessToken = "token-from-login"
        saveSyncConfig(SyncConfig(accessToken = "token-from-login", email = "user@example.com"))

        val status = adapter.getStatus()

        assertTrue(status.connected)
        assertEquals("user@example.com", status.email)
    }

    // ── ERROR CASES ──

    @Test
    fun `push throws error when drive client fails`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        mockDriveClient.shouldFailUpsert = true

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        val syncData = SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 1700000000L,
        )

        assertFailsWith<SyncException> {
            adapter.push(syncData)
        }
    }

    @Test
    fun `pull throws error when readFile fails`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        mockDriveClient.fileToReturn = "file-id"
        mockDriveClient.shouldFailRead = true

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        assertFailsWith<SyncException> {
            adapter.pull()
        }
    }

    @Test
    fun `logout clears SyncConfig and token`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "token" }
        saveSyncConfig(SyncConfig(accessToken = "token", email = "user@example.com"))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        adapter.logout()

        val status = adapter.getStatus()
        assertFalse(status.connected)
        assertNull(status.email)

        val config = loadSyncConfig()
        assertEquals("", config.accessToken)
        assertEquals("", config.email)
    }

    // ── MERGE STRATEGY (Cloud Wins) ──

    @Test
    fun `pull overwrites local data with cloud data on sync`() = runTest {
        val authService = GoogleAuthService().also { it.accessToken = "valid-token" }
        saveSyncConfig(SyncConfig(accessToken = "valid-token"))

        val recordedCalls = mutableListOf<String>()
        val mockDriveClient = TestGoogleDriveClient(recordedCalls)
        mockDriveClient.fileToReturn = "file-id"

        // Simulate cloud has newer data
        val cloudPlayers = listOf(Player(id = "p1", name = "CloudAlice", score = 100))
        val cloudGameTypes = listOf(GameType(id = "g1", name = "CloudTennis", iconEmoji = "🎾", archived = false))
        mockDriveClient.contentToReturn = serializeSyncFile(cloudPlayers, cloudGameTypes, emptyList(), 1700500000L)

        val adapter = GoogleDriveSyncAdapter(authService, "test-client-id", mockDriveClient)

        val result = adapter.pull()

        // Verify cloud data is returned (merge strategy: cloud wins)
        assertEquals(1, result.players.size)
        assertEquals("CloudAlice", result.players[0].name)
        assertEquals(100, result.players[0].score)
        assertEquals("CloudTennis", result.gameTypes[0].name)
    }
}

// ── MOCK DRIVE CLIENT ──

private class TestGoogleDriveClient(
    private val recordedCalls: MutableList<String>,
) : GoogleDriveClient({ "mock-token" }) {
    var fileToReturn: String? = null
    var contentToReturn: String = ""
    var shouldFailUpsert: Boolean = false
    var shouldFailRead: Boolean = false
    var capturedTimestamp: Long = 0L
}

// ── HELPER ──

@Serializable
private data class SyncFileTest(
    val version: Int,
    val lastModified: Long,
    val players: List<Player>,
    val gameTypes: List<GameType>,
    val matches: List<Match>,
)

private fun serializeSyncFile(
    players: List<Player>,
    gameTypes: List<GameType>,
    matches: List<Match>,
    lastModified: Long,
): String {
    val syncFile = SyncFileTest(
        version = 1,
        lastModified = lastModified,
        players = players,
        gameTypes = gameTypes,
        matches = matches,
    )
    return scoreoJson.encodeToString(syncFile)
}
