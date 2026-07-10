package com.scoreo.ui.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import com.scoreo.domain.port.MatchDraftRepository
import com.scoreo.ui.player.PlayerHandler
import com.scoreo.ui.player.PlayerIntent
import com.scoreo.domain.DomainError
import com.scoreo.ui.Strings
import com.scoreo.ui.shared.ButtonSize
import com.scoreo.ui.shared.ButtonVariant
import com.scoreo.ui.shared.ListContainer
import com.scoreo.ui.shared.ListItemRow
import com.scoreo.ui.shared.LudoButton
import com.scoreo.ui.shared.LudoModal
import com.scoreo.ui.shared.LudoTextInput
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H3
import org.jetbrains.compose.web.dom.Input
import org.jetbrains.compose.web.dom.Li
import org.jetbrains.compose.web.dom.Ol
import org.jetbrains.compose.web.dom.Option
import org.jetbrains.compose.web.dom.Select
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun HomeScreen(
    playerHandler: PlayerHandler,
    getGameTypes: () -> List<GameType>,
    onAddGameType: (name: String, winCondition: WinCondition) -> GameType,
    onStartGame: (gameTypeId: String, playerIds: List<String>) -> Unit,
    matchDraftRepository: MatchDraftRepository? = null,
    onResumeDraft: (gameTypeId: String, playerIds: List<String>) -> Unit = { _, _ -> },
    getMatchCount: () -> Int = { 0 },
) {
    val state = playerHandler.state
    val draft = matchDraftRepository?.load()
    val matchCount = getMatchCount()

    var selectedPlayers by remember { mutableStateOf(setOf<String>()) }
    var anonymize by remember(state.deleteConfirmPlayerId) { mutableStateOf(false) }

    var showGameModal by remember { mutableStateOf(false) }
    var modalGameTypes by remember { mutableStateOf(getGameTypes()) }
    var selectedGameType by remember { mutableStateOf<GameType?>(null) }
    var gameModalError by remember { mutableStateOf<String?>(null) }

    var showAddGameForm by remember { mutableStateOf(false) }
    var inlineGameName by remember { mutableStateOf("") }
    var inlineGameWinCondition by remember { mutableStateOf(WinCondition.HIGHEST_SCORE) }
    var inlineGameError by remember { mutableStateOf<String?>(null) }

    // ── Resume draft banner ──
    if (draft != null) {
        Div(attrs = { classes("draft-resume-banner") }) {
            Button(attrs = {
                classes("draft-resume-button")
                onClick {
                    onResumeDraft(draft.gameTypeId, draft.playerIds)
                }
            }) {
                Span { Text("▶ ") }
                Span { Text(Strings.BTN_RESUME_MATCH) }
            }
        }
    }

    // ── Helper to add inline game (used by both Enter and button) ──
    val addInlineGameType = {
        val name = inlineGameName.trim()
        try {
            val created = onAddGameType(name, inlineGameWinCondition)
            modalGameTypes = getGameTypes()
            selectedGameType = modalGameTypes.find { it.id == created.id }
            showAddGameForm = false
            inlineGameName = ""
            inlineGameWinCondition = WinCondition.HIGHEST_SCORE
            inlineGameError = null
        } catch (e: DomainError) {
            inlineGameError = e.message
        } catch (e: Exception) {
            inlineGameError = Strings.MSG_ERROR_CREATE_GAME.replace("{error}", e.message.orEmpty())
        }
    }

    // ── Add player form (always visible) ──
    Div(attrs = { classes("form-row") }) {
        LudoTextInput(
            value = state.inputName,
            onChange = { playerHandler.handle(PlayerIntent.UpdateInput(it)) },
            placeholder = Strings.LABEL_PLAYER_NAME,
            invalid = state.error != null,
            onEnter = { playerHandler.handle(PlayerIntent.AddPlayer) },
        )
        LudoButton(
            text = Strings.BTN_ADD,
            variant = ButtonVariant.Primary,
            onClick = { playerHandler.handle(PlayerIntent.AddPlayer) },
        )
    }

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

     // ── Onboarding guide (first launch) ──
     val isFirstLaunch = state.players.isEmpty() && matchCount == 0
     if (isFirstLaunch) {
         Div(attrs = { classes("onboarding-guide") }) {
             H3 { Text(Strings.GUIDE_TITLE) }
             Ol {
                 Li { Text(Strings.GUIDE_STEP_1) }
                 Li { Text(Strings.GUIDE_STEP_2) }
                 Li { Text(Strings.GUIDE_STEP_3) }
             }
         }
     }

     // ── Player list ──
     if (state.players.isEmpty()) {
         Div(attrs = { classes("empty") }) { Text(Strings.EMPTY_PLAYERS) }
     } else {
         ListContainer {
             state.players.forEach { player ->
                 val isSelected = player.id in selectedPlayers
                 val stats = state.stats[player.id]
                 val subtitle = stats?.let { "${it.wins}W ${it.losses}L" }

                 ListItemRow(
                     label = player.name,
                     subtitle = subtitle,
                     isSelectable = true,
                     isSelected = isSelected,
                     onSelect = {
                         selectedPlayers = if (isSelected)
                             selectedPlayers - player.id
                         else
                             selectedPlayers + player.id
                     },
                     onEdit = { playerHandler.handle(PlayerIntent.StartRename(player.id)) },
                     onDelete = {
                         playerHandler.handle(PlayerIntent.ShowDeleteConfirm(player.id))
                         anonymize = false
                     },
                 )
             }
         }
     }

     // ── Selection counter ──
     if (state.players.isNotEmpty() && selectedPlayers.size < 2) {
         Div(attrs = { classes("selection-hint") }) {
             Text(Strings.MSG_SELECT_PLAYERS.replace("{n}", selectedPlayers.size.toString()))
         }
     }

     // ── FAB ──
     if (state.players.isNotEmpty()) {
         val hasEnoughPlayers = selectedPlayers.size >= 2
         LudoButton(
             text = Strings.BTN_NEW_MATCH,
             variant = ButtonVariant.Primary,
             size = ButtonSize.Lg,
             disabled = !hasEnoughPlayers,
             className = "fab-position",
             onClick = {
                 modalGameTypes = getGameTypes()
                 selectedGameType = null
                 gameModalError = null
                 showAddGameForm = false
                 showGameModal = true
             },
         )
    }

    // ── Game selection modal ──
    LudoModal(
        open = showGameModal,
        title = Strings.DIALOG_SELECT_GAME,
        onClose = { showGameModal = false },
        footer = {
            LudoButton(
                text = Strings.BTN_CANCEL,
                variant = ButtonVariant.Secondary,
                onClick = { showGameModal = false },
            )
            LudoButton(
                text = Strings.BTN_START_MATCH,
                variant = ButtonVariant.Primary,
                onClick = {
                    if (selectedGameType == null) {
                        gameModalError = Strings.MSG_ERROR_SELECT_GAME
                        return@LudoButton
                    }
                    showGameModal = false
                    onStartGame(selectedGameType!!.id, selectedPlayers.toList())
                },
            )
        },
    ) {
        if (modalGameTypes.isEmpty()) {
            Div(attrs = { classes("empty-inline") }) { Text(Strings.EMPTY_GAMES) }
        } else {
            Select(attrs = {
                classes("select")
                onChange { event ->
                    val gt = modalGameTypes.find { it.id == event.value }
                    if (gt != null) {
                        selectedGameType = gt
                        gameModalError = null
                    }
                }
            }) {
                Option(value = "", attrs = { if (selectedGameType == null) attr("selected", "") }) {
                    Text("— ${Strings.LABEL_SELECT_GAME} —")
                }
                modalGameTypes.forEach { gt ->
                    Option(value = gt.id, attrs = {
                        if (gt.id == selectedGameType?.id) attr("selected", "")
                    }) { Text(gt.name) }
                }
            }
        }

        Div(attrs = { classes("modal-row") }) {
            LudoButton(
                text = if (showAddGameForm) "−" else "＋",
                variant = ButtonVariant.Secondary,
                iconOnly = true,
                onClick = { showAddGameForm = !showAddGameForm },
            )
            Span { Text(Strings.LABEL_ADD_NEW_GAME) }
        }

        if (showAddGameForm) {
            Div(attrs = { classes("inline-form") }) {
                LudoTextInput(
                    value = inlineGameName,
                    onChange = { inlineGameName = it; inlineGameError = null },
                    placeholder = Strings.LABEL_GAME_NAME,
                    invalid = inlineGameError != null,
                    onEnter = { if (inlineGameName.isNotBlank()) addInlineGameType() },
                )
                Select(attrs = {
                    classes("select")
                    onChange { event ->
                        val wc = WinCondition.entries.find { it.name == event.value }
                            ?: WinCondition.HIGHEST_SCORE
                        inlineGameWinCondition = wc
                    }
                }) {
                    WinCondition.entries.forEach { wc ->
                        Option(value = wc.name, attrs = {
                            if (wc == inlineGameWinCondition) attr("selected", "")
                        }) { Text(wc.label()) }
                    }
                }
                inlineGameError?.let { Div(attrs = { classes("error-msg") }) { Text(it) } }
                LudoButton(
                    text = Strings.BTN_ADD_GAME,
                    variant = ButtonVariant.Primary,
                    className = "ludo-btn--full",
                    onClick = {
                        if (inlineGameName.isNotBlank()) {
                            addInlineGameType()
                        }
                    },
                )
            }
        }

        gameModalError?.let { Div(attrs = { classes("error-msg") }) { Text(it) } }
    }

    // ── Delete confirmation modal ──
    state.deleteConfirmPlayerId?.let { playerId ->
        val player = state.players.find { it.id == playerId }
        LudoModal(
            open = true,
            title = Strings.CONFIRM_DELETE_PLAYER.replace("{name}", player?.name ?: "?"),
            onClose = { playerHandler.handle(PlayerIntent.DismissDeleteConfirm) },
            footer = {
                LudoButton(
                    text = Strings.BTN_CANCEL,
                    variant = ButtonVariant.Secondary,
                    onClick = { playerHandler.handle(PlayerIntent.DismissDeleteConfirm) },
                )
                LudoButton(
                    text = Strings.BTN_DELETE,
                    variant = ButtonVariant.Danger,
                    onClick = { playerHandler.handle(PlayerIntent.DeletePlayer(playerId, anonymize)) },
                )
            },
        ) {
            Div(attrs = { classes("modal-body") }) { Text(Strings.MSG_MATCHES_PRESERVED) }
            Div(attrs = { classes("modal-row") }) {
                Input(type = InputType.Checkbox, attrs = {
                    checked(anonymize)
                    onClick { anonymize = !anonymize }
                })
                Span { Text(Strings.BTN_ERASE_NAME) }
            }
        }
    }

    // ── Rename modal ──
    state.renamingPlayerId?.let { playerId ->
        val player = state.players.find { it.id == playerId }
        if (player != null) {
            LudoModal(
                open = true,
                title = Strings.TITLE_RENAME_PLAYER.replace("{name}", player.name),
                onClose = { playerHandler.handle(PlayerIntent.CancelRename) },
                footer = {
                    LudoButton(
                        text = Strings.BTN_CANCEL,
                        variant = ButtonVariant.Secondary,
                        onClick = { playerHandler.handle(PlayerIntent.CancelRename) },
                    )
                    LudoButton(
                        text = Strings.BTN_CONFIRM,
                        variant = ButtonVariant.Primary,
                        onClick = { playerHandler.handle(PlayerIntent.ConfirmRename) },
                    )
                },
            ) {
                LudoTextInput(
                    value = state.renameInput,
                    onChange = { playerHandler.handle(PlayerIntent.UpdateRenameInput(it)) },
                    autofocus = true,
                    onEnter = { playerHandler.handle(PlayerIntent.ConfirmRename) },
                )
                state.error?.let { errorMsg ->
                    Div(attrs = { classes("error-msg") }) { Text(errorMsg) }
                }
            }
        }
    }
}
