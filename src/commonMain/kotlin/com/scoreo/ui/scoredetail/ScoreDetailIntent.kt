package com.scoreo.ui.scoredetail

sealed class ScoreDetailIntent {
    data class UpdateScore(val roundIndex: Int, val playerId: String, val value: String) : ScoreDetailIntent()
    data object AddRound : ScoreDetailIntent()
    data class RemoveRound(val index: Int) : ScoreDetailIntent()
    data object Terminate : ScoreDetailIntent()
    data object ConfirmWinners : ScoreDetailIntent()
    data object DismissModal : ScoreDetailIntent()
    data class ToggleModalWinner(val playerId: String) : ScoreDetailIntent()

    // Tie-break resolution intents
    data class UpdateSecondaryScoreInput(val playerId: String, val value: String) : ScoreDetailIntent()
    data object SubmitSecondaryScores : ScoreDetailIntent()
    data class ToggleManualSelectionWinner(val playerId: String) : ScoreDetailIntent()
    data object ConfirmManualWinners : ScoreDetailIntent()
    data object KeepTie : ScoreDetailIntent()
    data object DismissTieBreak : ScoreDetailIntent()
}
