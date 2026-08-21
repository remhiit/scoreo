# Games

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `AddGameTypeUseCase` | `name, winCondition, tieBreakRule = NONE, tieBreakCondition = HIGHEST_SCORE, tieBreakLabel = null` | `GameType` | Generates UUID v4 |
| `UpdateGameTypeUseCase` | `gameType: GameType` | `Unit` | Overwrites existing game type |
| `GetGameTypesUseCase` | — | `List<GameType>` | Returns all game types |
| `CreateMatchUseCase` | `gameTypeId, playerScores, date, manualWinners, secondaryPlayerScores` | `Match` | Validates players match scores list |
| `ArchiveGameTypeUseCase` | `gameTypeId: String` | `Unit` | Soft-delete (`active = false`); matches stay attached to it |
| `MergeGameTypesUseCase` | `preview(keptId, duplicateIds)` | `MergeGameTypesPreview` | Counts the matches played under the duplicates (`affectedMatches`) and reports whether any of them scores differently from the kept game type (`rulesDiffer`). Pure reads — no validation, no mutation |
| `MergeGameTypesUseCase` | `invoke(keptId, duplicateIds)` | `Unit` | Moves every match's `gameTypeId` onto the kept game type, clears a `MatchDraft` naming a duplicate, then hard-deletes each duplicate. Refuses a self-merge, an empty duplicate list, or an unknown id |

## TieBreakRule

| Value | Behavior |
|-------|----------|
| `NONE` | Equality is preserved (all tied players win) |
| `MANUAL_SELECTION` | User manually selects the winner(s) after the match ends |
| `SECONDARY_SCORE` | A secondary score (e.g. "number of cards in hand") is used to break the tie |

## WinCondition

| Value | Behavior |
|-------|----------|
| `HIGHEST_SCORE` | Player(s) with the highest total score win |
| `LOWEST_SCORE` | Player(s) with the lowest total score win |
| `MANUAL` | Player manually selects winner(s) after scoring |

## MVI-style

| Component | Details |
|-----------|---------|
| **Reducer** | `gameTypeReducer` — `apps/scoreo/src/ui/gametype/gameTypeReducer.ts` |
| **Action** | `GameTypeAction`: `updateName`, `selectWinCondition`, `updateTieBreakRule`, `updateTieBreakCondition`, `updateTieBreakLabel`, `selectGame`, `deselectGame`, `addSucceeded`/`addFailed`, `editGameType`, `cancelEdit`, `updateSucceeded`/`updateFailed`, `showArchiveConfirm`, `archiveSucceeded`/`archiveFailed`, `dismissArchiveConfirm`, `showMergeDialog`, `dismissMergeDialog`, `selectMergeKept`, `toggleMergeDuplicate`, `mergeSucceeded`/`mergeFailed` |
| **State** | `GameTypeState`: `gameTypes`, `allGameTypes`, `inputName`, `selectedWinCondition`, `selectedTieBreakRule`, `selectedTieBreakCondition`, `selectedTieBreakLabel`, `selectedGameId`, `editingGameId`, `error`, `archiveConfirmGameTypeId`, `showMergeDialog`, `mergeKeptId`, `mergeDuplicateIds`, `mergeError` |

Screen: `apps/scoreo/src/ui/gametype/GameTypeScreen.tsx`. See `doc/reference.md` for the full reducer table.

## Screen: GameTypeScreen

### List mode (default)
- List of game type cards sorted by creation order
- Each card shows name, win condition badge
- Each card has action icons:
  - 👁 (View) — opens detail modal
  - ✏️ (Edit) — opens edit form in modal
  - 🗑 (Archive/Delete) — opens archive confirmation modal

