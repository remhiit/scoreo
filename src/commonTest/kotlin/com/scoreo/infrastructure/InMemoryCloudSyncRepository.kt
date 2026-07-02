package com.scoreo.infrastructure

import com.scoreo.domain.port.CloudSyncRepository
import com.scoreo.domain.port.SyncData
import com.scoreo.domain.port.SyncException
import com.scoreo.domain.port.SyncStatus

class InMemoryCloudSyncRepository : CloudSyncRepository {
    var storedData: SyncData? = null
    var connected: Boolean = false
    var email: String? = null
    private var _lastSync: Long? = null
    private var _isOnline: Boolean = true
    var failNext: (() -> Exception)? = null

    fun setOnline(online: Boolean) { _isOnline = online }
    fun setLastSync(ts: Long) { _lastSync = ts }

    override suspend fun push(data: SyncData) {
        failNext?.invoke()?.let { throw it }
        if (!connected) throw SyncException.NotAuthenticated()
        storedData = data
        _lastSync = data.lastModified
    }

    override suspend fun pull(): SyncData {
        failNext?.invoke()?.let { throw it }
        if (!connected) throw SyncException.NotAuthenticated()
        return storedData ?: SyncData(
            players = emptyList(),
            gameTypes = emptyList(),
            matches = emptyList(),
            lastModified = 0L,
        )
    }

    override suspend fun getStatus(): SyncStatus = SyncStatus(
        connected = connected,
        lastSync = _lastSync,
        email = email,
        isOnline = _isOnline,
    )

    override suspend fun login() {
        connected = true
        email = "test@example.com"
    }

    override suspend fun logout() {
        connected = false
        email = null
    }
}
