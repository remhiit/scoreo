package com.scoreo.ui.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.WinCondition
import com.scoreo.ui.player.PlayerHandler
import com.scoreo.ui.player.PlayerIntent
import com.scoreo.ui.util.requireNonBlank
import org.jetbrains.compose.web.attributes.InputType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Input
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
) {
    val state = playerHandler.state

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

    var fabError by remember { mutableStateOf<String?>(null) }

    // ── Add player form (always visible) ──
    Div(attrs = { classes("form-row") }) {
        Input(type = InputType.Text, attrs = {
            classes("input")
            if (state.error != null) classes("error")
            attr("placeholder", "Player name")
            value(state.inputName)
            onInput { playerHandler.handle(PlayerIntent.UpdateInput(it.value)) }
            onKeyUp { if (it.key == "Enter") playerHandler.handle(PlayerIntent.AddPlayer) }
        })
        Button(attrs = {
            classes("btn", "btn-primary")
            onClick { playerHandler.handle(PlayerIntent.AddPlayer) }
        }) { Text("Add") }
    }

    state.error?.let { msg ->
        Div(attrs = { classes("error-msg") }) { Text(msg) }
    }

    // ── Player list ──
    if (state.players.isEmpty()) {
        Div(attrs = { classes("empty") }) { Text("No players yet. Add one above.") }
    } else {
        Div(attrs = { classes("home-player-list") }) {
            state.players.forEach { player ->
                val isSelected = player.id in selectedPlayers
                val stats = state.stats[player.id]
                Div(attrs = {
                    classes("home-player-card")
                    if (isSelected) classes("selected")
                    onClick {
                        if (isSelected) selectedPlayers = selectedPlayers - player.id
                        else selectedPlayers = selectedPlayers + player.id
                    }
                }) {
                    Div {
                        Div(attrs = { classes("home-player-name") }) { Text(player.name) }
                        if (stats != null) {
                            Div(attrs = { classes("stats") }) {
                                Span(attrs = { classes("stat-win") }) { Text("${stats.wins}W") }
                                Span(attrs = { classes("stat-loss") }) { Text("${stats.losses}L") }
                            }
                        }
                    }
                    Div(attrs = { classes("home-player-actions") }) {
                        if (isSelected) {
                            Span(attrs = { classes("home-player-check") }) { Text("✓") }
                        }
                        Button(attrs = {
                            classes("btn-danger")
                            onClick { e ->
                                e.stopPropagation()
                                playerHandler.handle(PlayerIntent.ShowDeleteConfirm(player.id))
                                anonymize = false
                            }
                        }) { Text("🗑") }
                    }
                }
            }
        }
    }

    // ── FAB error toast ──
    fabError?.let {
        Div(attrs = { classes("fab-error") }) { Text(it) }
    }

    LaunchedEffect(fabError) {
        if (fabError != null) {
            delay(2000)
            fabError = null
        }
    }

    // ── FAB ──
    if (state.players.isNotEmpty()) {
        val hasEnoughPlayers = selectedPlayers.size >= 2
        Button(attrs = {
            classes("fab")
            if (!hasEnoughPlayers) classes("fab-disabled")
            onClick {
                if (selectedPlayers.size < 2) {
                    fabError = "Select at least 2 players"
                } else {
                    fabError = null
                    modalGameTypes = getGameTypes()
                    selectedGameType = null
                    gameModalError = null
                    showAddGameForm = false
                    showGameModal = true
                }
            }
        }) { Text("▶ New Match") }
    }

    // ── Game selection modal ──
    if (showGameModal) {
        Div(attrs = {
            classes("modal-overlay")
            onClick { showGameModal = false }
        }) {}
        Div(attrs = { classes("modal-content") }) {
            Div(attrs = { classes("modal-title") }) { Text("Select a game") }

            if (modalGameTypes.isEmpty()) {
                Div(attrs = { classes("empty-inline") }) { Text("No games yet — tap ＋ to add one.") }
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
                        Text("— Select a game —")
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
                Span { Text("Add new game") }
            }

            if (showAddGameForm) {
                Div(attrs = { classes("inline-form") }) {
                    Input(type = InputType.Text, attrs = {
                        classes("input")
                        if (inlineGameError != null) classes("error")
                        attr("placeholder", "Game name")
                        value(inlineGameName)
                        onInput { inlineGameName = it.value; inlineGameError = null }
                        onKeyUp { if (it.key == "Enter") inlineGameName.let { name ->
                            if (name.isNotBlank()) {
                                val created = onAddGameType(name.trim(), inlineGameWinCondition)
                                modalGameTypes = getGameTypes()
                                selectedGameType = modalGameTypes.find { it.id == created.id }
                                showAddGameForm = false
                                inlineGameName = ""
                                inlineGameWinCondition = WinCondition.HIGHEST_SCORE
                                inlineGameError = null
                            }
                        } }
                    })
                    Select(attrs = {
                        classes("select")
                        onChange { event ->
                            val wc = WinCondition.valueOf(event.value ?: WinCondition.HIGHEST_SCORE.name)
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
                            val name = inlineGameName.trim()
                            val error = requireNonBlank(name)
                            if (error != null) {
                                inlineGameError = error
                                return@onClick
                            }
                            val created = onAddGameType(name, inlineGameWinCondition)
                            modalGameTypes = getGameTypes()
                            selectedGameType = modalGameTypes.find { it.id == created.id }
                            showAddGameForm = false
                            inlineGameName = ""
                            inlineGameWinCondition = WinCondition.HIGHEST_SCORE
                            inlineGameError = null
                        }
                    }) { Text("Add game") }
                }
            }

            gameModalError?.let { Div(attrs = { classes("error-msg") }) { Text(it) } }

            Div(attrs = { classes("modal-actions") }) {
                Button(attrs = {
                    classes("btn", "btn-secondary")
                    onClick { showGameModal = false }
                }) { Text("Cancel") }
                Button(attrs = {
                    classes("btn", "btn-primary")
                    onClick {
                        if (selectedGameType == null) {
                            gameModalError = "Select a game type"
                            return@onClick
                        }
                        showGameModal = false
                        onStartGame(selectedGameType!!.id, selectedPlayers.toList())
                    }
                }) { Text("Lancer la partie") }
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
            Div(attrs = { classes("modal-title") }) { Text("Supprimer ${player?.name ?: "?"} ?") }
            Div(attrs = { classes("modal-body") }) { Text("Les matchs seront conservés.") }
            Div(attrs = { classes("modal-row") }) {
                Input(type = InputType.Checkbox, attrs = {
                    checked(anonymize)
                    onClick { anonymize = !anonymize }
                })
                Span { Text("Effacer aussi le nom de l'historique") }
            }
            Div(attrs = { classes("modal-actions") }) {
                Button(attrs = {
                    classes("btn", "btn-secondary")
                    onClick { playerHandler.handle(PlayerIntent.DismissDeleteConfirm) }
                }) { Text("Annuler") }
                Button(attrs = {
                    classes("btn", "btn-danger", "btn-danger-filled")
                    onClick { playerHandler.handle(PlayerIntent.DeletePlayer(playerId, anonymize)) }
                }) { Text("Supprimer") }
            }
        }
    }
}
