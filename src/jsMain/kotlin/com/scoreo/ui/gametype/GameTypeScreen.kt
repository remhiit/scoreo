package com.scoreo.ui.gametype

import androidx.compose.runtime.Composable
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.TieBreakRule
import com.scoreo.domain.model.WinCondition
import com.scoreo.ui.Strings
import com.scoreo.ui.shared.ButtonVariant
import com.scoreo.ui.shared.ListContainer
import com.scoreo.ui.shared.ListItemRow
import com.scoreo.ui.shared.LudoButton
import com.scoreo.ui.shared.LudoModal
import com.scoreo.ui.shared.LudoTextInput
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H1
import org.jetbrains.compose.web.dom.Option
import org.jetbrains.compose.web.dom.Select
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun GameTypeScreen(handler: GameTypeHandler, showTitle: Boolean = true) {
    val state = handler.state

    if (showTitle) H1 { Text(Strings.SCREEN_GAMES) }

    GameTypeForm(handler)

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    if (state.gameTypes.isEmpty()) {
         Div(attrs = { classes("empty") }) { Text(Strings.EMPTY_GAMES) }
    } else {
        ListContainer(className = "list-container--spaced") {
            state.gameTypes.forEach { gameType ->
                ListItemRow(
                    label = gameType.name,
                    subtitle = gameType.winCondition.label(),
                    isSelectable = false,
                    onView = { handler.handle(GameTypeIntent.SelectGame(gameType.id)) },
                    onEdit = { handler.handle(GameTypeIntent.EditGameType(gameType.id)) },
                    onDelete = { handler.handle(GameTypeIntent.ShowArchiveConfirm(gameType.id)) },
                )
            }
        }
    }

    // Modal de détail (ouverte si state.selectedGameId != null)
    run {
        val gameType = state.gameTypes.find { it.id == state.selectedGameId }
        LudoModal(
            open = state.selectedGameId != null && state.editingGameId == null && gameType != null,
            title = gameType?.name ?: "",
            onClose = { handler.handle(GameTypeIntent.DeselectGame) },
            footer = {
                LudoButton(
                    text = Strings.BTN_BACK,
                    variant = ButtonVariant.Secondary,
                    onClick = { handler.handle(GameTypeIntent.DeselectGame) },
                )
                LudoButton(
                    text = Strings.BTN_EDIT,
                    variant = ButtonVariant.Primary,
                    onClick = { handler.handle(GameTypeIntent.EditGameType(gameType!!.id)) },
                )
                LudoButton(
                    text = Strings.BTN_ARCHIVE,
                    variant = ButtonVariant.Danger,
                    onClick = { handler.handle(GameTypeIntent.ShowArchiveConfirm(gameType!!.id)) },
                )
            },
        ) {
            if (gameType != null) {
                Div(attrs = { classes("detail-row") }) {
                    Span(attrs = { classes("detail-label") }) { Text(Strings.LABEL_WIN_CONDITION_DETAIL) }
                    Span(attrs = { classes("detail-value") }) { Text(gameType.winCondition.label()) }
                }

                Div(attrs = { classes("detail-row") }) {
                    Span(attrs = { classes("detail-label") }) { Text(Strings.LABEL_TIE_BREAK_DETAIL) }
                    Span(attrs = { classes("detail-value") }) { Text(gameType.tieBreakRule.label()) }
                }

                if (gameType.tieBreakRule == TieBreakRule.SECONDARY_SCORE) {
                    Div(attrs = { classes("detail-row") }) {
                        Span(attrs = { classes("detail-label") }) { Text(Strings.LABEL_TIE_BREAK_CONDITION) }
                        Span(attrs = { classes("detail-value") }) { Text(gameType.tieBreakCondition.label()) }
                    }
                    gameType.tieBreakLabel?.let { label ->
                        Div(attrs = { classes("detail-row") }) {
                            Span(attrs = { classes("detail-label") }) { Text(Strings.LABEL_TIE_BREAK_LABEL) }
                            Span(attrs = { classes("detail-value") }) { Text(label) }
                        }
                    }
                }
            }
        }
    }

    // Modal d'édition (ouverte si state.editingGameId != null)
    run {
        val gameType = state.gameTypes.find { it.id == state.editingGameId }
        LudoModal(
            open = state.editingGameId != null && gameType != null,
            title = gameType?.let { Strings.LABEL_EDIT_GAME.replace("{name}", it.name) } ?: "",
            onClose = { handler.handle(GameTypeIntent.CancelEdit) },
            footer = {
                LudoButton(
                    text = Strings.BTN_CANCEL,
                    variant = ButtonVariant.Secondary,
                    onClick = { handler.handle(GameTypeIntent.CancelEdit) },
                )
                LudoButton(
                    text = Strings.BTN_SAVE,
                    variant = ButtonVariant.Primary,
                    onClick = {
                        handler.handle(GameTypeIntent.UpdateGameType(
                            gameType!!.copy(
                                name = state.inputName.trim(),
                                winCondition = state.selectedWinCondition,
                                tieBreakRule = state.selectedTieBreakRule,
                                tieBreakCondition = state.selectedTieBreakCondition,
                                tieBreakLabel = state.selectedTieBreakLabel,
                            )
                        ))
                    },
                )
            },
        ) {
            GameTypeFields(handler)
        }
    }

    // Archive confirmation modal
    run {
        val confirmGameType = state.gameTypes.find { it.id == state.archiveConfirmGameTypeId }
        LudoModal(
            open = state.archiveConfirmGameTypeId != null && confirmGameType != null,
            title = confirmGameType?.let { Strings.DIALOG_ARCHIVE.replace("{name}", it.name) } ?: "",
            onClose = { handler.handle(GameTypeIntent.DismissArchiveConfirm) },
            footer = {
                LudoButton(
                    text = Strings.BTN_CANCEL,
                    variant = ButtonVariant.Secondary,
                    onClick = { handler.handle(GameTypeIntent.DismissArchiveConfirm) },
                )
                LudoButton(
                    text = Strings.BTN_ARCHIVE,
                    variant = ButtonVariant.Danger,
                    onClick = { handler.handle(GameTypeIntent.ArchiveGameType(state.archiveConfirmGameTypeId!!)) },
                )
            },
        ) {
            Text(Strings.DIALOG_ARCHIVE_MESSAGE)
        }
    }
}

