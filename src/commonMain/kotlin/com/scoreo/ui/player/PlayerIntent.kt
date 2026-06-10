package com.scoreo.ui.player

sealed class PlayerIntent {
    data class UpdateInput(val name: String) : PlayerIntent()
    data object AddPlayer : PlayerIntent()
    data class DeletePlayer(val id: String, val anonymize: Boolean = false) : PlayerIntent()
    data class ShowDeleteConfirm(val id: String) : PlayerIntent()
    data object DismissDeleteConfirm : PlayerIntent()
}
