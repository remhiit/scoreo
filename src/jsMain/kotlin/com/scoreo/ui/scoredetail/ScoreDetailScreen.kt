package com.scoreo.ui.scoredetail

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import com.scoreo.ui.match.ManualSelectionDialog
import com.scoreo.ui.match.SecondaryScoreDialog
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Input
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
                        Input(type = InputType.Number, attrs = {
                            classes("score-table-input")
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
                            classes("score-table-remove")
                            onClick { handler.handle(ScoreDetailIntent.RemoveRound(roundIndex)) }
                        }) { Text("✕") }
                    }
                }
            }
        }
    }

    Div(attrs = { classes("score-table-add") }) {
        Button(attrs = {
            onClick { handler.handle(ScoreDetailIntent.AddRound) }
        }) { Text("＋") }
    }

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    Div(attrs = { classes("score-actions") }) {
        Button(attrs = {
            classes("btn", "btn-primary")
            onClick { handler.handle(ScoreDetailIntent.Terminate) }
        }) { Text("Terminer la partie") }
        Button(attrs = {
            classes("btn", "btn-secondary")
            onClick { onCancel() }
        }) { Text("Annuler") }
    }

    if (state.showWinnerModal) {
        Div(attrs = {
            classes("modal-overlay")
            onClick { handler.handle(ScoreDetailIntent.DismissModal) }
        }) {}
        Div(attrs = { classes("modal-content") }) {
            Div(attrs = { classes("modal-title") }) { Text("Sélectionner le(s) gagnant(s)") }
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
            Div(attrs = { classes("modal-actions") }) {
                Button(attrs = {
                    classes("btn", "btn-secondary")
                    onClick { handler.handle(ScoreDetailIntent.DismissModal) }
                }) { Text("Annuler") }
                Button(attrs = {
                    classes("btn", "btn-primary")
                    onClick { handler.handle(ScoreDetailIntent.ConfirmWinners) }
                }) { Text("Confirmer") }
            }
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
}
