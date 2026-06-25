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
import com.scoreo.ui.shared.ListItemRow
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
        Input(type = InputType.Text, attrs = {
            classes("input")
            if (state.error != null) classes("error")
            attr("placeholder", Strings.LABEL_PLAYER_NAME)
            value(state.inputName)
            onInput { playerHandler.handle(PlayerIntent.UpdateInput(it.value)) }
            onKeyUp { if (it.key == "Enter") playerHandler.handle(PlayerIntent.AddPlayer) }
        })
        Button(attrs = {
            classes("btn", "btn-primary")
            onClick { playerHandler.handle(PlayerIntent.AddPlayer) }
        }) { Text(Strings.BTN_ADD) }
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
         Div(attrs = { classes("home-player-list") }) {
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
         Button(attrs = {
             classes("fab")
             if (!hasEnoughPlayers) {
                 classes("fab-disabled")
                 style { property("pointer-events", "none") }
             }
             onClick {
                 if (selectedPlayers.size >= 2) {
                     modalGameTypes = getGameTypes()
                     selectedGameType = null
                     gameModalError = null
                     showAddGameForm = false
                     showGameModal = true
                 }
             }
         }) { Text(Strings.BTN_NEW_MATCH) }
    }

    // ── Game selection modal ──
    if (showGameModal) {
        Div(attrs = {
            classes("modal-overlay")
            onClick { showGameModal = false }
        }) {}
        Div(attrs = { classes("modal-content") }) {
            Div(attrs = { classes("modal-title") }) { Text(Strings.DIALOG_SELECT_GAME) }

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
                Button(attrs = {
                    classes("btn-add")
                    onClick { showAddGameForm = !showAddGameForm }
                }) { Text(if (showAddGameForm) "−" else "＋") }
                Span { Text(Strings.LABEL_ADD_NEW_GAME) }
            }

            if (showAddGameForm) {
                Div(attrs = { classes("inline-form") }) {
                    Input(type = InputType.Text, attrs = {
                        classes("input")
                        if (inlineGameError != null) classes("error")
                        attr("placeholder", Strings.LABEL_GAME_NAME)
                        value(inlineGameName)
                        onInput { inlineGameName = it.value; inlineGameError = null }
                        onKeyUp { if (it.key == "Enter" && inlineGameName.isNotBlank()) {
                            addInlineGameType()
                        } }
                    })
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
                    Button(attrs = {
                        classes("btn", "btn-primary", "btn-full")
                        onClick {
                            if (inlineGameName.isNotBlank()) {
                                addInlineGameType()
                            }
                        }
                    }) { Text(Strings.BTN_ADD_GAME) }
                }
            }

            gameModalError?.let { Div(attrs = { classes("error-msg") }) { Text(it) } }

            Div(attrs = { classes("modal-actions") }) {
                Button(attrs = {
                    classes("btn", "btn-secondary")
                    onClick { showGameModal = false }
                }) { Text(Strings.BTN_CANCEL) }
                Button(attrs = {
                    classes("btn", "btn-primary")
                    onClick {
                        if (selectedGameType == null) {
                            gameModalError = Strings.MSG_ERROR_SELECT_GAME
                            return@onClick
                        }
                        showGameModal = false
                        onStartGame(selectedGameType!!.id, selectedPlayers.toList())
                    }
                }) { Text(Strings.BTN_START_MATCH) }
            }
        }
    }

    // ── Delete confirmation modal ──
    state.deleteConfirmPlayerId?.let { playerId ->
        val player = state.players.find { it.id == playerId }
        Div(attrs = {
            classes("modal-overlay")
            onClick { playerHandler.handle(PlayerIntent.DismissDeleteConfirm) }
        }) {}
        Div(attrs = { classes("modal-content") }) {
            Div(attrs = { classes("modal-title") }) { Text(Strings.CONFIRM_DELETE_PLAYER.replace("{name}", player?.name ?: "?")) }
            Div(attrs = { classes("modal-body") }) { Text(Strings.MSG_MATCHES_PRESERVED) }
            Div(attrs = { classes("modal-row") }) {
                Input(type = InputType.Checkbox, attrs = {
                    checked(anonymize)
                    onClick { anonymize = !anonymize }
                })
                Span { Text(Strings.BTN_ERASE_NAME) }
            }
            Div(attrs = { classes("modal-actions") }) {
                Button(attrs = {
                    classes("btn", "btn-secondary")
                    onClick { playerHandler.handle(PlayerIntent.DismissDeleteConfirm) }
                }) { Text(Strings.BTN_CANCEL) }
                Button(attrs = {
                    classes("btn", "btn-danger", "btn-danger-filled")
                    onClick { playerHandler.handle(PlayerIntent.DeletePlayer(playerId, anonymize)) }
                }) { Text(Strings.BTN_DELETE) }
            }
        }
    }

    // ── Rename modal ──
    state.renamingPlayerId?.let { playerId ->
        val player = state.players.find { it.id == playerId }
        if (player != null) {
            Div(attrs = {
                classes("modal-overlay")
                onClick { playerHandler.handle(PlayerIntent.CancelRename) }
            }) {}
            Div(attrs = { classes("modal-content") }) {
                Div(attrs = { classes("modal-title") }) {
                    Text(Strings.TITLE_RENAME_PLAYER.replace("{name}", player.name))
                }
                Div(attrs = { classes("modal-body") }) {
                    Input(type = InputType.Text, attrs = {
                        classes("input")
                        value(state.renameInput)
                        attr("autofocus", "")
                        onInput { playerHandler.handle(PlayerIntent.UpdateRenameInput(it.value)) }
                        onKeyUp { e ->
                            if (e.key == "Enter") playerHandler.handle(PlayerIntent.ConfirmRename)
                        }
                    })
                    state.error?.let { errorMsg ->
                        Div(attrs = { classes("error-msg") }) { Text(errorMsg) }
                    }
                }
                Div(attrs = { classes("modal-actions") }) {
                    Button(attrs = {
                        classes("btn", "btn-secondary")
                        onClick { playerHandler.handle(PlayerIntent.CancelRename) }
                    }) { Text(Strings.BTN_CANCEL) }
                    Button(attrs = {
                        classes("btn", "btn-primary")
                        onClick { playerHandler.handle(PlayerIntent.ConfirmRename) }
                    }) { Text(Strings.BTN_CONFIRM) }
                }
            }
        }
    }
}
