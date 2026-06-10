package com.scoreo.ui.history

import androidx.compose.runtime.Composable
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun HistoryScreen(handler: HistoryHandler) {
    val matches = handler.state

    if (matches.isEmpty()) {
        Div(attrs = { classes("empty") }) { Text("No matches yet.") }
    } else {
        matches.forEach { display ->
            Div(attrs = { classes("card", "match-card") }) {
                Div(attrs = { style { property("width", "100%") } }) {
                    Div(attrs = {
                        style {
                            property("display", "flex")
                            property("justify-content", "space-between")
                            property("margin-bottom", "8px")
                        }
                    }) {
                        Span(attrs = { classes("card-title") }) {
                            Text(display.gameType?.name ?: "Unknown game")
                        }
                        Span(attrs = { classes("card-sub") }) { Text(display.dateFormatted) }
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
                                Text(label + if (isWinner) " 🏆" else "")
                            }
                            Span { Text("${ps.score}") }
                        }
                    }
                }
            }
        }
    }
}
