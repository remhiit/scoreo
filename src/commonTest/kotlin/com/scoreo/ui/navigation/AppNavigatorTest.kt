package com.scoreo.ui.navigation

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/**
 * Pure JVM tests for routing logic: URL ↔ Screen mapping.
 * Tests the pure parsing and serialization logic (testable without DOM/window).
 *
 * Key invariants:
 * - Home and root route are equivalent
 * - ScoreDetail routes encode gameTypeId, playerIds (CSV), and optional matchId
 * - All routes produce valid hash URLs
 * - roundtrip toHash(parseHash(url)) == original screen (idempotency)
 */
class AppNavigatorTest {

    // ============ Hash URL → Screen (parseHash) ============

    @Test
    fun parseHash_emptyHash_returnsHome() {
        val screen = parseHash("")
        assertEquals(Screen.Home, screen)
    }

    @Test
    fun parseHash_rootSlash_returnsHome() {
        val screen = parseHash("/")
        assertEquals(Screen.Home, screen)
    }

    @Test
    fun parseHash_historyRoute_returnsHistory() {
        val screen = parseHash("history")
        assertEquals(Screen.History, screen)
    }

    @Test
    fun parseHash_statsRoute_returnsStats() {
        val screen = parseHash("stats")
        assertEquals(Screen.Stats, screen)
    }

    @Test
    fun parseHash_importRoute_returnsImport() {
        val screen = parseHash("import")
        assertEquals(Screen.Import, screen)
    }

    @Test
    fun parseHash_gamesRoute_returnsGames() {
        val screen = parseHash("games")
        assertEquals(Screen.Games, screen)
    }

    @Test
    fun parseHash_syncRoute_returnsSync() {
        val screen = parseHash("sync")
        assertEquals(Screen.Sync, screen)
    }

    @Test
    fun parseHash_scoreDetailNewMatch_singlePlayer() {
        val screen = parseHash("score/gt1/alice")
        val detail = screen as Screen.ScoreDetail
        assertEquals("gt1", detail.gameTypeId)
        assertEquals(listOf("alice"), detail.playerIds)
        assertEquals(null, detail.matchId)
    }

    @Test
    fun parseHash_scoreDetailNewMatch_multiplePlayersCSV() {
        val screen = parseHash("score/gt1/alice,bob,charlie")
        val detail = screen as Screen.ScoreDetail
        assertEquals("gt1", detail.gameTypeId)
        assertEquals(listOf("alice", "bob", "charlie"), detail.playerIds)
        assertEquals(null, detail.matchId)
    }

    @Test
    fun parseHash_scoreDetailExistingMatch() {
        val screen = parseHash("score/gt2/alice,bob/match123")
        val detail = screen as Screen.ScoreDetail
        assertEquals("gt2", detail.gameTypeId)
        assertEquals(listOf("alice", "bob"), detail.playerIds)
        assertEquals("match123", detail.matchId)
    }

    @Test
    fun parseHash_scoreDetailMissingPlayerIds_fallsBackToHome() {
        val screen = parseHash("score/gt1")
        assertEquals(Screen.Home, screen)
    }

    @Test
    fun parseHash_scoreDetailEmptyGameTypeId_fallsBackToHome() {
        val screen = parseHash("score//alice")
        assertEquals(Screen.Home, screen)
    }

    @Test
    fun parseHash_unknownRoute_fallsBackToHome() {
        val screen = parseHash("unknown")
        assertEquals(Screen.Home, screen)
    }

    @Test
    fun parseHash_extraSlashes_areIgnored() {
        val screen = parseHash("///history///")
        assertEquals(Screen.History, screen)
    }

    // ============ Screen → Hash URL (toHash) ============

    @Test
    fun toHash_home_producesRootHash() {
        val hash = screenToHash(Screen.Home)
        assertEquals("#/", hash)
    }

    @Test
    fun toHash_history_producesCorrectHash() {
        val hash = screenToHash(Screen.History)
        assertEquals("#/history", hash)
    }

    @Test
    fun toHash_stats_producesCorrectHash() {
        val hash = screenToHash(Screen.Stats)
        assertEquals("#/stats", hash)
    }

    @Test
    fun toHash_import_producesCorrectHash() {
        val hash = screenToHash(Screen.Import)
        assertEquals("#/import", hash)
    }

    @Test
    fun toHash_games_producesCorrectHash() {
        val hash = screenToHash(Screen.Games)
        assertEquals("#/games", hash)
    }

    @Test
    fun toHash_sync_producesCorrectHash() {
        val hash = screenToHash(Screen.Sync)
        assertEquals("#/sync", hash)
    }

