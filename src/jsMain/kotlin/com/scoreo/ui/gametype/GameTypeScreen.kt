package com.scoreo.ui.gametype

import androidx.compose.runtime.Composable
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.attributes.placeholder
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H1
import org.jetbrains.compose.web.dom.H2
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Option
import org.jetbrains.compose.web.dom.Select
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun GameTypeScreen(handler: GameTypeHandler, showTitle: Boolean = true) {
    val state = handler.state

    if (showTitle) H1 { Text("Game Types") }

    if (state.selectedGameId != null && state.editingGameId == null) {
        GameDetailView(handler)
        return
    }

    GameTypeForm(handler)

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    if (state.gameTypes.isEmpty()) {
        Div(attrs = { classes("empty") }) { Text("No game types yet.") }
    } else {
        Div(attrs = { style { property("margin-top", "16px") } }) {
            state.gameTypes.forEach { gameType ->
                val isSelected = gameType.id == state.selectedGameId
                Div(
                    attrs = {
                        classes("card")
                        if (isSelected) classes("card-selected")
                        onClick { handler.handle(GameTypeIntent.SelectGame(gameType.id)) }
                    }
                ) {
                    Div(attrs = { classes("card-title") }) { Text(gameType.name) }
                    Span(attrs = { classes("card-badge") }) { Text(gameType.winCondition.label()) }
                }
            }
        }
    }
}

@Composable
private fun GameTypeForm(handler: GameTypeHandler) {
    val state = handler.state
    val isEditing = state.editingGameId != null

    Div(attrs = { classes("form-row") }) {
        Input(type = InputType.Text, attrs = {
            classes("input")
            placeholder("Game name")
            value(state.inputName)
            onInput { handler.handle(GameTypeIntent.UpdateName(it.value)) }
            onKeyUp {
                if (it.key == "Enter") {
                    if (isEditing) {
                        val gameType = state.gameTypes.find { it.id == state.editingGameId }
                        if (gameType != null) {
                            handler.handle(GameTypeIntent.UpdateGameType(
                                gameType.copy(
                                    name = state.inputName.trim(),
                                    winCondition = state.selectedWinCondition,
                                    tieBreakRule = state.selectedTieBreakRule,
                                    tieBreakCondition = state.selectedTieBreakCondition,
                                    tieBreakLabel = state.selectedTieBreakLabel,
                                )
                            ))
                        }
                    } else {
                        handler.handle(GameTypeIntent.AddGameType)
                    }
                }
            }
        })
    }

    Div(attrs = { classes("section-label") }) { Text("Win condition") }
    Select(attrs = {
        classes("select")
        onChange { event ->
            val wc = WinCondition.entries.find { it.name == event.value }
                ?: WinCondition.HIGHEST_SCORE
            handler.handle(GameTypeIntent.SelectWinCondition(wc))
        }
    }) {
        WinCondition.entries.forEach { wc ->
            Option(value = wc.name, attrs = {
                if (wc == state.selectedWinCondition) attr("selected", "")
            }) { Text(wc.label()) }
        }
    }

    Div(attrs = { classes("section-label") }) { Text("Tie break rule") }
    Select(attrs = {
        classes("select")
        onChange { event ->
            val rule = TieBreakRule.entries.find { it.name == event.value }
                ?: TieBreakRule.NONE
            handler.handle(GameTypeIntent.UpdateTieBreakRule(rule))
        }
    }) {
        TieBreakRule.entries.forEach { rule ->
            Option(value = rule.name, attrs = {
                if (rule == state.selectedTieBreakRule) attr("selected", "")
            }) { Text(rule.label()) }
        }
    }

    if (state.selectedTieBreakRule == TieBreakRule.SECONDARY_SCORE) {
        Div(attrs = { classes("section-label") }) { Text("Tie break condition") }
        Select(attrs = {
            classes("select")
            onChange { event ->
                val cond = WinCondition.entries.find { it.name == event.value }
                    ?: WinCondition.HIGHEST_SCORE
                handler.handle(GameTypeIntent.UpdateTieBreakCondition(cond))
            }
        }) {
            WinCondition.entries.forEach { cond ->
                Option(value = cond.name, attrs = {
                    if (cond == state.selectedTieBreakCondition) attr("selected", "")
                }) { Text(cond.label()) }
            }
        }

        Div(attrs = { classes("section-label") }) { Text("Tie break label") }
        Div(attrs = { classes("form-row") }) {
            Input(type = InputType.Text, attrs = {
                classes("input")
                placeholder("e.g. Number of cards")
                value(state.selectedTieBreakLabel ?: "")
                onInput { handler.handle(GameTypeIntent.UpdateTieBreakLabel(it.value)) }
            })
        }
    }

    Div(attrs = {
        style {
            property("display", "flex")
            property("gap", "8px")
        }
    }) {
        Button(attrs = {
            classes("btn", "btn-primary", "btn-full")
            onClick {
                if (isEditing) {
                    val gameType = state.gameTypes.find { it.id == state.editingGameId }
                    if (gameType != null) {
                        handler.handle(GameTypeIntent.UpdateGameType(
                            gameType.copy(
                                name = state.inputName.trim(),
                                winCondition = state.selectedWinCondition,
                                tieBreakRule = state.selectedTieBreakRule,
                                tieBreakCondition = state.selectedTieBreakCondition,
                                tieBreakLabel = state.selectedTieBreakLabel,
                            )
                        ))
                    }
                } else {
                    handler.handle(GameTypeIntent.AddGameType)
                }
            }
        }) { Text(if (isEditing) "Save changes" else "Add game type") }

        if (isEditing) {
            Button(attrs = {
                classes("btn", "btn-secondary")
                onClick { handler.handle(GameTypeIntent.CancelEdit) }
            }) { Text("Cancel") }
        }
    }
}

