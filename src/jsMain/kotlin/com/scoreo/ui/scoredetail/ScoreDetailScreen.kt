package com.scoreo.ui.scoredetail

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.scoreo.ui.match.ManualSelectionDialog
import com.scoreo.ui.match.SecondaryScoreDialog
import com.scoreo.ui.Strings
import com.scoreo.ui.shared.ButtonVariant
import com.scoreo.ui.shared.LudoButton
import com.scoreo.ui.shared.LudoModal
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.P
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Table
import org.jetbrains.compose.web.dom.Td
import org.jetbrains.compose.web.dom.Text
import org.jetbrains.compose.web.dom.Th
import org.jetbrains.compose.web.dom.Tr

@Composable
fun ScoreDetailScreen(
    handler: ScoreDetailHandler,
    onSaved: () -> Unit,
    onCancel: () -> Unit,
) {
    val state = handler.state

    LaunchedEffect(state.saved) {
        if (state.saved) {
            handler.reset()
            onSaved()
        }
    }

    LaunchedEffect(state.cancelled) {
        if (state.cancelled) {
            handler.reset()
            onCancel()
        }
    }

    Table(attrs = { classes("score-table") }) {
        Tr {
            state.players.forEach { player ->
                Th(attrs = { classes("score-table-cell", "score-table-header") }) {
                    Text(player.name)
                }
            }
            if (state.rounds.size > 1) {
                Th(attrs = { classes("score-table-cell", "score-table-action") }) {}
            }
        }
        Tr {
            state.players.forEach { player ->
                Td(attrs = { classes("score-table-cell", "score-table-total") }) {
                    Text("${state.totals[player.id] ?: 0}")
                }
            }
            if (state.rounds.size > 1) {
                Td(attrs = { classes("score-table-cell", "score-table-action") }) {}
            }
        }
        state.rounds.forEachIndexed { roundIndex, round ->
            Tr(attrs = { classes("score-table-round") }) {
                state.players.forEach { player ->
                    Td(attrs = { classes("score-table-cell") }) {
                        // Reuses Ludo's input styling directly (not the LudoNumberInput
                        // composable — scores are free-text String here, so "-" or ""
                        // mid-edit isn't clamped away; see scoring.css's comment).
                        Input(type = InputType.Number, attrs = {
                            classes("ludo-input", "ludo-input--sm", "ludo-input--stepper-field", "ludo-input--mono")
                            value(round[player.id] ?: "")
                            attr("inputmode", "numeric")
                            onInput {
                                handler.handle(ScoreDetailIntent.UpdateScore(roundIndex, player.id, it.value.toString()))
                            }
                        })
                    }
                }
                if (state.rounds.size > 1) {
                    Td(attrs = { classes("score-table-cell", "score-table-action") }) {
                        Button(attrs = {
                            classes("btn-icon", "btn-icon--danger")
                            onClick { handler.handle(ScoreDetailIntent.RemoveRound(roundIndex)) }
                        }) { Text("✕") }
                    }
                }
            }
        }
    }

    Div(attrs = { classes("score-table-add") }) {
        Button(attrs = {
            classes("score-table-add-btn")
            onClick { handler.handle(ScoreDetailIntent.AddRound) }
        }) { Text("＋") }
    }

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    Div(attrs = { classes("score-actions") }) {
        LudoButton(
            text = Strings.BTN_FINISH_MATCH,
            variant = ButtonVariant.Primary,
            onClick = { handler.handle(ScoreDetailIntent.Terminate) },
        )
        LudoButton(
            text = Strings.BTN_CANCEL,
            variant = ButtonVariant.Secondary,
            onClick = { handler.handle(ScoreDetailIntent.CancelMatch) },
        )
    }

    LudoModal(
        open = state.showWinnerModal,
        title = Strings.DIALOG_SELECT_WINNER,
        onClose = { handler.handle(ScoreDetailIntent.DismissModal) },
        footer = {
            LudoButton(
                text = Strings.BTN_CANCEL,
                variant = ButtonVariant.Secondary,
                onClick = { handler.handle(ScoreDetailIntent.DismissModal) },
            )
            LudoButton(
                text = Strings.BTN_CONFIRM,
                variant = ButtonVariant.Primary,
                onClick = { handler.handle(ScoreDetailIntent.ConfirmWinners) },
            )
        },
    ) {
        state.players.forEach { player ->
            val total = state.totals[player.id] ?: 0
            Div(attrs = { classes("modal-row") }) {
                Input(type = InputType.Checkbox, attrs = {
                    checked(player.id in state.modalWinners)
                    onChange {
                        handler.handle(ScoreDetailIntent.ToggleModalWinner(player.id))
                    }
                })
                Span { Text("${player.name} — ${total} pts") }
            }
        }
        state.error?.let { msg ->
            Div(attrs = { classes("error-msg") }) { Text(msg) }
        }
    }

    val tiedPlayers = state.players.filter { it.id in state.tiedPlayerIds }

    // ── Tie-break: Secondary Score Dialog ──
    if (state.showSecondaryScoreDialog) {
        SecondaryScoreDialog(
            gameType = state.gameType,
            tiedPlayers = tiedPlayers,
            secondaryScoreInputs = state.secondaryScoreInputs,
            error = state.error,
            onUpdateInput = { playerId, value ->
                handler.handle(ScoreDetailIntent.UpdateSecondaryScoreInput(playerId, value))
            },
            onSubmit = { handler.handle(ScoreDetailIntent.SubmitSecondaryScores) },
            onDismiss = { handler.handle(ScoreDetailIntent.DismissTieBreak) },
        )
    }

    // ── Tie-break: Manual Selection Dialog ──
    if (state.showManualSelectionDialog) {
        ManualSelectionDialog(
            tiedPlayers = tiedPlayers,
            selectedWinners = state.manualSelectionWinners,
            error = state.error,
            onToggleWinner = { playerId ->
                handler.handle(ScoreDetailIntent.ToggleManualSelectionWinner(playerId))
            },
            onConfirm = { handler.handle(ScoreDetailIntent.ConfirmManualWinners) },
            onKeepTie = { handler.handle(ScoreDetailIntent.KeepTie) },
            onDismiss = { handler.handle(ScoreDetailIntent.DismissTieBreak) },
        )
    }

    // ── Cancel Confirm Dialog ──
    LudoModal(
        open = state.showCancelConfirm,
        title = Strings.DIALOG_DISCARD_SCORES,
        onClose = { handler.handle(ScoreDetailIntent.DismissCancelConfirm) },
        footer = {
            LudoButton(
                text = Strings.BTN_CANCEL,
                variant = ButtonVariant.Secondary,
                onClick = { handler.handle(ScoreDetailIntent.DismissCancelConfirm) },
            )
            LudoButton(
                text = Strings.BTN_DISCARD,
                variant = ButtonVariant.Danger,
                onClick = { handler.handle(ScoreDetailIntent.ConfirmCancel) },
            )
        },
    ) {
        // was classes("modal-message"), a class never defined anywhere
        // (pre-existing bug — this text rendered unstyled); LudoModal's
        // own .ludo-modal__body p rule (a <p>, not a <div>) now styles
        // it correctly.
        P { Text(Strings.DIALOG_DISCARD_MESSAGE) }
    }
}
