package com.scoreo.ui.sync

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.scoreo.application.SyncUseCase
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

class SyncHandler(
    private val syncUseCase: SyncUseCase,
    private val scope: CoroutineScope,
) {
    var state by mutableStateOf(SyncState())
        private set

    fun handle(intent: SyncIntent) {
        when (intent) {
            is SyncIntent.RestoreSession -> {
                scope.launch {
                    try {
                        val status = syncUseCase.status()
                        if (status.connected) {
                            state = state.copy(phase = SyncPhase.Detecting, email = status.email)
                            runAutoSync()
                        }
                    } catch (_: Exception) {
                        // Token invalide ou absent — rester déconnecté
                    }
                }
            }
            is SyncIntent.Login -> {
                state = state.copy(phase = SyncPhase.Connecting, error = null)
                scope.launch {
                    try {
                        syncUseCase.login()
                        val status = syncUseCase.status()
                        state = state.copy(phase = SyncPhase.Detecting, email = status.email)
                        runAutoSync()
                    } catch (e: Exception) {
                        state = state.copy(phase = SyncPhase.Disconnected, error = e.message ?: "Login failed")
                    }
                }
            }
            is SyncIntent.Logout -> {
                scope.launch {
                    syncUseCase.logout()
                    state = SyncState()
                }
            }
            is SyncIntent.ResolveConflict -> {
                state = state.copy(phase = SyncPhase.Syncing)
                scope.launch {
                    try {
                        val result = syncUseCase.resolveConflict(intent.keepLocal)
                        state = state.copy(phase = SyncPhase.Resolved, result = result, conflict = null)
                    } catch (e: Exception) {
                        state = state.copy(phase = SyncPhase.Conflict, error = e.message ?: "Sync failed")
                    }
                }
            }
            is SyncIntent.DismissError -> {
                state = state.copy(error = null)
            }
        }
    }

    private suspend fun runAutoSync() {
        try {
            when (val outcome = syncUseCase.autoSync()) {
                is com.scoreo.application.SyncOutcome.Synced -> {
                    state = state.copy(phase = SyncPhase.Resolved, result = outcome.result)
                }
                is com.scoreo.application.SyncOutcome.Conflict -> {
                    state = state.copy(phase = SyncPhase.Conflict, conflict = outcome.conflict)
                }
            }
        } catch (e: Exception) {
            state = state.copy(phase = SyncPhase.Disconnected, error = e.message ?: "Sync failed")
        }
    }
}
