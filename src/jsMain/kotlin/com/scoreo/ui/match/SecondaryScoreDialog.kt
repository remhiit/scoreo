package com.scoreo.ui.match

import androidx.compose.runtime.Composable
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.ui.Strings
import com.scoreo.ui.shared.ButtonVariant
import com.scoreo.ui.shared.LudoButton
import com.scoreo.ui.shared.LudoModal
import org.jetbrains.compose.web.attributes.InputType
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
    val title = gameType.tieBreakLabel ?: Strings.LABEL_SECONDARY_SCORE
    LudoModal(
        open = true,
        title = "$title ?",
        onClose = onDismiss,
        footer = {
            LudoButton(text = Strings.BTN_CANCEL, variant = ButtonVariant.Secondary, onClick = onDismiss)
            LudoButton(text = Strings.BTN_CONFIRM, variant = ButtonVariant.Primary, onClick = onSubmit)
        },
    ) {
        tiedPlayers.forEach { player ->
            Div(attrs = { classes("modal-row") }) {
                Span { Text(player.name) }
                Input(type = InputType.Number, attrs = {
                    classes("ludo-input", "ludo-input--sm", "ludo-input--stepper-field", "ludo-input--mono")
                    value(secondaryScoreInputs[player.id] ?: "")
                    onInput { onUpdateInput(player.id, it.value?.toString() ?: "") }
                })
            }
        }
        error?.let { msg ->
            Div(attrs = { classes("error-msg") }) { Text(msg) }
        }
    }
}
