package com.scoreo.infrastructure.google

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.port.CloudSyncRepository
import com.scoreo.domain.port.SyncData
import com.scoreo.domain.port.SyncException
import com.scoreo.domain.port.SyncStatus
import com.scoreo.infrastructure.scoreoJson
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString

private const val FILE_NAME = "scoreo-data.json"
private const val FILE_VERSION = 1

@Serializable
private data class SyncFile(
    val version: Int = FILE_VERSION,
    val lastModified: Long,
    val players: List<Player>,
    val gameTypes: List<GameType>,
    val matches: List<Match>,
)

class GoogleDriveSyncAdapter(
    private val authService: GoogleAuthService,
    private val clientId: String,
    private val scope: String = "https://www.googleapis.com/auth/drive.appdata",
) : CloudSyncRepository {

    private val driveClient by lazy { GoogleDriveClient { authService.accessToken } }

    override suspend fun push(data: SyncData) {
        ensureAuthenticated()
        ensureTokenFresh()
        val json = serializeSyncData(data)
        val result = driveClient.upsertFile(FILE_NAME, json)
        result.getOrThrow()
        val config = loadSyncConfig().copy(
            lastSyncTimestamp = data.lastModified,
        )
        saveSyncConfig(config)
    }

    override suspend fun pull(): SyncData {
        ensureAuthenticated()
        ensureTokenFresh()
        val fileIdResult = driveClient.findFile(FILE_NAME)
        val fileId = fileIdResult.getOrThrow() ?: return SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 0L,
        )
        val content = driveClient.readFile(fileId).getOrThrow()
        val config = loadSyncConfig().copy(lastSyncFileId = fileId)
        saveSyncConfig(config)
        return deserializeSyncData(content)
    }

    override suspend fun getStatus(): SyncStatus {
        val config = loadSyncConfig()
        return SyncStatus(
            connected = authService.accessToken != null,
            lastSync = config.lastSyncTimestamp.takeIf { it > 0L },
            email = config.email.takeIf { it.isNotBlank() },
            isOnline = js("navigator.onLine") as? Boolean ?: true,
        )
    }

    override suspend fun login() {
        throw SyncException.NotAuthenticated
    }

    override suspend fun logout() {
        authService.logout()
        clearSyncConfig()
    }

    // ── Private ──

    private fun ensureAuthenticated() {
        if (authService.accessToken == null) throw SyncException.NotAuthenticated
    }

    private fun ensureTokenFresh() {
        val expiresAt = authService.expiresAt ?: return
        if (currentTimeMillis() >= expiresAt - 60000) {
            authService.accessToken = null
            throw SyncException.NotAuthenticated
        }
    }

    private fun serializeSyncData(data: SyncData): String {
        val file = SyncFile(
            lastModified = data.lastModified,
            players = data.players,
            gameTypes = data.gameTypes,
            matches = data.matches,
        )
        return scoreoJson.encodeToString(file)
    }

    private fun deserializeSyncData(json: String): SyncData {
        val file = scoreoJson.decodeFromString<SyncFile>(json)
        return SyncData(
            players = file.players,
            gameTypes = file.gameTypes,
            matches = file.matches,
            lastModified = file.lastModified,
        )
    }
}

private fun currentTimeMillis(): Long =
    (js("Date.now()") as Double).toLong()
