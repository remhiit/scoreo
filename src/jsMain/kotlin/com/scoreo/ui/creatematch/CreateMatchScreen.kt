package com.scoreo.ui.creatematch

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.scoreo.domain.model.WinCondition
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H1
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Label
import org.jetbrains.compose.web.dom.Option
import org.jetbrains.compose.web.dom.Select
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun CreateMatchScreen(handler: CreateMatchHandler, onSaved: () -> Unit) {
    val state = handler.state

    LaunchedEffect(state.saved) {
        if (state.saved) {
            handler.reset()
            onSaved()
        }
    }

    H1 { Text("New Match") }

    Div(attrs = { classes("section-label") }) { Text("Game type") }
    Select(attrs = {
        classes("select")
        onChange { event ->
            val gt = state.availableGameTypes.find { it.id == event.value }
            if (gt != null) handler.handle(CreateMatchIntent.SelectGameType(gt))
        }
    }) {
        Option(value = "", attrs = { if (state.selectedGameType == null) attr("selected", "") }) {
            Text("— Select a game —")
        }
        state.availableGameTypes.forEach { gt ->
            Option(value = gt.id, attrs = {
                if (gt.id == state.selectedGameType?.id) attr("selected", "")
            }) { Text(gt.name) }
        }
    }

    if (state.availablePlayers.isEmpty()) {
        Div(attrs = { classes("card-sub") }) { Text("Add players first.") }
    } else {
        Div(attrs = { classes("section-label") }) { Text("Players & scores") }
        Div(attrs = { classes("player-list-pick") }) {
            state.availablePlayers.forEach { player ->
                val isSelected = player in state.selectedPlayers
                val isManual = state.selectedGameType?.winCondition == WinCondition.MANUAL

                Div(attrs = {
                    classes("player-pick-row")
                    if (isSelected) classes("selected")
                    onClick { handler.handle(CreateMatchIntent.TogglePlayer(player)) }
                }) {
                    Input(type = InputType.Checkbox, attrs = {
                        checked(isSelected)
                        onClick { it.stopPropagation() }
                        onChange { handler.handle(CreateMatchIntent.TogglePlayer(player)) }
                    })
                    Span(attrs = { style { property("flex", "1") } }) { Text(player.name) }

                    if (isSelected) {
                        Input(type = InputType.Text, attrs = {
                            classes("score-input")
                            value(state.scores[player.id] ?: "")
                            attr("placeholder", "Score")
                            onInput { handler.handle(CreateMatchIntent.UpdateScore(player.id, it.value)) }
                            onClick { it.stopPropagation() }
                        })
                        if (isManual) {
                            Label(attrs = {
                                style {
                                    property("display", "flex")
                                    property("align-items", "center")
                                    property("gap", "4px")
                                    property("margin-left", "8px")
                                    property("cursor", "pointer")
                                }
                                onClick { it.stopPropagation() }
                            }) {
                                Input(type = InputType.Checkbox, attrs = {
                                    checked(player.id in state.manualWinners)
                                    onChange {
                                        handler.handle(
                                            CreateMatchIntent.UpdateManualWinner(player.id, it.value)
                                        )
                                    }
                                })
                                Span { Text("W") }
                            }
                        }
                    }
                }
            }
        }
    }

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    Button(attrs = {
        classes("btn", "btn-primary", "btn-full")
        onClick { handler.handle(CreateMatchIntent.SaveMatch) }
    }) { Text("Save match") }
}
