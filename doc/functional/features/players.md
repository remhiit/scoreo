# Players

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `AddPlayerUseCase` | `name: String` | `Player` | Generates UUID v4, sets `active = true` |
| `DeletePlayerUseCase` | `id: String, anonymize: Boolean = false` | `Unit` | Soft-delete (`active = false`). Optionally blanks `name` |
| `RenamePlayerUseCase` | `playerId: String, newName: String` | `Unit` | Updates player name by id (preserves UUID). Validates non-blank, max 50 chars. |
| `GetPlayersUseCase` | `includeInactive: Boolean = false` | `List<Player>` | Excludes inactive by default |
| `GetPlayerStatsUseCase` | — | `Map<String, PlayerStats>` | Computes wins/losses from all matches (regardless of player active status) |

## MVI

| Component | Details |
|-----------|---------|
| **Handler** | `PlayerHandler` — `src/commonMain/.../ui/player/PlayerHandler.kt` |
| **Intent** | `PlayerIntent`: `UpdateInput`, `AddPlayer`, `DeletePlayer`, `ShowDeleteConfirm`, `DismissDeleteConfirm`, `StartRename`, `UpdateRenameInput`, `ConfirmRename`, `CancelRename` |
| **State** | `PlayerState`: `players`, `stats`, `inputName`, `error`, `deleteConfirmPlayerId`, `renamingPlayerId`, `renameInput` |

## Screen: PlayerScreen

- Text input + **Add** button to create a player
- List of active players with name + W/L stats + ✏️ edit button + 🗑 delete button
- Edit mode (rename modal): clicking ✏️ opens a modal
  - Modal title: "Rename player: {oldName}"
  - Text input field with autofocus and primary-colored border
  - **Cancel** button (gray) → closes modal, no rename
  - **Confirm** button (primary) → saves rename, closes modal
  - Press Enter key in input field to confirm rename
  - Stats (W/L) remain unchanged and tied to player ID
  - Overlay click also closes modal (same as Cancel)
- Delete confirmation modal with:
  - Warning: "Matches are preserved"
  - Checkbox: "Erase name from history" (controls `anonymize` flag)
  - **Cancel** / **Delete** buttons
- Called from `HomeScreen` (inline add)

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
Then "Alice" disappears from Home
And "Alice (deleted)" appears in history
```

### Delete with anonymization
```
Given "Alice" exists and has 2 matches
When I click 🗑, check "Erase name", then Delete
Then "Alice" disappears from Home
And "Deleted player" appears in history
```

### Delete non-existent id
```
Given no players exist
When I call DeletePlayerUseCase("non_existent")
Then no exception is thrown
```

### Rename a player (fix typo)
```
Given "Aice" exists with 2W 1L record
When I click ✏️ to open the rename modal
And I see input field with "Aice" text selected/focused
And type "Alice"
And press Enter
Then the modal closes and the card shows "Alice" with same stats (2W 1L)
And player ID remains unchanged (preserved in stats)
```

### Cancel rename (discard changes)
```
Given the rename modal is open with input "Alycia"
When I click Cancel button
Then the modal closes, no rename is saved, card remains "Alice"
Or when the modal overlay is clicked (outside modal)
Then the modal closes (overlay click = implicit Cancel)
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
