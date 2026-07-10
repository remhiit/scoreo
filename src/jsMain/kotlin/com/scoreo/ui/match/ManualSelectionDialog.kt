package com.scoreo.ui.match

import androidx.compose.runtime.Composable
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
 * Dialog for final manual arbitration when secondary scores fail to break a tie,
 * or when the game type uses [com.scoreo.domain.model.TieBreakRule.MANUAL_SELECTION].
 *
 * Offers three options:
 * 1. Select one or more winners via checkboxes
 * 2. Keep the tie (all tied players are winners)
 */
@Composable
fun ManualSelectionDialog(
    tiedPlayers: List<Player>,
    selectedWinners: Set<String>,
    error: String?,
    onToggleWinner: (playerId: String) -> Unit,
    onConfirm: () -> Unit,
    onKeepTie: () -> Unit,
    onDismiss: () -> Unit,
) {
    LudoModal(
        open = true,
        title = Strings.BTN_FINAL_DECISION,
        onClose = onDismiss,
        footer = {
            LudoButton(text = Strings.BTN_CANCEL, variant = ButtonVariant.Secondary, onClick = onDismiss)
            LudoButton(text = Strings.BTN_KEEP_TIE, variant = ButtonVariant.Secondary, onClick = onKeepTie)
            LudoButton(text = Strings.BTN_CONFIRM, variant = ButtonVariant.Primary, onClick = onConfirm)
        },
    ) {
        tiedPlayers.forEach { player ->
            Div(attrs = { classes("modal-row") }) {
                Input(type = InputType.Checkbox, attrs = {
                    checked(player.id in selectedWinners)
                    onChange { onToggleWinner(player.id) }
                })
                Span { Text(player.name) }
            }
        }
        error?.let { msg ->
            Div(attrs = { classes("error-msg") }) { Text(msg) }
        }
    }
}
