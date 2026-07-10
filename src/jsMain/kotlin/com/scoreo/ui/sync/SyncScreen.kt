package com.scoreo.ui.sync

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.scoreo.ui.Strings
import com.scoreo.ui.shared.ButtonVariant
import com.scoreo.ui.shared.LudoButton
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

private fun isOnline(): Boolean =
    js("navigator.onLine") as? Boolean ?: true

@Composable
fun SyncScreen(handler: SyncHandler) {
    LaunchedEffect(Unit) {
        handler.handle(SyncIntent.RestoreSession)
    }

    val s = handler.state

     if (!isOnline()) {
         Div(attrs = { classes("error-msg") }) {
             Span { Text(Strings.MSG_OFFLINE) }
         }
     }

    when (s.phase) {
         SyncPhase.Disconnected -> disconnectedView(handler)
         SyncPhase.Connecting -> loadingView(Strings.LABEL_CONNECTING_GOOGLE)
         SyncPhase.Detecting -> loadingView(Strings.LABEL_CHECKING_SYNC)
         SyncPhase.Syncing -> loadingView(Strings.LABEL_SYNCING_DATA)
         SyncPhase.Resolved -> resolvedView(handler, s)
         SyncPhase.Conflict -> conflictView(handler, s)
     }

    s.error?.let { error ->
        Div(attrs = { classes("error-msg") }) { Text(error) }
        LudoButton(
            text = Strings.BTN_DISMISS,
            variant = ButtonVariant.Secondary,
            onClick = { handler.handle(SyncIntent.DismissError) },
        )
    }
}

@Composable
private fun disconnectedView(handler: SyncHandler) {
    Div(attrs = { classes("empty") }) {
        Span(attrs = { classes("sync-icon") }) { Text("☁") }
        Div(attrs = { classes("section-label") }) { Text(Strings.LABEL_CLOUD_SYNC) }
        Div { Text(Strings.MSG_SYNC_DATA_GOOGLE) }
        LudoButton(
            text = Strings.BTN_CONNECT_GOOGLE,
            variant = ButtonVariant.Primary,
            onClick = { handler.handle(SyncIntent.Login) },
        )
    }
}

@Composable
private fun loadingView(message: String) {
    Div(attrs = { classes("empty") }) {
        Div(attrs = { classes("import-zone-icon") }) { Text("⏳") }
        Div { Text(message) }
    }
}

@Composable
private fun resolvedView(handler: SyncHandler, s: SyncState) {
    Div(attrs = { classes("empty") }) {
        Span(attrs = { classes("sync-icon") }) { Text("✅") }
        Div(attrs = { classes("section-label") }) { Text(Strings.LABEL_SYNC_COMPLETE) }
        s.result?.let { r ->
            Div { Text("${r.pushed} pushed, ${r.pulled} pulled") }
        }
        s.email?.let { email ->
            Div(attrs = { classes("sync-status") }) { Text("Connected as $email") }
        }
        LudoButton(
            text = Strings.BTN_DISCONNECT,
            variant = ButtonVariant.Secondary,
            onClick = { handler.handle(SyncIntent.Logout) },
        )
    }
}

@Composable
private fun conflictView(handler: SyncHandler, s: SyncState) {
     val conflict = s.conflict
     if (conflict == null) {
         Div(attrs = { classes("empty") }) { Text(Strings.MSG_NO_CONFLICT_DATA) }
         return
     }

    Div(attrs = { style { property("padding", "16px 0") } }) {
        Div(attrs = { classes("modal-title") }) { Text(Strings.LABEL_SYNC_CONFLICT) }
        Div(attrs = { classes("modal-body") }) { Text(Strings.MSG_CONFLICT_CHOICE) }

        Div(attrs = { classes("sync-conflict-container") }) {
            Div(attrs = { classes("sync-card") }) {
                Div(attrs = { classes("sync-card-title") }) {
                    Text("${Strings.LABEL_LOCAL_VERSION}${conflict.localSnapshot.dateLabel?.let { " ($it)" } ?: ""}")
                }
                Div(attrs = { classes("sync-card-stat") }) { Text("• ${conflict.localSnapshot.playerCount} players") }
                Div(attrs = { classes("sync-card-stat") }) { Text("• ${conflict.localSnapshot.gameTypeCount} game types") }
                Div(attrs = { classes("sync-card-stat") }) { Text("• ${conflict.localSnapshot.matchCount} matches") }
            }
            Div(attrs = { classes("sync-card") }) {
                Div(attrs = { classes("sync-card-title") }) {
                    Text("${Strings.LABEL_REMOTE_VERSION}${conflict.remoteSnapshot.dateLabel?.let { " ($it)" } ?: ""}")
                }
                Div(attrs = { classes("sync-card-stat") }) { Text("• ${conflict.remoteSnapshot.playerCount} players") }
                Div(attrs = { classes("sync-card-stat") }) { Text("• ${conflict.remoteSnapshot.gameTypeCount} game types") }
                Div(attrs = { classes("sync-card-stat") }) { Text("• ${conflict.remoteSnapshot.matchCount} matches") }
            }
        }

        Div(attrs = { classes("sync-actions") }) {
            LudoButton(
                text = Strings.BTN_KEEP_LOCAL,
                variant = ButtonVariant.Primary,
                onClick = { handler.handle(SyncIntent.ResolveConflict(true)) },
            )
            LudoButton(
                text = Strings.BTN_KEEP_REMOTE,
                variant = ButtonVariant.Secondary,
                onClick = { handler.handle(SyncIntent.ResolveConflict(false)) },
            )
        }
    }
}