### Merge dialog
- "Merge" button under the list, shown as soon as at least 2 game types exist (archived ones included)
- One dropdown, **Game to keep**, then below it **Duplicates to remove**: the multi-select list (○/●) of every other game type. Several duplicates can be folded in one pass
- The game type picked as the one to keep is dropped from the duplicates list (and unticked if it was already ticked), so it can never be its own duplicate
- Both the dropdown and the list include archived game types, marked "(archived)" — a duplicate is often archived to hide it before the user thinks of merging
- Once a kept game type and at least one duplicate are picked, the dialog states how many matches will move
- **Merge** stays disabled until then
- Confirming moves every match from the duplicates onto the game type kept, then permanently deletes them (`GameTypeRepository.hardDelete`, unlike archiving)
- A draft match in progress that named a duplicate is discarded (its game type id no longer exists)
- If the kept game type was archived and any duplicate was active, the kept one is unarchived — otherwise the merge would hide the result
- **Warning, not a blocker**: if any selected duplicate doesn't score like the kept game type (`winCondition`, `tieBreakRule`, or `tieBreakCondition` under `SECONDARY_SCORE`), the dialog warns that the kept game type's rules will apply to the moved matches and may change their winners. Merging is still allowed — picking the target *is* picking the rules

### Detail view
- Shows: game name, win condition, tie-break rule, tie-break condition/label (if SECONDARY_SCORE)
- Each detail is a key/value row (`.detail-row`) justified to both edges, labels without a trailing colon, separated by a thin `border-bottom` (the last row has none)
- Back button → returns to list
- Edit button → switches to form mode with fields pre-filled
- Archive button (🗑 red) → opens archive confirmation modal

### Archive confirmation modal
- Title: "Are you sure you want to archive '{gameName}'?"
- Body: "This game type will be removed from the list."
- Cancel button → close modal, keep game active
- Archive button (red) → soft-delete game type (set `active=false`), refresh list, close modal

### Form mode (add / edit)
- Text input: game name
- Dropdown: win condition (HIGHEST_SCORE, LOWEST_SCORE, MANUAL)
- Dropdown: tie-break rule (NONE, MANUAL_SELECTION, SECONDARY_SCORE)
- If SECONDARY_SCORE: additional dropdown for tie-break condition + text input for label
- Button: "Add game type" (create mode) or "Save changes" + "Cancel" (edit mode)

## Functional Tests

### Add a game type
```
Given the Games screen is empty
When I type "Belote", select HIGHEST_SCORE, and click Add
Then "Belote" appears in the list with a "HIGHEST_SCORE" badge
```

### Game type with manual win condition
```
Given the Games screen is empty
When I type "Custom", select MANUAL, and click Add
Then a GameType with winCondition=MANUAL is saved
```

### Game type with tie-break rules
```
Given the Games screen is empty
When I type "Tarot", select HIGHEST_SCORE, SECONDARY_SCORE, "Number of cards"
Then a GameType with tieBreakRule=SECONDARY_SCORE is saved
```

### Edit a game type
```
Given a game "Belote" exists
When I select it, click Edit, change name to "Belote 2.0"
And click Save changes
Then the game type is updated
```

### Archive a game type
```
Given a game "Old Game" exists
When I select it, tap the (...) menu and click Archive
Then a confirmation modal appears: "Are you sure you want to archive 'Old Game'?"
And I click "Archive" to confirm
Then the game is removed from the list (soft-delete with active=false flag)
```

### Merge the duplicates created by an import
```
Given an import created "Belote " and "belote" alongside the existing "Belote"
And the two duplicates hold 3 matches between them
When I click "Merge", pick "Belote" as the game to keep, and tick both duplicates
Then the dialog reads "3 matches will move."
When I confirm
Then both duplicates are gone from the list and their 3 matches show under "Belote" in History
```

### Merge games with different rules
```
Given "Belote" scores HIGHEST_SCORE and one ticked duplicate scores LOWEST_SCORE
When both are selected
Then the dialog warns that the kept game's rules will apply and may change the winners
And the Merge button stays enabled
```

### Cancel archive
```
Given an archive confirmation modal is open
When I click "Cancel"
Then the modal closes and the game remains active
```

## JSON Schema

```json
{
  "id": "UUID v4",
  "name": "String",
  "winCondition": "HIGHEST_SCORE | LOWEST_SCORE | MANUAL",
  "tieBreakRule": "NONE | MANUAL_SELECTION | SECONDARY_SCORE",
  "tieBreakCondition": "HIGHEST_SCORE | LOWEST_SCORE | MANUAL",
  "tieBreakLabel": "String | null"
}
```
