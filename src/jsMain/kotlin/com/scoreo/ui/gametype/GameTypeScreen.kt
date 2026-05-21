package com.scoreo.ui.gametype

import androidx.compose.runtime.Composable
import com.scoreo.domain.model.WinCondition
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.attributes.placeholder
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H1
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Option
import org.jetbrains.compose.web.dom.Select
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun GameTypeScreen(handler: GameTypeHandler) {
    val state = handler.state

    H1 { Text("Game Types") }

    Div(attrs = { classes("form-row") }) {
        Input(type = InputType.Text, attrs = {
            classes("input")
            if (state.error != null) classes("error")
            placeholder("Game name")
            value(state.inputName)
            onInput { handler.handle(GameTypeIntent.UpdateName(it.value)) }
            onKeyUp { if (it.key == "Enter") handler.handle(GameTypeIntent.AddGameType) }
        })
    }

    Div(attrs = { classes("section-label") }) { Text("Win condition") }
    Select(attrs = {
        classes("select")
        onChange { event ->
            val wc = WinCondition.valueOf(event.value ?: WinCondition.HIGHEST_SCORE.name)
            handler.handle(GameTypeIntent.SelectWinCondition(wc))
        }
    }) {
        WinCondition.entries.forEach { wc ->
            Option(value = wc.name, attrs = {
                if (wc == state.selectedWinCondition) attr("selected", "")
            }) { Text(wc.label()) }
        }
    }

    Button(attrs = {
        classes("btn", "btn-primary", "btn-full")
        onClick { handler.handle(GameTypeIntent.AddGameType) }
    }) { Text("Add game type") }

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    if (state.gameTypes.isEmpty()) {
        Div(attrs = { classes("empty") }) { Text("No game types yet.") }
    } else {
        Div(attrs = { style { property("margin-top", "16px") } }) {
            state.gameTypes.forEach { gameType ->
                Div(attrs = { classes("card") }) {
                    Div(attrs = { classes("card-title") }) { Text(gameType.name) }
                    Span(attrs = { classes("card-badge") }) { Text(gameType.winCondition.label()) }
                }
            }
        }
    }
}

private fun WinCondition.label() = when (this) {
    WinCondition.HIGHEST_SCORE -> "Highest score"
    WinCondition.LOWEST_SCORE -> "Lowest score"
    WinCondition.MANUAL -> "Manual"
}
