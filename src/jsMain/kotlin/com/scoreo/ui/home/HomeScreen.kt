package com.scoreo.ui.home

import androidx.compose.runtime.Composable
import com.scoreo.ui.player.PlayerHandler
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun HomeScreen(
    playerHandler: PlayerHandler,
    onNewMatch: () -> Unit,
    onConfigurePlayers: () -> Unit,
) {
    val state = playerHandler.state

    if (state.players.isEmpty()) {
        Div(attrs = { classes("home-empty") }) {
            Span(attrs = { classes("home-empty-icon") }) { Text("🎮") }
            Span(attrs = { classes("home-empty-text") }) { Text("No players yet.") }
            Button(attrs = {
                classes("btn", "btn-secondary")
                onClick { onConfigurePlayers() }
            }) { Text("⚙️ Configure players") }
        }
    } else {
        Div(attrs = { classes("home-player-list") }) {
            state.players.forEach { player ->
                val stats = state.stats[player.id]
                Div(attrs = { classes("home-player-card") }) {
                    Div(attrs = { classes("home-player-name") }) { Text(player.name) }
                    Div(attrs = { classes("stats") }) {
                        if (stats != null) {
                            Span(attrs = { classes("stat-win") }) { Text("${stats.wins}W") }
                            Span(attrs = { classes("stat-loss") }) { Text("${stats.losses}L") }
                            val total = stats.wins + stats.losses
                            if (total > 0) {
                                val ratio = (stats.wins * 100 / total)
                                Span(attrs = { classes("stat-ratio") }) { Text("$ratio%") }
                            }
                        } else {
                            Span(attrs = { classes("stat-none") }) { Text("No matches") }
                        }
                    }
                }
            }
        }
    }

    if (state.players.isNotEmpty()) {
        Button(attrs = {
            classes("fab")
            onClick { onNewMatch() }
        }) { Text("▶ New Match") }
    }
}
