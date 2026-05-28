package com.scoreo.ui.setup

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.scoreo.ui.gametype.GameTypeHandler
import com.scoreo.ui.gametype.GameTypeScreen
import com.scoreo.ui.navigation.SetupSection
import com.scoreo.ui.player.PlayerHandler
import com.scoreo.ui.player.PlayerScreen
import org.jetbrains.compose.web.dom.Button
import org.jetbrains.compose.web.dom.Div
import org.jetbrains.compose.web.dom.Text

@Composable
fun SetupScreen(
    playerHandler: PlayerHandler,
    gameTypeHandler: GameTypeHandler,
    focusSection: SetupSection? = null,
) {
    var activeTab by remember(focusSection) {
        mutableStateOf(focusSection ?: SetupSection.PLAYERS)
    }

    Div(attrs = { classes("tab-bar") }) {
        Button(attrs = {
            classes("tab-btn")
            if (activeTab == SetupSection.PLAYERS) classes("active")
            onClick { activeTab = SetupSection.PLAYERS }
        }) { Text("👤 Players") }
        Button(attrs = {
            classes("tab-btn")
            if (activeTab == SetupSection.GAME_TYPES) classes("active")
            onClick { activeTab = SetupSection.GAME_TYPES }
        }) { Text("🎮 Games") }
    }

    when (activeTab) {
        SetupSection.PLAYERS -> PlayerScreen(playerHandler, showTitle = false)
        SetupSection.GAME_TYPES -> GameTypeScreen(gameTypeHandler, showTitle = false)
    }
}
