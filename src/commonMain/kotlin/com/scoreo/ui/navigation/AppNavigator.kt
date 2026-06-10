package com.scoreo.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

enum class SetupSection { PLAYERS, GAME_TYPES }

sealed class Screen {
    data object Home : Screen()
    data object History : Screen()
    data object Import : Screen()
    data object Stats : Screen()
    data class Setup(val focusSection: SetupSection) : Screen()
    data class ScoreDetail(val gameTypeId: String, val playerIds: List<String>) : Screen()
}

class AppNavigator {
    var current by mutableStateOf<Screen>(Screen.Home)
        private set

    fun navigate(screen: Screen) {
        current = screen
    }
}
