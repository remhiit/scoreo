package com.scoreo.ui.sync

import androidx.compose.runtime.Composable
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

private fun isOnline(): Boolean =
    js("navigator.onLine") as? Boolean ?: true

@Composable
fun SyncScreen(handler: SyncHandler) {
    val s = handler.state

    if (!isOnline()) {
        Div(attrs = { classes("error-msg") }) {
            Span { Text("📡 Offline — changes will sync when reconnected") }
        }
    }

    when (s.phase) {
        SyncPhase.Disconnected -> disconnectedView(handler)
        SyncPhase.Connecting -> loadingView("Connecting to Google...")
        SyncPhase.Detecting -> loadingView("Checking sync status...")
        SyncPhase.Syncing -> loadingView("Synchronising data...")
        SyncPhase.Resolved -> resolvedView(handler, s)
        SyncPhase.Conflict -> conflictView(handler, s)
    }

    s.error?.let { error ->
        Div(attrs = { classes("error-msg") }) { Text(error) }
        Button(attrs = {
            classes("btn", "btn-secondary")
            onClick { handler.handle(SyncIntent.DismissError) }
        }) { Text("Dismiss") }
    }
}

@Composable
private fun disconnectedView(handler: SyncHandler) {
    Div(attrs = { classes("empty") }) {
        Span(attrs = { classes("import-zone-icon") }) { Text("☁") }
        Div(attrs = { classes("section-label") }) { Text("Cloud Sync") }
        Div(attrs = { classes("empty") }) { Text("Sync your data with Google Drive") }
        Button(attrs = {
            classes("btn", "btn-primary")
            onClick { handler.handle(SyncIntent.Login) }
        }) { Text("Connect with Google") }
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
        Span(attrs = { classes("import-zone-icon") }) { Text("✅") }
        Div(attrs = { classes("section-label") }) { Text("Sync complete") }
        s.result?.let { r ->
            Div { Text("${r.pushed} pushed, ${r.pulled} pulled") }
        }
        s.email?.let { email ->
            Div(attrs = { classes("card-sub") }) { Text("Connected as $email") }
        }
        Button(attrs = {
            classes("btn", "btn-secondary")
            onClick { handler.handle(SyncIntent.Logout) }
        }) { Text("Disconnect") }
    }
}

@Composable
private fun conflictView(handler: SyncHandler, s: SyncState) {
    val conflict = s.conflict
    if (conflict == null) {
        Div(attrs = { classes("empty") }) { Text("No conflict data available") }
        return
    }

    Div(attrs = { style { property("padding", "16px 0") } }) {
        Div(attrs = { classes("modal-title") }) { Text("Sync conflict") }
        Div(attrs = { classes("modal-body") }) {
            Text("Two versions of your data differ. Choose which one to keep.")
        }

        Div(attrs = { classes("modal-body") }) {
            Div(attrs = { classes("card") }) {
                Div(attrs = { style { property("display", "flex"); property("flex-direction", "column") } }) {
                    Span(attrs = { style { property("font-weight", "600") } }) {
                        Text("Local version${conflict.localSnapshot.dateLabel?.let { " (${it})" } ?: ""}")
                    }
                    Span { Text("• ${conflict.localSnapshot.playerCount} players") }
                    Span { Text("• ${conflict.localSnapshot.gameTypeCount} game types") }
                    Span { Text("• ${conflict.localSnapshot.matchCount} matches") }
                }
            }
            Div(attrs = { classes("card") }) {
                Div(attrs = { style { property("display", "flex"); property("flex-direction", "column") } }) {
                    Span(attrs = { style { property("font-weight", "600") } }) {
                        Text("Remote version${conflict.remoteSnapshot.dateLabel?.let { " (${it})" } ?: ""}")
                    }
                    Span { Text("• ${conflict.remoteSnapshot.playerCount} players") }
                    Span { Text("• ${conflict.remoteSnapshot.gameTypeCount} game types") }
                    Span { Text("• ${conflict.remoteSnapshot.matchCount} matches") }
                }
            }
        }

        Div(attrs = { style { property("display", "flex"); property("gap", "8px") } }) {
            Button(attrs = {
                classes("btn", "btn-primary")
                onClick { handler.handle(SyncIntent.ResolveConflict(true)) }
            }) { Text("Keep local") }
            Button(attrs = {
                classes("btn", "btn-secondary")
                onClick { handler.handle(SyncIntent.ResolveConflict(false)) }
            }) { Text("Keep remote") }
        }
    }
}
