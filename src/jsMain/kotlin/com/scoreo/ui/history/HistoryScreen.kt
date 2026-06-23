package com.scoreo.ui.history

import androidx.compose.runtime.Composable
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun HistoryScreen(handler: HistoryHandler) {
    val matches = handler.state.displays

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
}
