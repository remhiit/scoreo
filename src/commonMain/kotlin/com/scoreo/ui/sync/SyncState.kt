package com.scoreo.ui.sync

import com.scoreo.application.SyncConflict
import com.scoreo.application.SyncResult

enum class SyncPhase {
    Disconnected,
    Connecting,
    Detecting,
    Syncing,
    Resolved,
    Conflict,
}

data class SyncState(
    val phase: SyncPhase = SyncPhase.Disconnected,
    val email: String? = null,
    val conflict: SyncConflict? = null,
    val result: SyncResult? = null,
    val error: String? = null,
)
