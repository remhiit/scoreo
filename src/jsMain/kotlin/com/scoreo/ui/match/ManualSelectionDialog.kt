package com.scoreo.ui.match

import androidx.compose.runtime.Composable
import com.scoreo.domain.model.Player
import com.scoreo.ui.Strings
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
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
    Div(attrs = {
        classes("modal-overlay")
        onClick { onDismiss() }
    }) {}
    Div(attrs = { classes("modal-content") }) {
        Div(attrs = { classes("modal-title") }) { Text(Strings.BTN_FINAL_DECISION) }
        Div(attrs = { classes("modal-body") }) {
            tiedPlayers.forEach { player ->
                Div(attrs = { classes("modal-row") }) {
                    Input(type = InputType.Checkbox, attrs = {
                        checked(player.id in selectedWinners)
                        onChange { onToggleWinner(player.id) }
                    })
                    Span { Text(player.name) }
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
            }) { Text(Strings.BTN_CANCEL) }
            Button(attrs = {
                classes("btn", "btn-secondary")
                onClick { onKeepTie() }
            }) { Text(Strings.BTN_KEEP_TIE) }
            Button(attrs = {
                classes("btn", "btn-primary")
                onClick { onConfirm() }
            }) { Text(Strings.BTN_CONFIRM) }
        }
    }
}
