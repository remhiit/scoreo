package com.scoreo.ui.player

sealed class PlayerIntent {
    data class UpdateInput(val name: String) : PlayerIntent()
    data object AddPlayer : PlayerIntent()
}