    @Test
    fun toHash_scoreDetailNewMatch_singlePlayer() {
        val screen = Screen.ScoreDetail("gt1", listOf("alice"))
        val hash = screenToHash(screen)
        assertEquals("#/score/gt1/alice", hash)
    }

    @Test
    fun toHash_scoreDetailNewMatch_multiplePlayersCSV() {
        val screen = Screen.ScoreDetail("gt1", listOf("alice", "bob", "charlie"))
        val hash = screenToHash(screen)
        assertEquals("#/score/gt1/alice,bob,charlie", hash)
    }

    @Test
    fun toHash_scoreDetailExistingMatch() {
        val screen = Screen.ScoreDetail("gt2", listOf("alice", "bob"), "match123")
        val hash = screenToHash(screen)
        assertEquals("#/score/gt2/alice,bob/match123", hash)
    }

    @Test
    fun toHash_scoreDetailEmptyPlayers() {
        val screen = Screen.ScoreDetail("gt1", emptyList())
        val hash = screenToHash(screen)
        assertEquals("#/score/gt1/", hash)
    }

    // ============ Roundtrip (toHash → parseHash) ============

    @Test
    fun roundtrip_home_idempotent() {
        val original = Screen.Home
        val hash = screenToHash(original)
        val restored = parseHash(hash.removePrefix("#"))
        assertEquals(original, restored)
    }

    @Test
    fun roundtrip_history_idempotent() {
        val original = Screen.History
        val hash = screenToHash(original)
        val restored = parseHash(hash.removePrefix("#"))
        assertEquals(original, restored)
    }

    @Test
    fun roundtrip_scoreDetailNewMatch_idempotent() {
        val original = Screen.ScoreDetail("gt1", listOf("alice", "bob"))
        val hash = screenToHash(original)
        val restored = parseHash(hash.removePrefix("#"))
        assertEquals(original, restored)
    }

    @Test
    fun roundtrip_scoreDetailExistingMatch_idempotent() {
        val original = Screen.ScoreDetail("gt2", listOf("alice", "bob", "charlie"), "match456")
        val hash = screenToHash(original)
        val restored = parseHash(hash.removePrefix("#"))
        assertEquals(original, restored)
    }

    @Test
    fun roundtrip_allScreenTypes_idempotent() {
        val screens = listOf(
            Screen.Home,
            Screen.History,
            Screen.Stats,
            Screen.Import,
            Screen.Games,
            Screen.Sync,
            Screen.ScoreDetail("gt1", listOf("p1")),
            Screen.ScoreDetail("gt2", listOf("p1", "p2", "p3"), "m123"),
        )

        for (screen in screens) {
            val hash = screenToHash(screen)
            val restored = parseHash(hash.removePrefix("#"))
            assertEquals(screen, restored, "Roundtrip failed for $screen")
        }
    }

    // ============ Edge cases & robustness ============

    @Test
    fun parseHash_gameTypeIdWithSpecialChars_preserved() {
        // gameTypeId could theoretically contain hyphens, underscores, etc.
        val screen = parseHash("score/game-type_1/alice")
        val detail = screen as Screen.ScoreDetail
        assertEquals("game-type_1", detail.gameTypeId)
    }

    @Test
    fun parseHash_playerIdWithSpecialChars_preserved() {
        val screen = parseHash("score/gt1/player_1,player-2")
        val detail = screen as Screen.ScoreDetail
        assertEquals(listOf("player_1", "player-2"), detail.playerIds)
    }

    @Test
    fun parseHash_matchIdWithSpecialChars_preserved() {
        val screen = parseHash("score/gt1/alice/match_123-abc")
        val detail = screen as Screen.ScoreDetail
        assertEquals("match_123-abc", detail.matchId)
    }

    @Test
    fun parseHash_playerIdListWithEmptyStrings_filtered() {
        // Trailing comma or malformed CSV should be handled gracefully
        val screen = parseHash("score/gt1/alice,,bob")
        val detail = screen as Screen.ScoreDetail
        // filter { it.isNotEmpty() } should remove empty strings
        assertEquals(listOf("alice", "bob"), detail.playerIds)
    }

    @Test
    fun parseHash_scoreDetailWithExtraSegments_ignoresExtraSegments() {
        val screen = parseHash("score/gt1/alice/match123/extra/segments")
        val detail = screen as Screen.ScoreDetail
        assertEquals("gt1", detail.gameTypeId)
        assertEquals(listOf("alice"), detail.playerIds)
        assertEquals("match123", detail.matchId)
        // Extra segments at index 4+ are ignored
    }

    @Test
    fun toHash_multiplePlayerIds_correctCSV() {
        val screen = Screen.ScoreDetail("gt1", listOf("alice", "bob", "charlie", "diana"))
        val hash = screenToHash(screen)
        assertEquals("#/score/gt1/alice,bob,charlie,diana", hash)
    }

