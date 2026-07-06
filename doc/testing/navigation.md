# AppNavigator Tests

**File:** `src/commonTest/kotlin/com/scoreo/ui/navigation/AppNavigatorTest.kt`

**Class:** `AppNavigatorTest`

**Total Tests:** 41

## Overview

Pure JVM tests for **routing logic**: URL ↔ Screen mapping. Tests hash fragment parsing (`#/route/params`) and serialization back to hash URLs, without any DOM or Compose HTML dependencies.

## Architecture

### Pure Functions Tested

The test extracts and tests two pure functions from `AppNavigator`:

1. **`parseHash(hashFragment: String): Screen`**
   - Mirrors `AppNavigator.restoreFromHash()`
   - Parses URL hash (`#/route/...`) into a `Screen` object
   - Handles malformed input gracefully (fallback to `Screen.Home`)

2. **`screenToHash(screen: Screen): String`**
   - Mirrors `AppNavigator.toHash()`
   - Serializes a `Screen` object to a hash URL string
   - Always produces valid, predictable hashes

### Key Invariants

- `Screen` is moved to `commonMain` (pure data model, no DOM)
- `AppNavigator` in `jsMain` imports `Screen` from `commonMain`
- **Roundtrip guarantee:** `parseHash(screenToHash(screen).removePrefix("#")) == original screen`
- All 7 screen types tested (Home, History, Import, Stats, Games, Sync, ScoreDetail)

## Test Categories (41 Tests)

### Hash → Screen Parsing (10 tests)

Tests that hash fragments are correctly parsed into Screen objects:

- `parseHash_emptyHash_returnsHome()` — Empty string → Home
- `parseHash_rootSlash_returnsHome()` — "/" → Home
- `parseHash_historyRoute_returnsHistory()` — "history" → History
- `parseHash_statsRoute_returnsStats()` — "stats" → Stats
- `parseHash_importRoute_returnsImport()` — "import" → Import
- `parseHash_gamesRoute_returnsGames()` — "games" → Games
- `parseHash_syncRoute_returnsSync()` — "sync" → Sync
- `parseHash_scoreDetailNewMatch_singlePlayer()` — "score/gt1/alice" → ScoreDetail
- `parseHash_scoreDetailNewMatch_multiplePlayersCSV()` — "score/gt1/alice,bob,charlie" → ScoreDetail
- `parseHash_scoreDetailExistingMatch()` — "score/gt2/alice,bob/match123" → ScoreDetail

### Screen → Hash Serialization (7 tests)

Tests that Screen objects are correctly serialized to hash URLs:

- `toHash_home_producesRootHash()` — Home → "#/"
- `toHash_history_producesCorrectHash()` — History → "#/history"
- `toHash_stats_producesCorrectHash()` — Stats → "#/stats"
- `toHash_import_producesCorrectHash()` — Import → "#/import"
- `toHash_games_producesCorrectHash()` — Games → "#/games"
- `toHash_sync_producesCorrectHash()` — Sync → "#/sync"
- `toHash_scoreDetailExistingMatch()` — ScoreDetail → "#/score/gt2/alice,bob/match123"

### Roundtrip Idempotency (6 tests)

Tests that URL → Screen → URL maintains identity:

- `roundtrip_home_idempotent()` — Home cycles through hash correctly
- `roundtrip_history_idempotent()` — History cycles through hash correctly
- `roundtrip_scoreDetailNewMatch_idempotent()` — New match cycles correctly
- `roundtrip_scoreDetailExistingMatch_idempotent()` — Existing match cycles correctly
- `roundtrip_allScreenTypes_idempotent()` — All 7 types cycle correctly
- (Comprehensive coverage of all screen types in one parametrized test)

### Error Handling & Edge Cases (8 tests)

Tests robustness with malformed/edge-case inputs:

- `parseHash_scoreDetailMissingPlayerIds_fallsBackToHome()` — Incomplete score route falls back
- `parseHash_scoreDetailEmptyGameTypeId_fallsBackToHome()` — Empty gameTypeId falls back
- `parseHash_unknownRoute_fallsBackToHome()` — Unknown routes fall back gracefully
- `parseHash_extraSlashes_areIgnored()` — Extra slashes are handled (///history/// → History)
- `parseHash_gameTypeIdWithSpecialChars_preserved()` — Hyphens, underscores preserved
- `parseHash_playerIdWithSpecialChars_preserved()` — Special chars in player IDs preserved
- `parseHash_matchIdWithSpecialChars_preserved()` — Special chars in match IDs preserved
- `parseHash_playerIdListWithEmptyStrings_filtered()` — Empty strings in CSV filtered out

### ScoreDetail Details & Complex Routes (3 tests)

- `parseHash_scoreDetailWithExtraSegments_ignoresExtraSegments()` — Extra URL segments ignored
- `toHash_multiplePlayerIds_correctCSV()` — CSV generation correct for many players
- `toHash_singlePlayerCSV_noTrailingComma()` — No trailing commas in CSV

### Backward Compatibility (3 tests)

Tests schema evolution (optional matchId field):

- `backwardCompat_oldStyleHomeHash_recognized()` — "/" still recognized as Home
- `backwardCompat_scoreDetailNoMatchId_stillValid()` — Old URLs without matchId work
- `backwardCompat_scoreDetailWithMatchId_newFeature()` — New matchId param optional, works

## URL Scheme

### Screen Routes

| Screen | Hash | Format |
|---|---|---|
| **Home** | `#/` | Root only |
| **History** | `#/history` | No params |
| **Stats** | `#/stats` | No params |
| **Import** | `#/import` | No params |
| **Games** | `#/games` | No params |
| **Sync** | `#/sync` | No params |
| **ScoreDetail (new)** | `#/score/{gameTypeId}/{playerIds,csv}` | 3 segments |
| **ScoreDetail (edit)** | `#/score/{gameTypeId}/{playerIds,csv}/{matchId}` | 4 segments |

### Examples

- New match: `#/score/gt1/alice,bob`
- Edit existing: `#/score/gt1/alice,bob/match-123-abc`
- Multiple players: `#/score/game-type/p1,p2,p3`

## Key Design Decisions

1. **Pure logic extraction:** Hash parsing/serialization logic is testable without mocking `window` or DOM
2. **Moved to commonMain:** `Screen` sealed class is now platform-independent (cross-platform)
3. **CSV for player lists:** Comma-separated list for simple URL encoding (no special chars needed for player IDs)
4. **Optional matchId:** 4th segment is optional; null → new match, value → edit mode
5. **Fallback strategy:** Invalid routes → Screen.Home (graceful degradation)

## Running Tests

```bash
# Run all navigation tests
./gradlew jvmTest --tests "*AppNavigatorTest*"

# Or (project-specific):
./gradlew allTests
```

## Maintenance Notes

- If adding new Screen types, add corresponding `toHash` and `parseHash` cases
- If modifying ScoreDetail parameters, update roundtrip tests
- Keep helper functions (`parseHash`, `screenToHash`) in sync with `AppNavigator` methods
- Test file is in `src/commonTest/` (JVM-testable, no JS-specific code)
