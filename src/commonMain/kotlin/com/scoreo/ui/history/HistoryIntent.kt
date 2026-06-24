package com.scoreo.ui.history

sealed class HistoryIntent {
    data object Refresh : HistoryIntent()
    data class ShowDeleteConfirm(val matchId: String) : HistoryIntent()
    data class DeleteMatch(val matchId: String) : HistoryIntent()
    data object DismissDeleteConfirm : HistoryIntent()
    data class SelectGameTypeFilter(val gameTypeId: String?) : HistoryIntent()  // null = all games
}
