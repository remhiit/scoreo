package com.scoreo.ui.navigation

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

sealed class Screen {
    data object Players : Screen()
    data object GameTypes : Screen()
    data object CreateMatch : Screen()
    data object History : Screen()
}

class AppNavigator {
    var current by mutableStateOf<Screen>(Screen.Players)
        private set

    fun navigate(screen: Screen) {
        current = screen
    }
}
