package com.scoreo.ui.history

import androidx.compose.runtime.Composable
import com.scoreo.ui.navigation.AppNavigator
import com.scoreo.ui.navigation.Screen
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.H3
import org.jetbrains.compose.web.dom.Label
import org.jetbrains.compose.web.dom.Li
import org.jetbrains.compose.web.dom.Option
import org.jetbrains.compose.web.dom.P
import org.jetbrains.compose.web.dom.Select
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text
import org.jetbrains.compose.web.dom.Ul
import org.w3c.dom.HTMLSelectElement

@Composable
fun HistoryScreen(handler: HistoryHandler, navigator: AppNavigator? = null) {
    val matches = handler.state.displays

    // Show error if present
    if (handler.state.error != null) {
        Div(attrs = { classes("error-message") }) { 
            Text(handler.state.error!!)
        }
    }

    // Game type filter dropdown
    Div(attrs = { classes("history-filter") }) {
        Label { Text("Filter by game:") }
        Select(attrs = {
            classes("filter-select")
            onChange { event ->
                val selected = (event.target as? HTMLSelectElement)?.value
                handler.handle(HistoryIntent.SelectGameTypeFilter(selected?.takeIf { it.isNotEmpty() }))
            }
        }) {
            Option(value = "", attrs = { 
                if (handler.state.selectedGameTypeFilter == null) attr("selected", "")
            }) {
                Text("All games")
            }
            matches.mapNotNull { it.gameType }.distinctBy { it.id }.forEach { gameType ->
                Option(value = gameType.id, attrs = { 
                    if (handler.state.selectedGameTypeFilter == gameType.id) attr("selected", "")
                }) {
                    Text(gameType.name)
                }
            }
        }
    }

    // Apply filter to displays
    val filteredDisplays = if (handler.state.selectedGameTypeFilter != null) {
        matches.filter { it.match.gameTypeId == handler.state.selectedGameTypeFilter }
    } else {
        matches
    }

    // Empty state with filter context
    if (filteredDisplays.isEmpty()) {
        val emptyText = if (handler.state.selectedGameTypeFilter != null) {
            val gameName = matches.find { it.match.gameTypeId == handler.state.selectedGameTypeFilter }?.gameType?.name
            if (gameName != null) "No matches for $gameName" else "No matches yet."
        } else {
            "No matches yet."
        }
        Div(attrs = { classes("empty") }) { Text(emptyText) }
    } else {
        // Render filtered displays
        filteredDisplays.forEach { display ->
            Div(attrs = {
                classes("card", "match-card")
                if (navigator != null) {
                    style { property("cursor", "pointer") }
                    onClick {
                        navigator.navigate(Screen.ScoreDetail(
                            gameTypeId = display.gameType?.id ?: return@onClick,
                            playerIds = display.match.playerScores.map { it.playerId },
                            matchId = display.match.id
                        ))
                    }
                }
            }) {
                Div(attrs = { style { property("width", "100%") } }) {
                    Div(attrs = {
                        style {
                            property("display", "flex")
                            property("justify-content", "space-between")
                            property("align-items", "center")
                            property("margin-bottom", "8px")
                        }
                    }) {
                        Div(attrs = {
                            style {
                                property("display", "flex")
                                property("align-items", "center")
                                property("gap", "8px")
                            }
                        }) {
                            Span(attrs = { classes("card-title") }) {
                                Text(display.gameType?.name ?: "Unknown game")
                            }
                            if (display.isTieBreakIndeterminate) {
                                Span(attrs = { classes("badge-warn") }) {
                                    Text("\u26A0\uFE0F Info manquante")
                                }
                            }
                        }
                        Div(attrs = {
                            style {
                                property("display", "flex")
                                property("align-items", "center")
                                property("gap", "8px")
                            }
                        }) {
                            Span(attrs = { classes("card-sub") }) { Text(display.dateFormatted) }
                            Button(attrs = {
                                classes("btn", "btn-icon")
                                onClick { handler.handle(HistoryIntent.ShowDeleteConfirm(display.match.id)) }
                                title("Delete match")
                            }) { Text("🗑") }
                        }
                    }
                    display.match.playerScores.forEach { ps ->
                        val label = display.playerLabels[ps.playerId] ?: ps.playerId
                        val isWinner = ps.playerId in display.winners
                        Div(attrs = {
                            style {
                                property("display", "flex")
                                property("justify-content", "space-between")
                                property("padding", "2px 0")
                                if (isWinner) property("font-weight", "600")
                            }
                        }) {
                            Span {
                                Text(label + if (isWinner) " \uD83C\uDFC6" else "")
                            }
                            Span { Text("${ps.score}") }
                        }
                    }
                    if (display.isTieBreakIndeterminate) {
                        Div(attrs = {
                            classes("tie-break-info")
                        }) {
                            Text(
                                "Ce match a \u00E9t\u00E9 enregistr\u00E9 avant la mise en place " +
                                    "des r\u00E8gles de d\u00E9partage. Le r\u00E9sultat est bas\u00E9 sur l\u2019\u00E9galit\u00E9."
                            )
                        }
                    }
                }
            }
        }
    }

    // Delete confirmation modal
    if (handler.state.deleteConfirmMatchId != null) {
        val matchToDelete = handler.state.displays.find { it.match.id == handler.state.deleteConfirmMatchId }
        if (matchToDelete != null) {
            Div(attrs = {
                classes("modal-overlay")
                onClick { handler.handle(HistoryIntent.DismissDeleteConfirm) }
            }) {}
            Div(attrs = { classes("modal") }) {
                H3 { Text("Delete match?") }
                P { Text("${matchToDelete.gameType?.name ?: "Unknown"} · ${matchToDelete.dateFormatted}") }
                Ul {
                    matchToDelete.match.playerScores.forEach { ps ->
                        val label = matchToDelete.playerLabels[ps.playerId] ?: "?"
                        Li { Text("$label: ${ps.score}") }
                    }
                }
                P(attrs = { classes("warning") }) { Text("Match data will be lost.") }
                Div(attrs = { classes("modal-actions") }) {
                    Button(attrs = {
                        classes("btn", "btn-secondary")
                        onClick { handler.handle(HistoryIntent.DismissDeleteConfirm) }
                    }) { Text("Cancel") }
                    Button(attrs = {
                        classes("btn", "btn-danger", "btn-danger-filled")
                        onClick { handler.handle(HistoryIntent.DeleteMatch(handler.state.deleteConfirmMatchId!!)) }
                    }) { Text("Delete") }
                }
            }
        }
    }
}
