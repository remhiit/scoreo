package com.scoreo.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

sealed class Screen {
    data object Home : Screen()
    data object History : Screen()
    data object Import : Screen()
    data object Stats : Screen()
    data object Games : Screen()
    data class ScoreDetail(val gameTypeId: String, val playerIds: List<String>) : Screen()
}

class AppNavigator {
    var current by mutableStateOf<Screen>(Screen.Home)
        private set

    fun navigate(screen: Screen) {
        current = screen
    }
}
