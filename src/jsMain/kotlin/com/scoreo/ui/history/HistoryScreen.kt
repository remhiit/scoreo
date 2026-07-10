package com.scoreo.ui.history

import androidx.compose.runtime.Composable
import com.scoreo.ui.navigation.AppNavigator
import com.scoreo.ui.navigation.Screen
import com.scoreo.ui.shared.ButtonVariant
import com.scoreo.ui.shared.ListContainer
import com.scoreo.ui.shared.ListItemRow
import com.scoreo.ui.shared.LudoButton
import com.scoreo.ui.shared.LudoModal
import com.scoreo.ui.Strings
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Label
import org.jetbrains.compose.web.dom.Li
import org.jetbrains.compose.web.dom.Option
import org.jetbrains.compose.web.dom.P
import org.jetbrains.compose.web.dom.Select
import org.jetbrains.compose.web.dom.Text
import org.jetbrains.compose.web.dom.Ul
import org.w3c.dom.HTMLSelectElement

@Composable
fun HistoryScreen(handler: HistoryHandler, navigator: AppNavigator? = null) {
    val matches = handler.state.displays

    // Show error if present
    if (handler.state.error != null) {
        // was classes("error-message") — never defined anywhere, rendered
        // unstyled; .error-msg is the real, already-styled class used
        // everywhere else in the app for this exact purpose
        Div(attrs = { classes("error-msg") }) {
            Text(handler.state.error!!)
        }
    }

    // Game type filter dropdown
     Div(attrs = { classes("history-filter") }) {
         Label { Text(Strings.LABEL_FILTER_BY_GAME) }
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
                 Text(Strings.LABEL_ALL_GAMES)
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
             if (gameName != null) "${Strings.LABEL_NO_MATCHES_FOR} $gameName" else Strings.EMPTY_MATCHES
         } else {
             Strings.EMPTY_MATCHES
         }
         Div(attrs = { classes("empty") }) { Text(emptyText) }
     } else {
         // Render filtered displays
         ListContainer {
             filteredDisplays.forEach { display ->
             val gameLabel = display.gameType?.name ?: "Unknown game"
             val scoresSubtitle = display.match.playerScores
                 .joinToString(" / ") { ps ->
                     val label = display.playerLabels[ps.playerId] ?: ps.playerId
                     "$label ${ps.score}"
                 }
             val subtitle = "$scoresSubtitle  •  ${display.dateFormatted}"

             ListItemRow(
                 label = gameLabel,
                 subtitle = subtitle,
                 isSelectable = false,
                 onEdit = {
                     if (navigator != null && display.gameType != null) {
                         navigator.navigate(Screen.ScoreDetail(
                             gameTypeId = display.gameType.id,
                             playerIds = display.match.playerScores.map { it.playerId },
                             matchId = display.match.id
                         ))
                     }
                 },
                 onDelete = { handler.handle(HistoryIntent.ShowDeleteConfirm(display.match.id)) }
              )
          }
         }
     }

    // Delete confirmation modal
    // was Div(classes("modal-overlay")) + Div(classes("modal")) — "modal"
    // was never defined anywhere (unlike "modal-content" used everywhere
    // else), so this dialog rendered as an unstyled, unpositioned block
    // instead of a centered overlay. LudoModal fixes that as a side effect.
    run {
        val matchToDelete = handler.state.displays.find { it.match.id == handler.state.deleteConfirmMatchId }
        LudoModal(
            open = handler.state.deleteConfirmMatchId != null && matchToDelete != null,
            title = Strings.MSG_DELETE_MATCH,
            onClose = { handler.handle(HistoryIntent.DismissDeleteConfirm) },
            footer = {
                LudoButton(
                    text = Strings.BTN_CANCEL,
                    variant = ButtonVariant.Secondary,
                    onClick = { handler.handle(HistoryIntent.DismissDeleteConfirm) },
                )
                LudoButton(
                    text = Strings.BTN_DELETE,
                    variant = ButtonVariant.Danger,
                    onClick = { handler.handle(HistoryIntent.DeleteMatch(handler.state.deleteConfirmMatchId!!)) },
                )
            },
        ) {
            if (matchToDelete != null) {
                P { Text("${matchToDelete.gameType?.name ?: "Unknown"} · ${matchToDelete.dateFormatted}") }
                Ul {
                    matchToDelete.match.playerScores.forEach { ps ->
                        val label = matchToDelete.playerLabels[ps.playerId] ?: "?"
                        Li { Text("$label: ${ps.score}") }
                    }
                }
                P { Text(Strings.MSG_DATA_LOST) }
            }
        }
    }
}
