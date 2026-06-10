package com.scoreo.ui.home

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import kotlinx.coroutines.delay
import com.scoreo.domain.model.GameType
import com.scoreo.domain.model.Player
import com.scoreo.domain.model.WinCondition
import com.scoreo.ui.player.PlayerHandler
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
    onAddPlayer: (name: String) -> Player,
    onStartGame: (gameTypeId: String, playerIds: List<String>) -> Unit,
    onConfigurePlayers: () -> Unit,
) {
    val state = playerHandler.state

    var selectedPlayers by remember { mutableStateOf(setOf<String>()) }

    var showAddPlayer by remember { mutableStateOf(false) }
    var addPlayerInput by remember { mutableStateOf("") }
    var addPlayerError by remember { mutableStateOf<String?>(null) }

    var showGameModal by remember { mutableStateOf(false) }
    var modalGameTypes by remember { mutableStateOf(getGameTypes()) }
    var selectedGameType by remember { mutableStateOf<GameType?>(null) }
    var gameModalError by remember { mutableStateOf<String?>(null) }

    var showAddGameForm by remember { mutableStateOf(false) }
    var inlineGameName by remember { mutableStateOf("") }
    var inlineGameWinCondition by remember { mutableStateOf(WinCondition.HIGHEST_SCORE) }
    var inlineGameError by remember { mutableStateOf<String?>(null) }

    var fabError by remember { mutableStateOf<String?>(null) }

    if (state.players.isEmpty()) {
        Div(attrs = { classes("home-empty") }) {
            Span(attrs = { classes("home-empty-icon") }) { Text("🎮") }
            Span(attrs = { classes("home-empty-text") }) { Text("No players yet.") }
            Button(attrs = {
                classes("btn", "btn-secondary")
                onClick { onConfigurePlayers() }
            }) { Text("⚙️ Configure players") }
        }
    } else {
        Div(attrs = { classes("home-player-list") }) {
            state.players.forEach { player ->
                val isSelected = player.id in selectedPlayers
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
                        val stats = state.stats[player.id]
                        Div(attrs = { classes("stats") }) {
                            if (stats != null) {
                                Span(attrs = { classes("stat-win") }) { Text("${stats.wins}W") }
                                Span(attrs = { classes("stat-loss") }) { Text("${stats.losses}L") }
                                val total = stats.wins + stats.losses
                                if (total > 0) {
                                    val ratio = (stats.wins * 100 / total)
                                    Span(attrs = { classes("stat-ratio") }) { Text("$ratio%") }
                                }
                            } else {
                                Span(attrs = { classes("stat-none") }) { Text("No matches") }
                            }
                        }
                    }
                    if (isSelected) {
                        Span(attrs = { classes("home-player-check") }) { Text("✓") }
                    }
                }
            }

            Div(attrs = { classes("home-add-player-toggle") }) {
                Button(attrs = {
                    classes("btn-add")
                    onClick { showAddPlayer = !showAddPlayer }
                }) { Text(if (showAddPlayer) "−" else "＋") }
                Span { Text("Add player") }
            }
            if (showAddPlayer) {
                Div(attrs = { classes("home-add-player-form") }) {
                    Div(attrs = { classes("form-row") }) {
                        Input(type = InputType.Text, attrs = {
                            classes("input")
                            if (addPlayerError != null) classes("error")
                            attr("placeholder", "Player name")
                            value(addPlayerInput)
                            onInput { addPlayerInput = it.value; addPlayerError = null }
                            onKeyUp { if (it.key == "Enter") addPlayerInput.let { name ->
                                if (name.isNotBlank()) {
                                    val player = onAddPlayer(name.trim())
                                    selectedPlayers = selectedPlayers + player.id
                                    addPlayerInput = ""
                                    showAddPlayer = false
                                    addPlayerError = null
                                }
                            } }
                        })
                        Button(attrs = {
                            classes("btn", "btn-primary")
                            onClick {
                                val name = addPlayerInput.trim()
                                val error = requireNonBlank(name)
                                if (error != null) {
                                    addPlayerError = error
                                    return@onClick
                                }
                                val player = onAddPlayer(name)
                                selectedPlayers = selectedPlayers + player.id
                                addPlayerInput = ""
                                showAddPlayer = false
                                addPlayerError = null
                            }
                        }) { Text("Add") }
                    }
                    addPlayerError?.let { Div(attrs = { classes("error-msg") }) { Text(it) } }
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
}