@Composable
private fun GameDetailView(handler: GameTypeHandler) {
    val state = handler.state
    val gameType = state.gameTypes.find { it.id == state.selectedGameId }

    if (gameType == null) {
        Div(attrs = { classes("empty") }) { Text("Game not found.") }
        return
    }

    H2 { Text(gameType.name) }

    Div(attrs = { classes("detail-row") }) {
        Span(attrs = { classes("detail-label") }) { Text("Win condition:") }
        Span(attrs = { classes("detail-value") }) { Text(gameType.winCondition.label()) }
    }

    Div(attrs = { classes("detail-row") }) {
        Span(attrs = { classes("detail-label") }) { Text("Tie break:") }
        Span(attrs = { classes("detail-value") }) { Text(gameType.tieBreakRule.label()) }
    }

    if (gameType.tieBreakRule == TieBreakRule.SECONDARY_SCORE) {
        Div(attrs = { classes("detail-row") }) {
            Span(attrs = { classes("detail-label") }) { Text("Tie break condition:") }
            Span(attrs = { classes("detail-value") }) { Text(gameType.tieBreakCondition.label()) }
        }
        gameType.tieBreakLabel?.let { label ->
            Div(attrs = { classes("detail-row") }) {
                Span(attrs = { classes("detail-label") }) { Text("Tie break question:") }
                Span(attrs = { classes("detail-value") }) { Text(label) }
            }
        }
    }

    Div(attrs = {
        style {
            property("display", "flex")
            property("gap", "8px")
            property("margin-top", "16px")
        }
    }) {
        Button(attrs = {
            classes("btn", "btn-secondary")
            onClick { handler.handle(GameTypeIntent.DeselectGame) }
        }) { Text("Back") }

        Button(attrs = {
            classes("btn", "btn-primary")
            onClick { handler.handle(GameTypeIntent.EditGameType(gameType.id)) }
        }) { Text("Edit") }
    }
}

