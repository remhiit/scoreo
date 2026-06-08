package com.scoreo.ui.scoredetail

sealed class ScoreDetailIntent {
    data class UpdateScore(val roundIndex: Int, val playerId: String, val value: String) : ScoreDetailIntent()
    data object AddRound : ScoreDetailIntent()
    data class RemoveRound(val index: Int) : ScoreDetailIntent()
    data object Terminate : ScoreDetailIntent()
    data object ConfirmWinners : ScoreDetailIntent()
    data object DismissModal : ScoreDetailIntent()
    data class ToggleModalWinner(val playerId: String) : ScoreDetailIntent()
}
