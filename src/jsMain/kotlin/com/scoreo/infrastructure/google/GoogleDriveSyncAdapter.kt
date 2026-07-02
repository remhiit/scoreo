package com.scoreo.infrastructure.google

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player
import com.scoreo.domain.port.CloudSyncRepository
import com.scoreo.domain.port.SyncData
import com.scoreo.domain.port.SyncException
import com.scoreo.domain.port.SyncStatus
import com.scoreo.infrastructure.scoreoJson
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.decodeFromString
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

private const val FILE_NAME = "scoreo-data.json"
private const val FILE_VERSION = 1
private const val SCOPE = "openid email https://www.googleapis.com/auth/drive.appdata"

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
    driveClient: GoogleDriveClient? = null,
) : CloudSyncRepository {

    private val driveClient: GoogleDriveClient = driveClient ?: GoogleDriveClient { authService.accessToken }

    init {
        val config = loadSyncConfig()
        if (config.accessToken.isNotBlank()) {
            authService.accessToken = config.accessToken
            authService.expiresAt = config.expiresAt.takeIf { it > 0L }
        }
    }

    override suspend fun push(data: SyncData) {
        ensureAuthenticated()
        refreshTokenIfNeeded()
        val json = serializeSyncData(data)
        val result = driveClient.upsertFile(FILE_NAME, json)
        result.getOrThrow()
        saveSyncConfig(loadSyncConfig().copy(lastSyncTimestamp = data.lastModified))
    }

    override suspend fun pull(): SyncData {
        ensureAuthenticated()
        refreshTokenIfNeeded()
        val fileIdResult = driveClient.findFile(FILE_NAME)
        val fileId = fileIdResult.getOrThrow() ?: return SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 0L,
        )
        val content = driveClient.readFile(fileId).getOrThrow()
        saveSyncConfig(loadSyncConfig().copy(lastSyncFileId = fileId))
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
        return suspendCancellableCoroutine { cont ->
            authService.login(clientId, SCOPE) { result ->
                result.fold(
                    onSuccess = { token ->
                        val email = authService.idToken?.let { decodeJwtEmail(it) } ?: ""
                        saveSyncConfig(
                            loadSyncConfig().copy(
                                accessToken = token,
                                email = email,
                                expiresAt = authService.expiresAt ?: 0L,
                            )
                        )
                        cont.resume(Unit)
                    },
                    onFailure = { cont.resumeWithException(it) },
                )
            }
        }
    }

    override suspend fun logout() {
        authService.logout()
        clearSyncConfig()
    }

    // ── Private ──

    private fun ensureAuthenticated() {
        if (authService.accessToken == null) throw SyncException.NotAuthenticated()
    }

    private suspend fun refreshTokenIfNeeded() {
        val expiresAt = authService.expiresAt ?: return
        if (currentTimeMillis() < expiresAt - 60_000L) return
        try {
            refreshTokenSilently()
        } catch (e: Exception) {
            authService.accessToken = null
            authService.expiresAt = null
            clearSyncConfig()
            throw SyncException.NotAuthenticated()
        }
    }

    private suspend fun refreshTokenSilently() {
        return suspendCancellableCoroutine { cont ->
            authService.refreshToken(clientId, SCOPE) { result ->
                result.fold(
                    onSuccess = { token ->
                        saveSyncConfig(
                            loadSyncConfig().copy(
                                accessToken = token,
                                expiresAt = authService.expiresAt ?: 0L,
                            )
                        )
                        cont.resume(Unit)
                    },
                    onFailure = { cont.resumeWithException(it) },
                )
            }
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

private fun decodeJwtEmail(idToken: String): String? = try {
    @Suppress("UNCHECKED_CAST")
    val email = js("""(function(t) {
        try {
            var b = t.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
            return JSON.parse(atob(b)).email || null;
        } catch(e) { return null; }
    })""")(idToken) as? String
    email
} catch (e: Exception) {
    null
}
