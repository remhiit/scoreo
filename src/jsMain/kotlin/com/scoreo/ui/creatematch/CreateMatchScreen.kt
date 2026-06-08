package com.scoreo.ui.creatematch

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.scoreo.domain.model.WinCondition
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
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

    // ── Game type section ──────────────────────────────────────
    SectionHeader("Game type") { handler.handle(CreateMatchIntent.ToggleAddGameForm) }

    if (state.showAddGameForm) {
        Div(attrs = { classes("inline-form") }) {
            Input(type = InputType.Text, attrs = {
                classes("input")
                if (state.inlineGameError != null) classes("error")
                attr("placeholder", "Game name")
                value(state.inlineGameName)
                onInput { handler.handle(CreateMatchIntent.UpdateInlineGameName(it.value)) }
                onKeyUp { if (it.key == "Enter") handler.handle(CreateMatchIntent.AddInlineGameType) }
            })
            Select(attrs = {
                classes("select")
                onChange { event ->
                    val wc = WinCondition.valueOf(event.value ?: WinCondition.HIGHEST_SCORE.name)
                    handler.handle(CreateMatchIntent.SelectInlineGameWinCondition(wc))
                }
            }) {
                WinCondition.entries.forEach { wc ->
                    Option(value = wc.name, attrs = {
                        if (wc == state.inlineGameWinCondition) attr("selected", "")
                    }) { Text(wc.label()) }
                }
            }
            state.inlineGameError?.let { Div(attrs = { classes("error-msg") }) { Text(it) } }
            Button(attrs = {
                classes("btn", "btn-primary", "btn-full")
                onClick { handler.handle(CreateMatchIntent.AddInlineGameType) }
            }) { Text("Add game") }
        }
    }

    if (state.availableGameTypes.isEmpty()) {
        Div(attrs = { classes("empty-inline") }) { Text("No games yet — tap ＋ to add one.") }
    } else {
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
    }

    // ── Players section ────────────────────────────────────────
    SectionHeader("Players & scores") { handler.handle(CreateMatchIntent.ToggleAddPlayerForm) }

    if (state.showAddPlayerForm) {
        Div(attrs = { classes("inline-form") }) {
            Div(attrs = { classes("form-row") }) {
                Input(type = InputType.Text, attrs = {
                    classes("input")
                    if (state.inlinePlayerError != null) classes("error")
                    attr("placeholder", "Player name")
                    value(state.inlinePlayerName)
                    onInput { handler.handle(CreateMatchIntent.UpdateInlinePlayerName(it.value)) }
                    onKeyUp { if (it.key == "Enter") handler.handle(CreateMatchIntent.AddInlinePlayer) }
                })
                Button(attrs = {
                    classes("btn", "btn-primary")
                    onClick { handler.handle(CreateMatchIntent.AddInlinePlayer) }
                }) { Text("Add") }
            }
            state.inlinePlayerError?.let { Div(attrs = { classes("error-msg") }) { Text(it) } }
        }
    }

    if (state.availablePlayers.isEmpty()) {
        Div(attrs = { classes("empty-inline") }) { Text("No players yet — tap ＋ to add one.") }
    } else {
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
                                    onChange { event ->
                                        val checked = (event.target as org.w3c.dom.HTMLInputElement).checked
                                        handler.handle(
                                            CreateMatchIntent.UpdateManualWinner(player.id, checked)
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

@Composable
private fun SectionHeader(label: String, onAdd: () -> Unit) {
    Div(attrs = {
        style {
            property("display", "flex")
            property("align-items", "center")
            property("justify-content", "space-between")
            property("margin-top", "16px")
            property("margin-bottom", "8px")
        }
    }) {
        Span(attrs = {
            classes("section-label")
            style {
                property("margin-top", "0")
                property("margin-bottom", "0")
            }
        }) { Text(label) }
        Button(attrs = {
            classes("btn-add")
            onClick { onAdd() }
        }) { Text("＋") }
    }
}


