package com.scoreo.ui.navigation

/**
 * Application screens (routes).
 * Pure data model, no Compose/DOM dependencies.
 */
sealed class Screen {
    data object Home : Screen()
    data object History : Screen()
    data object Import : Screen()
    data object Stats : Screen()
    data object Games : Screen()
    data object Sync : Screen()
    data class ScoreDetail(
        val gameTypeId: String,
        val playerIds: List<String>,
        val matchId: String? = null  // null = new match, non-null = edit existing
    ) : Screen()
}
