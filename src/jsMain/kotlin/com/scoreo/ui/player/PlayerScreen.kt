package com.scoreo.ui.player

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.attributes.placeholder
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H1
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun PlayerScreen(handler: PlayerHandler, showTitle: Boolean = true) {
    val state = handler.state
    var anonymize by remember(state.deleteConfirmPlayerId) { mutableStateOf(false) }

    if (showTitle) H1 { Text("Players") }

    Div(attrs = { classes("form-row") }) {
        Input(type = InputType.Text, attrs = {
            classes("input")
            if (state.error != null) classes("error")
            placeholder("Player name")
            value(state.inputName)
            onInput { handler.handle(PlayerIntent.UpdateInput(it.value)) }
            onKeyUp { if (it.key == "Enter") handler.handle(PlayerIntent.AddPlayer) }
        })
        Button(attrs = {
            classes("btn", "btn-primary")
            onClick { handler.handle(PlayerIntent.AddPlayer) }
        }) { Text("Add") }
    }

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    if (state.players.isEmpty()) {
        Div(attrs = { classes("empty") }) { Text("No players yet. Add one above.") }
    } else {
        state.players.forEach { player ->
            val stats = state.stats[player.id]
            Div(attrs = { classes("card") }) {
                Div {
                    Div(attrs = { classes("card-title") }) { Text(player.name) }
                    if (stats != null) {
                        Div(attrs = { classes("stats") }) {
                            Span(attrs = { classes("stat-win") }) { Text("${stats.wins}W") }
                            Span(attrs = { classes("stat-loss") }) { Text("${stats.losses}L") }
                        }
                    }
                }
                Button(attrs = {
                    classes("btn-danger")
                    onClick { handler.handle(PlayerIntent.ShowDeleteConfirm(player.id)); anonymize = false }
                }) { Text("🗑") }
            }
        }
    }

    // ── Delete confirmation modal ──
    state.deleteConfirmPlayerId?.let { playerId ->
        val player = state.players.find { it.id == playerId }
        Div(attrs = {
            classes("modal-overlay")
            onClick { handler.handle(PlayerIntent.DismissDeleteConfirm) }
        }) {}
        Div(attrs = { classes("modal-content") }) {
            Div(attrs = { classes("modal-title") }) { Text("Supprimer ${player?.name ?: "?"} ?") }
            Div(attrs = { classes("modal-body") }) { Text("Les matchs seront conservés.") }
            Div(attrs = { classes("modal-row") }) {
                Input(type = InputType.Checkbox, attrs = {
                    checked(anonymize)
                    onClick { anonymize = !anonymize }
                })
                Span { Text("Effacer aussi le nom de l'historique") }
            }
            Div(attrs = { classes("modal-actions") }) {
                Button(attrs = {
                    classes("btn", "btn-secondary")
                    onClick { handler.handle(PlayerIntent.DismissDeleteConfirm) }
                }) { Text("Annuler") }
                Button(attrs = {
                    classes("btn", "btn-danger", "btn-danger-filled")
                    onClick { handler.handle(PlayerIntent.DeletePlayer(playerId, anonymize)) }
                }) { Text("Supprimer") }
            }
        }
    }
}
