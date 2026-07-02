package com.scoreo.domain.port

import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Match
import com.scoreo.domain.model.Player

data class SyncData(
    val players: List<Player>,
    val gameTypes: List<GameType>,
    val matches: List<Match>,
    val lastModified: Long,
)

data class SyncStatus(
    val connected: Boolean,
    val lastSync: Long? = null,
    val email: String? = null,
    val isOnline: Boolean = true,
)

sealed class SyncException : Exception() {
    data class NotAuthenticated(override val message: String = "Not authenticated") : SyncException()
    object NetworkError : SyncException()
    data class ApiError(val code: Int, override val message: String) : SyncException()
    data object Conflict : SyncException()
    object RateLimited : SyncException()
}

interface CloudSyncRepository {
    suspend fun push(data: SyncData)
    suspend fun pull(): SyncData
    suspend fun getStatus(): SyncStatus
    suspend fun login()
    suspend fun logout()
}
