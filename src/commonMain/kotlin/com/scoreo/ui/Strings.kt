package com.scoreo.ui

object Strings {
    // Buttons & Actions
    const val BTN_ADD = "Add"
    const val BTN_ADD_GAME_TYPE = "Add game type"
    const val BTN_ADD_GAME = "Add game"
    const val BTN_START_MATCH = "Start match"
    const val BTN_FINISH_MATCH = "Finish match"
    const val BTN_CANCEL = "Cancel"
    const val BTN_DISCARD = "Discard"
    const val BTN_DELETE = "Delete"
    const val BTN_CONFIRM = "Confirm"
    const val BTN_SAVE = "Save changes"
    const val BTN_EDIT = "Edit"
    const val BTN_ARCHIVE = "Archive"
    const val BTN_KEEP_TIE = "Keep tie"
    const val BTN_BACK = "Back"
    const val BTN_RESUME_MATCH = "Resume match in progress"
    const val BTN_FINAL_DECISION = "Final decision"
    const val BTN_KEEP_LOCAL = "Keep local"
    const val BTN_KEEP_REMOTE = "Keep remote"
    const val BTN_ERASE_NAME = "Erase name from history"
    const val BTN_NEW_MATCH = "▶ New Match"
    
    // Labels & Fields
    const val LABEL_PLAYER_NAME = "Player name"
    const val LABEL_GAME_TYPE = "Game type"
    const val LABEL_GAME_NAME = "Game name"
    const val LABEL_SELECT_GAME = "Select a game"
    const val LABEL_ADD_NEW_GAME = "Add new game"
    const val LABEL_SCORE = "Score"
    const val LABEL_STATS = "Stats"
    const val LABEL_LEADERBOARD = "Leaderboard"
    const val LABEL_HISTORY = "History"
    const val LABEL_WINNERS = "Winner(s)"
    const val LABEL_TIEBREAK_RULE = "Tie-break rule"
    const val LABEL_SECONDARY_SCORE = "Secondary score"
    const val LABEL_WIN_CONDITION = "Win condition"
    const val LABEL_INFO_MISSING = "Info missing"
    const val LABEL_SYNCING = "Syncing..."
    const val LABEL_SYNC_COMPLETE = "Sync complete"
    const val LABEL_SYNC_CONFLICT = "Sync conflict"
    const val LABEL_OFFLINE = "Offline"
    
    // Onboarding
    const val GUIDE_TITLE = "Getting started"
    const val GUIDE_STEP_1 = "Add players above"
    const val GUIDE_STEP_2 = "Create a game type (from the menu)"
    const val GUIDE_STEP_3 = "Select ≥2 players and click \"Start match\""
    
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
    const val MSG_ERROR_SELECT_GAME = "Please select a game"
    
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
    const val SCREEN_GAMES = "Game Types"
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
    const val DIALOG_ARCHIVE = "Archive {name}?"
    const val DIALOG_ARCHIVE_MESSAGE = "It will no longer appear in game selection."
    const val DIALOG_DISCARD_SCORES = "Discard scores?"
    const val DIALOG_DISCARD_MESSAGE = "All entered scores will be lost."
    
    // Game Type Details
    const val LABEL_WIN_CONDITION_DETAIL = "Win condition:"
    const val LABEL_TIE_BREAK_DETAIL = "Tie break:"
    const val LABEL_TIE_BREAK_CONDITION = "Tie break condition:"
    const val LABEL_TIE_BREAK_LABEL = "Tie break question:"
    const val LABEL_FORM_GAME_NAME = "Game name"
    const val MSG_GAME_NOT_FOUND = "Game not found."
    
    // History & Stats
    const val LABEL_HEAD_TO_HEAD = "Head-to-head"
    const val LABEL_ALL = "All"
    const val BTN_BACK_ARROW = "←"
    const val LABEL_FILTER_BY_GAME = "Filter by game:"
    const val LABEL_ALL_GAMES = "All games"
    const val LABEL_NO_MATCHES_FOR = "No matches for"
    const val BADGE_INFO_MISSING = "⚠️ Info missing"
    const val MSG_DELETE_MATCH = "Delete match?"
    const val TITLE_DELETE_MATCH = "Delete match"
    
    // Import & Sync
    const val MSG_SELECT_JSON = "Select a JSON file to import"
    const val LABEL_GAME_IMPORT = "Game:"
    const val LABEL_MATCHES_TO_IMPORT = "Matches to import:"
    const val BTN_IMPORT = "Import"
    const val BTN_DONE = "Done"
    const val BTN_DISMISS = "Dismiss"
    const val MSG_IMPORTED = "✅ {count} imported"
    const val MSG_SKIPPED = "⚠️ {count} skipped (duplicate IDs)"
    const val MSG_FAILED = "❌ {count} failed"
    const val LABEL_CLOUD_SYNC = "Cloud Sync"
    const val MSG_SYNC_DATA_GOOGLE = "Sync your data with Google Drive"
    const val BTN_CONNECT_GOOGLE = "Connect with Google"
    const val MSG_OFFLINE = "📡 Offline — changes will sync when reconnected"
}
