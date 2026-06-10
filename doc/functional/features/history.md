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
| **Handler** | `HistoryHandler` — no `handle()`, only `refresh()` |
| **State** | `List<MatchDisplay>` computed from repositories |

### MatchDisplay

| Field | Type | Description |
|-------|------|-------------|
| `match` | `Match` | Raw match data |
| `gameType` | `GameType?` | Resolved game type (null if type was deleted) |
| `players` | `Map<String, Player>` | All players including inactive |
| `playerLabels` | `Map<String, String>` | Display names: active → name, inactive+name → "Alice (supprimé)", inactive+blank → "Deleted player" |
| `winners` | `List<String>` | Winner player IDs |
| `dateFormatted` | `String` | Formatted date string |

## Screen: HistoryScreen

- List of match cards sorted by date descending
- Each card shows: game type name, date, per-player scores
- Winner is highlighted with bold + 🏆
- Deleted player names show one of:
  - `"Alice (supprimé)"` — if name was kept on delete
  - `"Deleted player"` — if name was erased (anonymized)

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
Then playerLabels["p1"] = "Alice (supprimé)"
```

### Player name resolution for anonymized players
```
Given a deleted player with active=false and name=""
And a match referencing that player
When HistoryHandler.refresh() is called
Then playerLabels[playerId] = "Deleted player"
```

## Mockup

```
┌─────────────────────────────┐
│  ┌───────────────────────┐  │
│  │ Belote    2026-06-10  │  │
│  │ Alice 🏆    10        │  │
│  │ Bob          5        │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │
│  │ Custom    2026-06-09  │  │
│  │ Alice (supprimé)   8  │  │
│  │ Deleted player     3  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```
