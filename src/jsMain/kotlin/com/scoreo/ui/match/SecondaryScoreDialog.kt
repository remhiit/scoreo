package com.scoreo.ui.match

import androidx.compose.runtime.Composable
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

/**
 * Dialog for entering secondary scores to break a tie.
 *
 * Displays a numeric input field for each tied player.
 * The title is based on the game type's [GameType.tieBreakLabel].
 */
@Composable
fun SecondaryScoreDialog(
    gameType: GameType,
    tiedPlayers: List<Player>,
    secondaryScoreInputs: Map<String, String>,
    error: String?,
    onUpdateInput: (playerId: String, value: String) -> Unit,
    onSubmit: () -> Unit,
    onDismiss: () -> Unit,
) {
    val title = gameType.tieBreakLabel ?: "Score secondaire"
    Div(attrs = {
        classes("modal-overlay")
        onClick { onDismiss() }
    }) {}
    Div(attrs = { classes("modal-content") }) {
        Div(attrs = { classes("modal-title") }) { Text("$title ?") }
        Div(attrs = { classes("modal-body") }) {
            tiedPlayers.forEach { player ->
                Div(attrs = { classes("modal-row") }) {
                    Span { Text(player.name) }
                    Input(type = InputType.Number, attrs = {
                        classes("score-table-input")
                        value(secondaryScoreInputs[player.id] ?: "")
                        onInput { onUpdateInput(player.id, it.value) }
                    })
                }
            }
        }
        error?.let { msg ->
            Div(attrs = { classes("error-msg") }) { Text(msg) }
        }
        Div(attrs = { classes("modal-actions") }) {
            Button(attrs = {
                classes("btn", "btn-secondary")
                onClick { onDismiss() }
            }) { Text("Annuler") }
            Button(attrs = {
                classes("btn", "btn-primary")
                onClick { onSubmit() }
            }) { Text("Valider") }
        }
    }
}
