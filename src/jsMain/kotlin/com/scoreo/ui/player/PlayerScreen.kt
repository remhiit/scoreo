package com.scoreo.ui.player

import androidx.compose.runtime.Composable
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
                }
                if (stats != null) {
                    Div(attrs = { classes("stats") }) {
                        Span(attrs = { classes("stat-win") }) { Text("${stats.wins}W") }
                        Span(attrs = { classes("stat-loss") }) { Text("${stats.losses}L") }
                    }
                }
            }
        }
    }
}
