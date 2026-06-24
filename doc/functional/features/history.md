# History

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `GetMatchesUseCase` | — | `List<Match>` | Returns all stored matches |
| `GetGameTypesUseCase` | — | `List<GameType>` | Returns all game types |
| `GetPlayersUseCase` | `includeInactive = true` | `List<Player>` | Includes deleted players for name resolution |

## MVI

| Component | Details |
|-----------|---------|
| **Handler** | `HistoryHandler` — `handle(HistoryIntent.Refresh)` |
| **State** | `List<MatchDisplay>` computed from repositories |

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
- List of match cards sorted by date descending (most recent first)
- Each card shows: game type name, date **with time-of-day** (HH:mm in local timezone), per-player scores
- Winner is highlighted with bold + 🏆
- Deleted player names show one of:
  - `"Alice (deleted)"` — if name was kept on delete
  - `"Deleted player"` — if name was erased (anonymized)
- Empty state is context-aware:
  - If no matches at all: "No matches yet."
  - If filtered to a game type with no matches: "No matches for {gameName}"
- Matches with `isTieBreakIndeterminate = true` show:
  - **⚠️ Info manquante** badge next to the game type name
  - Explanatory message below scores: *"Ce match a été enregistré avant la mise en place des règles de départage. Le résultat est basé sur l'égalité."*

## Functional Tests

### Match listing
```
Given 3 matches exist with dates 3000, 1000, 2000
When HistoryHandler.refresh() is called
Then matches are ordered: 3000, 2000, 1000
```

### Player name resolution for deleted players
```
Given a deleted player "Alice" with active=false and name="Alice"
And a match referencing player "p1"
When HistoryHandler.refresh() is called
Then playerLabels["p1"] = "Alice (deleted)"
```

### Player name resolution for anonymized players
```
Given a deleted player with active=false and name=""
And a match referencing that player
When HistoryHandler.refresh() is called
Then playerLabels[playerId] = "Deleted player"
```

### Date formatting with time
```
Given a match with timestamp 1672566300000L (2023-01-01 11:45:00 UTC)
When HistoryHandler.refresh() is called
Then dateFormatted matches pattern "YYYY-MM-DD HH:mm" in local timezone
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

## Mockup

```
┌──────────────────────────────────────┐
│ Filter by game: [All games    ▼]    │
├──────────────────────────────────────┤
│  ┌──────────────────────────────┐    │
│  │ Belote   2026-06-10 14:30  🗑│    │
│  │ Alice 🏆       10           │    │
│  │ Bob             5           │    │
│  └──────────────────────────────┘    │
│  ┌──────────────────────────────┐    │
│  │ Custom   2026-06-09 10:15  🗑│    │
│  │ Alice (deleted)        8    │    │
│  │ Deleted player         3    │    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```
