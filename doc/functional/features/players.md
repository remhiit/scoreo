# Players

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `AddPlayerUseCase` | `name: String` | `Player` | Generates UUID v4, sets `active = true` |
| `DeletePlayerUseCase` | `id: String, anonymize: Boolean = false` | `Unit` | Soft-delete (`active = false`). Optionally blanks `name` |
| `RenamePlayerUseCase` | `playerId: String, newName: String` | `Unit` | Updates player name by id (preserves UUID). Validates non-blank, max 50 chars. |
| `GetPlayersUseCase` | `includeInactive: Boolean = false` | `List<Player>` | Excludes inactive by default |
| `GetPlayerStatsUseCase` | — | `Map<String, PlayerStats>` | Computes wins/losses from all matches (regardless of player active status) |
| `CleanupInactivePlayersUseCase` | `preview()` / `execute()` | `List<Player>` | Finds inactive players referenced by no match (neither `playerScores` nor `secondaryPlayerScores`); `execute()` hard-deletes them via `PlayerRepository.hardDelete` and returns the deleted list |
| `MergePlayersUseCase` | `preview(keptId, duplicateIds)` | `MergePlayersPreview` | Counts the matches referencing at least one duplicate (`affectedMatches`) and those referencing two or more members of the group `[keptId, ...duplicateIds]` (`conflictingMatches`). Pure counting — no validation, no mutation |
| `MergePlayersUseCase` | `invoke(keptId, duplicateIds)` | `Unit` | Moves every match reference to any duplicate (`playerScores`, `secondaryPlayerScores`, `rounds`, `manualWinners`) onto the kept player, clears a `MatchDraft` naming a duplicate, then hard-deletes each duplicate. Refuses a self-merge, an empty duplicate list, an unknown id, or any match involving two members of the group |

## MVI-style

| Component | Details |
|-----------|---------|
| **Reducer** | `playerReducer` — `apps/scoreo/src/ui/home/playerReducer.ts` |
| **Action** | `PlayerAction`: `updateInput`, `addSucceeded`/`addFailed`, `showDeleteConfirm`, `dismissDeleteConfirm`, `deleted`, `startRename`, `updateRenameInput`, `renameSucceeded`/`renameFailed`, `cancelRename`, `showCleanupConfirm`, `dismissCleanupConfirm`, `cleanupCompleted`, `showMergeDialog`, `dismissMergeDialog`, `selectMergeKept`, `toggleMergeDuplicate`, `mergeSucceeded`/`mergeFailed` |
| **State** | `PlayerState`: `players`, `allPlayers`, `stats`, `trophyCounts`, `inputName`, `error`, `deleteConfirmPlayerId`, `renamingPlayerId`, `renameInput`, `cleanupCandidates`, `showCleanupConfirm`, `showMergeDialog`, `mergeKeptId`, `mergeDuplicateIds`, `mergeError` |

Screen: `apps/scoreo/src/ui/home/HomeScreen.tsx`. See `doc/reference.md` for the full reducer table.

## Screen: PlayerScreen

- Text input + **Add** button to create a player
- List of active players with name + W/L stats + trophy count badge + ✏️ edit button + 🗑 delete button
- Trophy count badge (🏆 N, at the end of the row's selectable zone):
  - Shown only for a player holding at least one trophy — no badge, not a "0", for the others
  - Counts the badges of [`stats.md`](stats.md#player-detail)'s per-player trophy list: an ex aequo holder counts the trophy like a sole holder, and a trophy held twice (the D1 game record on two game types, or F3's monthly champion — 5 months won counts as +5) counts twice/N times
  - Recomputed after every player mutation (add, delete, rename, cleanup), like the W/L stats
  - Home shows the count only; which trophies they are stays on the Stats player detail
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
- "Merge" button (shown as soon as at least 2 players exist, soft-deleted ones included — next to "Clean up" in the same row under the list): opens the merge dialog
  - One dropdown, **Player to keep**, then below it **Duplicates to remove**: the multi-select list (○/●) of every other player. Several duplicates can be folded in one pass — an import can spell the same person three ways
  - The player picked as the one to keep is dropped from the duplicates list (and unticked if it was already ticked), so it can never be its own duplicate
  - Both the dropdown and the list include soft-deleted players, marked "(deleted)" — an import can duplicate a player who was already deleted
  - Once a kept player and at least one duplicate are picked, the dialog states how many matches will move
  - **Merge** stays disabled until then
  - Confirming moves every reference to each duplicate (match scores, tie-break scores, per-round scores, manual winners) onto the player kept, then permanently deletes the duplicates. Wins/losses, ELO and trophies are recomputed from the merged history
  - A draft match in progress that named a duplicate is discarded (its player id no longer exists)
  - If the kept player was soft-deleted and any duplicate was active, the kept player becomes active again — otherwise the merge would hide the result
  - **Blocked case**: if any match has two of the selected players facing each other — the kept player against a duplicate, or two duplicates against each other — the dialog says so in red and **Merge** stays disabled; merging would make someone play against themselves. Leaving the opponent out of the selection unblocks it
- "Clean up (N)" button (only shown when `CleanupInactivePlayersUseCase.preview()` returns at least one player, `N` being that count): opens a confirmation modal listing the eligible players by name
  - **Cancel** closes the modal, deletes nothing
  - **Delete permanently** hard-deletes every listed player (`PlayerRepository.hardDelete`, irreversible) and closes the modal
  - Recomputed after every player mutation (add/soft-delete/rename), so a player soft-deleted with no match immediately makes the button appear
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

### Clean up inactive players with no match
```
Given "Alice" exists and has 2 matches, and "Bob" was deleted (soft) with no match ever recorded
When the Home screen loads
Then the "Clean up (1)" button is visible
When I click it, then "Delete permanently" in the confirmation modal
Then "Bob" is permanently removed from storage (not just marked inactive)
And "Alice" is unaffected, the "Clean up" button disappears
```

### Merge the duplicates created by an import
```
Given an import created "Jean Luc" and "JeanLuc" alongside the existing "Jean-Luc"
And "Jean Luc" holds 2 matches, "JeanLuc" holds 1, "Jean-Luc" holds 0
When I click "Merge", pick "Jean-Luc" as the player to keep, and tick both duplicates
Then the dialog reads "3 matches will move."
When I confirm
Then both duplicates are gone from Home and their 3 matches now count for "Jean-Luc"
And the history/stats show a single player with the combined record
```

### Merge blocked by a shared match
```
Given "Jean Luc" and "JeanLuc" played against each other in one match
When I pick "Jean-Luc" as the player to keep and tick both of them
Then the dialog warns that 1 match already has two of the selected players facing each other
And the Merge button is disabled
When I untick "JeanLuc"
Then the warning clears and the merge can proceed for "Jean Luc" alone
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
