# History

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `GetMatchesUseCase` | — | `List<Match>` | Returns all stored matches |
| `GetGameTypesUseCase` | — | `List<GameType>` | Returns all game types |
| `GetPlayersUseCase` | `includeInactive = true` | `List<Player>` | Includes deleted players for name resolution |
| `DeleteMatchUseCase` | `matchId: String` | `Unit` | Deletes a match by ID; idempotent (no error if match not found) |

## MVI-style

| Component | Details |
|-----------|---------|
| **Reducer** | `historyReducer` — `src/ui/history/historyReducer.ts` (`loaded`, `showDeleteConfirm`, `deleteFailed`, `dismissDeleteConfirm`, `selectGameTypeFilter` actions), plus pure helper `buildScoreSummary(display)` building the per-player score-line parts (text + `isWinner`) rendered by `HistoryScreen` |
| **State** | `MatchDisplay[]` computed from repositories on mount |

Screen: `src/ui/history/HistoryScreen.tsx`.

### MatchDisplay

| Field | Type | Description |
|-------|------|-------------|
| `match` | `Match` | Raw match data |
| `gameType` | `GameType?` | Resolved game type (null if type was deleted) |
| `players` | `Map<String, Player>` | All players including inactive |
| `playerLabels` | `Map<String, String>` | Display names: active → name, inactive+name → "Alice (deleted)", inactive+blank → "Deleted player" |
| `winners` | `List<String>` | Winner player IDs |
| `dateFormatted` | `String` | Formatted date-time string: "YYYY-MM-DD HH:mm" in local timezone |
| `isTieBreakIndeterminate` | `Boolean` | True if historic match lacks tie-break data |

## Screen: HistoryScreen

- **Filter dropdown** at top: "Filter by game type" — shows all game types from loaded matches, or "All games" for no filter
- List of match rows (`ListItemRow`) sorted by date descending (most recent first), each spanning three lines:
  1. Game type name (`.list-item-name`)
  2. Per-player scores (`.list-item-players`), players separated by ` · `, winner(s) rendered in `<strong>` (all tied winners are bold)
  3. Match date **with time-of-day** (`.list-item-date`, HH:mm in local timezone)
- The winner(s) are read from `MatchDisplay.winners` (already computed by `loadDisplays`) — no extra use case call to build the row
- Each row has action icons:
  - ✏️ (Edit) — navigates to `ScoreDetailScreen` in edit mode to re-enter scores
  - 🗑 (Delete) — opens delete confirmation modal
- Deleted player names show one of:
   - `"Alice (deleted)"` — if name was kept on delete
   - `"Deleted player"` — if name was erased (anonymized)
- Empty state is context-aware:
   - If no matches at all: "No matches yet."
   - If filtered to a game type with no matches: "No matches for {gameName}"
- Matches with `isTieBreakIndeterminate = true` show:
    - **⚠️ Missing info** badge next to the game type name
    - Explanatory message below scores: *"This match was recorded before tie-break rules were introduced. The result is based on equality."*
- **Delete confirmation modal** (when 🗑 clicked):
   - Title: "Delete match?"
   - Shows: game type name, date, player scores
   - Warning: "Match data will be lost."
   - Buttons: "Cancel" | "Delete" (danger style)

## Functional Tests

### Match listing
```
Given 3 matches exist with dates 3000, 1000, 2000
When the History screen loads
Then matches are ordered: 3000, 2000, 1000
```

### Player name resolution for deleted players
```
Given a deleted player "Alice" with active=false and name="Alice"
And a match referencing player "p1"
When the History screen loads
Then playerLabels["p1"] = "Alice (deleted)"
```

### Player name resolution for anonymized players
```
Given a deleted player with active=false and name=""
And a match referencing that player
When the History screen loads
Then playerLabels[playerId] = "Deleted player"
```

### Date formatting with time
```
Given a match with timestamp 1672566300000L (2023-01-01 11:45:00 UTC)
When the History screen loads
Then dateFormatted matches pattern "YYYY-MM-DD HH:mm" in local timezone
```

### Score line rendering
```
Given a match between Alice (score 10) and Bob (score 5)
When the History screen loads
Then the row's second line reads "Alice 10 · Bob 5"
  And "Alice 10" is rendered in <strong> (Alice is the winner)
  And "Bob 5" is not bold
```

### Score line rendering on a tie
```
Given a match where Alice and Bob both scored 10
When the History screen loads
Then both "Alice 10" and "Bob 10" are rendered in <strong>
```

### Game type filter
```
Given 3 matches exist: m1 (gt1), m2 (gt2), m3 (gt1)
And HistoryScreen is rendered
When user selects "gt1" from filter dropdown
Then filtered display shows only m1 and m3
```

### Filter reset
```
Given a filter is active (selectedGameTypeFilter = "gt1")
When user selects "All games" from dropdown
Then selectedGameTypeFilter = null and all matches display
```

### Delete match confirmation
```
Given 2 matches m1 and m2 exist
When user clicks 🗑 on m1
Then confirmation modal appears showing:
  - "Delete match?" title
  - Game type name and date
  - Player scores list
  - "Match data will be lost" warning
  - Cancel and Delete buttons
```

### Delete match execution
```
Given confirmation modal is shown for match m1
When user clicks "Delete" button
Then m1 is deleted from repository
  And modal closes
  And match list refreshes (m1 is gone)
  And deleteConfirmMatchId is cleared
```

### Delete match cancel
```
Given confirmation modal is shown for match m1
When user clicks "Cancel" button
Then m1 is NOT deleted
   And modal closes
   And match list unchanged
```

### Edit match from history
```
Given HistoryScreen displays a match m1
When user clicks on the match card
Then navigation to ScoreDetailScreen in edit mode
   And match data is pre-loaded:
     - Game type: preserved
     - Players: preserved
     - Scores: reconstructed as 1 round with totals
     - Date field: prefilled with the match's existing date
     - Title changes to "Edit match"
   And user can modify scores, rounds and the match date
When user clicks "Finish match"
Then match is updated (overwrites original with same ID; date preserved unless the date field was changed, in which case only the calendar day changes)
   And navigation returns to Home
   And History reflects updated scores and, if changed, the new date and its position in the sort order
```

## Mockup

```
┌──────────────────────────────────────┐
│ Filter by game: [All games    ▼]    │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │ Belote                    🗑│    │
│  │ Alice 10 · Bob 5             │    │
│  │ 2026-06-10 14:30             │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ Custom                    🗑│    │
│  │ Alice (deleted) 8 · Deleted player 3 │
│  │ 2026-06-09 10:15             │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

*(Alice is rendered in bold in both rows above — she has the highest score in each match.)*
