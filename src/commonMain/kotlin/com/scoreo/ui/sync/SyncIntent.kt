package com.scoreo.ui.sync

sealed class SyncIntent {
    data object Login : SyncIntent()
    data object Logout : SyncIntent()
    data class ResolveConflict(val keepLocal: Boolean) : SyncIntent()
    data object DismissError : SyncIntent()
}
