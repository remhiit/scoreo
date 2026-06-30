package com.scoreo.infrastructure.google

import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import com.scoreo.infrastructure.scoreoJson
import kotlinx.browser.localStorage

private const val KEY = "scoreo_sync_config"

@Serializable
data class SyncConfig(
    val accessToken: String = "",
    val email: String = "",
    val lastSyncTimestamp: Long = 0L,
    val lastSyncFileId: String = "",
    val expiresAt: Long = 0L,
)

fun loadSyncConfig(): SyncConfig {
    val raw = localStorage.getItem(KEY)
    if (raw.isNullOrBlank()) return SyncConfig()
    return runCatching { scoreoJson.decodeFromString<SyncConfig>(raw) }.getOrDefault(SyncConfig())
}

fun saveSyncConfig(config: SyncConfig) {
    localStorage.setItem(KEY, scoreoJson.encodeToString(config))
}

fun clearSyncConfig() {
    localStorage.removeItem(KEY)
}