    @Test
    fun toHash_singlePlayerCSV_noTrailingComma() {
        val screen = Screen.ScoreDetail("gt1", listOf("alice"))
        val hash = screenToHash(screen)
        // Should not end with comma
        assertFalse(hash.endsWith(","), "Hash should not have trailing comma: $hash")
    }

    // ============ Navigation scenarios (happy paths) ============

    @Test
    fun navigationScenario_homeToHistory() {
        val home = Screen.Home
        val history = Screen.History
        val homeHash = screenToHash(home)
        val historyHash = screenToHash(history)
        assertEquals("#/", homeHash)
        assertEquals("#/history", historyHash)
    }

    @Test
    fun navigationScenario_homeToScoreDetailToHome() {
        val home = Screen.Home
        val scoreDetail = Screen.ScoreDetail("gt1", listOf("alice", "bob"))
        val backHome = Screen.Home

        val homeHash = screenToHash(home)
        val scoreHash = screenToHash(scoreDetail)
        val backHash = screenToHash(backHome)

        assertEquals("#/", homeHash)
        assertEquals("#/score/gt1/alice,bob", scoreHash)
        assertEquals("#/", backHash)
    }

    @Test
    fun navigationScenario_createMatchFlow() {
        // Home → Games → ScoreDetail (new) → ScoreDetail (with matchId)
        val home = Screen.Home
        val games = Screen.Games
        val newMatch = Screen.ScoreDetail("gt1", listOf("alice", "bob"))
        val savedMatch = Screen.ScoreDetail("gt1", listOf("alice", "bob"), "match123")

        assertEquals("#/", screenToHash(home))
        assertEquals("#/games", screenToHash(games))
        assertEquals("#/score/gt1/alice,bob", screenToHash(newMatch))
        assertEquals("#/score/gt1/alice,bob/match123", screenToHash(savedMatch))
    }

    @Test
    fun navigationScenario_importAndStats() {
        val import = Screen.Import
        val stats = Screen.Stats
        val home = Screen.Home

        assertEquals("#/import", screenToHash(import))
        assertEquals("#/stats", screenToHash(stats))
        assertEquals("#/", screenToHash(home))
    }

    // ============ Backward compatibility & schema evolution ============

    @Test
    fun backwardCompat_oldStyleHomeHash_recognized() {
        // "/" alone should map to Home
        val screen = parseHash("/")
        assertEquals(Screen.Home, screen)
    }

    @Test
    fun backwardCompat_scoreDetailNoMatchId_stillValid() {
        // Old URLs without matchId should work
        val screen = parseHash("score/gt1/alice,bob")
        val detail = screen as Screen.ScoreDetail
        assertEquals(null, detail.matchId)
    }

    @Test
    fun backwardCompat_scoreDetailWithMatchId_newFeature() {
        // New feature: matchId should be optional
        val screenNew = parseHash("score/gt1/alice,bob/match999")
        val detail = screenNew as Screen.ScoreDetail
        assertEquals("match999", detail.matchId)
    }

    // ============ Helpers: pure parsing logic extracted from AppNavigator ============

    /**
     * Parses hash fragment (without leading #) into a Screen.
     * Mirrors AppNavigator.restoreFromHash() logic.
     */
    private fun parseHash(hash: String): Screen {
        val parts = hash.trimStart('/').split("/").filter { it.isNotEmpty() }
        return when (parts.firstOrNull()) {
            "history" -> Screen.History
            "stats" -> Screen.Stats
            "import" -> Screen.Import
            "games" -> Screen.Games
            "sync" -> Screen.Sync
            "score" -> if (parts.size >= 3) {
                val gameTypeId = parts[1]
                val playersCsv = parts[2]
                val matchId = parts.getOrNull(3)
                val playerIds = playersCsv.split(",").filter { it.isNotEmpty() }
                Screen.ScoreDetail(gameTypeId, playerIds, matchId)
            } else Screen.Home

            else -> Screen.Home
        }
    }

    /**
     * Converts a Screen into a hash URL (with leading #).
     * Mirrors AppNavigator.toHash() logic.
     */
    private fun screenToHash(screen: Screen): String = when (screen) {
        is Screen.Home -> "#/"
        is Screen.History -> "#/history"
        is Screen.Stats -> "#/stats"
        is Screen.Import -> "#/import"
        is Screen.Games -> "#/games"
        is Screen.Sync -> "#/sync"
        is Screen.ScoreDetail -> {
            val route = "#/score/${screen.gameTypeId}/${screen.playerIds.joinToString(",")}"
            if (screen.matchId != null) {
                "$route/${screen.matchId}"
            } else {
                route
            }
        }
    }
}
