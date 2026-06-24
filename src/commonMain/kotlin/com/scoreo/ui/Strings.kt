package com.scoreo.ui

object Strings {
    // Buttons & Actions
    const val BTN_ADD = "Add"
    const val BTN_ADD_GAME_TYPE = "Add game type"
    const val BTN_START_MATCH = "Start match"
    const val BTN_FINISH_MATCH = "Finish match"
    const val BTN_CANCEL = "Cancel"
    const val BTN_DELETE = "Delete"
    const val BTN_CONFIRM = "Confirm"
    const val BTN_SAVE = "Save changes"
    const val BTN_EDIT = "Edit"
    const val BTN_KEEP_TIE = "Keep tie"
    const val BTN_BACK = "Back"
    const val BTN_RESUME_MATCH = "Resume match in progress"
    const val BTN_FINAL_DECISION = "Final decision"
    const val BTN_KEEP_LOCAL = "Keep local"
    const val BTN_KEEP_REMOTE = "Keep remote"
    
    // Labels & Fields
    const val LABEL_PLAYER_NAME = "Player name"
    const val LABEL_GAME_TYPE = "Game type"
    const val LABEL_SCORE = "Score"
    const val LABEL_STATS = "Stats"
    const val LABEL_LEADERBOARD = "Leaderboard"
    const val LABEL_HISTORY = "History"
    const val LABEL_WINNERS = "Winner(s)"
    const val LABEL_TIEBREAK_RULE = "Tie-break rule"
    const val LABEL_SECONDARY_SCORE = "Secondary score"
    const val LABEL_ERASE_NAME = "Erase name from history"
    const val LABEL_WIN_CONDITION = "Win condition"
    const val LABEL_INFO_MISSING = "Info missing"
    const val LABEL_SYNCING = "Syncing..."
    const val LABEL_SYNC_COMPLETE = "Sync complete"
    const val LABEL_SYNC_CONFLICT = "Sync conflict"
    const val LABEL_OFFLINE = "Offline"
    
    // Empty States
    const val EMPTY_PLAYERS = "No players yet. Add one above."
    const val EMPTY_GAMES = "No game types yet. Add one."
    const val EMPTY_MATCHES = "No matches yet."
    const val EMPTY_STATS = "No stats yet — play some matches first."
    const val EMPTY_HEAD_TO_HEAD = "No head-to-head data yet."
    const val EMPTY_INLINE = "No games yet — tap ＋ to add one."
    
    // Confirmations & Messages
    const val CONFIRM_DELETE_PLAYER = "Delete {name}?"
    const val CONFIRM_DELETE_MATCH = "Delete match?"
    const val CONFIRM_DISCARD_MATCH = "Discard match? Scores will be lost."
    const val CONFIRM_ARCHIVE_GAME = "Archive {name}? It will no longer appear in game selection."
    const val MSG_MATCHES_PRESERVED = "Matches will be preserved."
    const val MSG_SCORES_LOST = "Scores will be lost."
    const val MSG_DATA_LOST = "Match data will be lost."
    const val MSG_TIEBREAK_HISTORY = "This match was recorded before tie-break rules were implemented. The result is based on equality."
    const val MSG_SELECT_PLAYERS = "{n}/2 players selected"
    
    // Win Conditions
    const val CONDITION_HIGHEST = "Highest score"
    const val CONDITION_LOWEST = "Lowest score"
    const val CONDITION_MANUAL = "Manual"
    
    // Tie-break Rules
    const val TIEBREAK_NONE = "None"
    const val TIEBREAK_MANUAL = "Manual selection"
    const val TIEBREAK_SECONDARY = "Secondary score"
    
    // Screens
    const val SCREEN_HOME = "Scoreo"
    const val SCREEN_HISTORY = "History"
    const val SCREEN_STATS = "Stats"
    const val SCREEN_GAMES = "Games"
    const val SCREEN_IMPORT = "Import"
    const val SCREEN_SYNC = "Sync"
    const val SCREEN_SCORE_DETAIL = "Score Detail"
    const val SCREEN_EDIT_MATCH = "Edit match"
    
    // Dialogs
    const val DIALOG_SELECT_GAME = "Select a game"
    const val DIALOG_SELECT_WINNER = "Select winner(s)"
    const val DIALOG_WIN_CONDITION = "Win condition"
    const val DIALOG_GAME_RULES = "Game rules"
    const val DIALOG_RESULTS = "Results"
    const val DIALOG_FINAL_DECISION = "Final decision"
}