@Composable
private fun GameTypeForm(handler: GameTypeHandler) {
    val state = handler.state

    // Only show the add form when not in edit mode
    if (state.editingGameId != null) return

    Div(attrs = { classes("form-row") }) {
        LudoTextInput(
            value = state.inputName,
            onChange = { handler.handle(GameTypeIntent.UpdateName(it)) },
            placeholder = Strings.LABEL_FORM_GAME_NAME,
            onEnter = { handler.handle(GameTypeIntent.AddGameType) },
        )
    }

    GameTypeFields(handler)

    Div(attrs = {
        style {
            property("display", "flex")
            property("gap", "8px")
        }
    }) {
        LudoButton(
            text = Strings.BTN_ADD_GAME_TYPE,
            variant = ButtonVariant.Primary,
            className = "ludo-btn--full",
            onClick = { handler.handle(GameTypeIntent.AddGameType) },
        )
    }
}

@Composable
private fun GameTypeFields(handler: GameTypeHandler) {
    val state = handler.state

    if (state.editingGameId == null) {
        // For add mode, show the game name input
        // (already shown in GameTypeForm for add mode)
    }

    Div(attrs = { classes("section-label") }) { Text(Strings.LABEL_WIN_CONDITION) }
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

    Div(attrs = { classes("section-label") }) { Text(Strings.LABEL_TIEBREAK_RULE) }
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
        Div(attrs = { classes("section-label") }) { Text(Strings.LABEL_TIE_BREAK_CONDITION) }
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

        Div(attrs = { classes("section-label") }) { Text(Strings.LABEL_TIE_BREAK_LABEL) }
        Div(attrs = { classes("form-row") }) {
            LudoTextInput(
                value = state.selectedTieBreakLabel ?: "",
                onChange = { handler.handle(GameTypeIntent.UpdateTieBreakLabel(it)) },
                placeholder = "e.g. Number of cards",
            )
        }
    }
}
 



