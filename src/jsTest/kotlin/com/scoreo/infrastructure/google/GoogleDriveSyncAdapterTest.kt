package com.scoreo.infrastructure.google

import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest

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
}
