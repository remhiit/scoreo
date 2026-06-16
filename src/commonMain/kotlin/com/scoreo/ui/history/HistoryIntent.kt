package com.scoreo.ui.history

sealed class HistoryIntent {
    data object Refresh : HistoryIntent()
}
