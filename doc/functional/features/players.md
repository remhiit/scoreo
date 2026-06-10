# Players

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `AddPlayerUseCase` | `name: String` | `Player` | Generates UUID v4, sets `active = true` |
| `DeletePlayerUseCase` | `id: String, anonymize: Boolean = false` | `Unit` | Soft-delete (`active = false`). Optionally blanks `name` |
| `GetPlayersUseCase` | `includeInactive: Boolean = false` | `List<Player>` | Excludes inactive by default |
| `GetPlayerStatsUseCase` | — | `Map<String, PlayerStats>` | Computes wins/losses from all matches (regardless of player active status) |

## MVI

| Component | Details |
|-----------|---------|
| **Handler** | `PlayerHandler` — `src/commonMain/.../ui/player/PlayerHandler.kt` |
| **Intent** | `PlayerIntent`: `UpdateInput`, `AddPlayer`, `DeletePlayer`, `ShowDeleteConfirm`, `DismissDeleteConfirm` |
| **State** | `PlayerState`: `players`, `stats`, `inputName`, `error`, `deleteConfirmPlayerId` |

## Screen: PlayerScreen

- Text input + **Add** button to create a player
- List of active players with name + W/L stats + 🗑 delete button
- Delete confirmation modal with:
  - Warning: "Matches are preserved"
  - Checkbox: "Erase name from history" (controls `anonymize` flag)
  - **Cancel** / **Delete** buttons
- Called from `SetupScreen` (PLAYERS tab) and `HomeScreen` (inline add)

## Functional Tests

### Add a player
```
Given the Players screen is empty
When I type "Alice" and click Add
Then "Alice" appears in the list
And the input field is cleared
```

### Delete without anonymization
```
Given "Alice" exists and has 2 matches
When I click 🗑 then Delete (checkbox unchecked)
Then "Alice" disappears from Home and Setup
And "Alice (supprimé)" appears in history
And other players' stats are unchanged
```

### Delete with anonymization
```
Given "Alice" exists and has 2 matches
When I click 🗑, check "Erase name", then Delete
Then "Alice" disappears from Home and Setup
And "Deleted player" appears in history
```

### Delete non-existent id
```
Given no players exist
When I call DeletePlayerUseCase("non_existent")
Then no exception is thrown
```

## Mockup

```
┌─────────────────────────────┐
│  Players                    │
│  ┌──────────────────┬────┐  │
│  │ [Player name]    │Add│  │
│  └──────────────────┴────┘  │
│  ┌──────────────────┬───┐   │
│  │ Alice    2W 1L   │ 🗑│   │
│  ├──────────────────┼───┤   │
│  │ Bob      1W 2L   │ 🗑│   │
│  └──────────────────┴───┘   │
│  ┌─ Confirmation modal ───┐ │
│  │ Delete Alice ?         │ │
│  │ Matches are preserved. │ │
│  │ ☐ Erase name from     │ │
│  │    history             │ │
│  │    [Cancel]  [Delete]  │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```
