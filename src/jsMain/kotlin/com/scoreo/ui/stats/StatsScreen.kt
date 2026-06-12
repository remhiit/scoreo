package com.scoreo.ui.stats

import androidx.compose.runtime.Composable
import com.scoreo.application.PlayerDetail
import com.scoreo.domain.model.GameType
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Span
import org.jetbrains.compose.web.dom.Text

@Composable
fun StatsScreen(handler: StatsHandler) {
    val state = handler.state

    state.selectedPlayer?.let { detail ->
        PlayerDetailView(detail, onBack = { handler.handle(StatsIntent.BackToLeaderboard) })
    } ?: run {
        GameTypeTabs(
            gameTypes = state.gameTypes,
            selectedGameTypeId = state.selectedGameTypeId,
            onSelect = { handler.handle(StatsIntent.SelectGameType(it)) },
        )
        LeaderboardView(
            state.leaderboard,
            onSelectPlayer = { handler.handle(StatsIntent.SelectPlayer(it)) },
        )
    }
}

@Composable
private fun GameTypeTabs(
    gameTypes: List<GameType>,
    selectedGameTypeId: String?,
    onSelect: (String?) -> Unit,
) {
    Div(attrs = { classes("tab-bar") }) {
        Button(attrs = {
            classes("tab-btn")
            if (selectedGameTypeId == null) { classes("active") }
            onClick { onSelect(null) }
        }) { Text("All") }
        gameTypes.forEach { gt ->
            Button(attrs = {
                classes("tab-btn")
                if (selectedGameTypeId == gt.id) { classes("active") }
                onClick { onSelect(gt.id) }
            }) { Text(gt.name) }
        }
    }
}

@Composable
private fun LeaderboardView(leaderboard: List<PlayerDetail>, onSelectPlayer: (String) -> Unit) {
    if (leaderboard.isEmpty()) {
        Div(attrs = { classes("empty") }) { Text("No stats yet — play some matches first.") }
    } else {
        leaderboard.forEach { detail ->
            val total = detail.wins + detail.losses
            val pct = if (total == 0) 0f else detail.wins.toFloat() / total * 100
            Div(attrs = {
                classes("card", "stats-row")
                onClick { onSelectPlayer(detail.playerId) }
            }) {
                Div(attrs = { classes("stats-row-info") }) {
                    Span(attrs = { classes("stats-row-name") }) { Text(detail.name) }
                    Span(attrs = { classes("stats-row-record") }) { Text("${detail.wins}W ${detail.losses}L") }
                }
                Span(attrs = { classes("stats-elo") }) { Text("${detail.elo}") }
                Div(attrs = { classes("stats-row-bar-wrap") }) {
                    Div(attrs = {
                        classes("stats-row-bar")
                        style { property("width", "${pct.toInt()}%") }
                    }) {}
                }
                Span(attrs = { classes("stats-row-pct") }) { Text("${pct.toInt()}%") }
            }
        }
    }
}

@Composable
private fun PlayerDetailView(detail: PlayerDetail, onBack: () -> Unit) {
    val total = detail.wins + detail.losses
    val pct = if (total == 0) 0f else detail.wins.toFloat() / total * 100

    Div(attrs = { classes("stats-detail-header") }) {
        Button(attrs = {
            classes("back-btn")
            onClick { onBack() }
        }) { Text("←") }
        Div(attrs = { classes("stats-detail-title") }) { Text(detail.name) }
        Span(attrs = { classes("stats-elo-badge") }) { Text("${detail.elo}") }
    }

    Div(attrs = { classes("stats-detail-overall") }) {
        Span(attrs = { classes("stats-detail-record") }) { Text("${detail.wins}W / ${detail.losses}L") }
        Span(attrs = { classes("stats-detail-pct") }) { Text("(${pct.toInt()}%)") }
    }

    if (detail.headToHead.isEmpty()) {
        Div(attrs = { classes("empty") }) { Text("No head-to-head data yet.") }
    } else {
        Div(attrs = { classes("section-label") }) { Text("Head-to-head") }
        detail.headToHead.forEach { h2h ->
            val hTotal = h2h.wins + h2h.losses
            val hPct = if (hTotal == 0) 0f else h2h.wins.toFloat() / hTotal * 100
            Div(attrs = { classes("stats-h2h-row") }) {
                Div(attrs = { classes("stats-row-info") }) {
                    Span(attrs = { classes("stats-h2h-name") }) { Text(h2h.opponentName) }
                }
                Div(attrs = { classes("stats-row-bar-wrap") }) {
                    Div(attrs = {
                        classes("stats-row-bar")
                        style { property("width", "${hPct.toInt()}%") }
                    }) {}
                }
                Span(attrs = { classes("stats-h2h-record") }) {
                    Text("${h2h.wins} - ${h2h.losses}")
                }
            }
        }
    }
}
