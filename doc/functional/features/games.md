# Games

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `AddGameTypeUseCase` | `name, winCondition, tieBreakRule = NONE, tieBreakCondition = HIGHEST_SCORE, tieBreakLabel = null` | `GameType` | Generates UUID v4 |
| `UpdateGameTypeUseCase` | `gameType: GameType` | `Unit` | Overwrites existing game type |
| `GetGameTypesUseCase` | — | `List<GameType>` | Returns all game types |
| `CreateMatchUseCase` | `gameTypeId, playerScores, date, manualWinners, secondaryPlayerScores` | `Match` | Validates players match scores list |

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
| **Reducer** | `gameTypeReducer` — `src/ui/gametype/gameTypeReducer.ts` |
| **Action** | `GameTypeAction`: `updateName`, `selectWinCondition`, `updateTieBreakRule`, `updateTieBreakCondition`, `updateTieBreakLabel`, `selectGame`, `deselectGame`, `addSucceeded`/`addFailed`, `editGameType`, `cancelEdit`, `updateSucceeded`/`updateFailed`, `showArchiveConfirm`, `archiveSucceeded`/`archiveFailed`, `dismissArchiveConfirm` |
| **State** | `GameTypeState`: `gameTypes`, `inputName`, `selectedWinCondition`, `selectedTieBreakRule`, `selectedTieBreakCondition`, `selectedTieBreakLabel`, `selectedGameId`, `editingGameId`, `error`, `archiveConfirmGameTypeId` |

Screen: `src/ui/gametype/GameTypeScreen.tsx`. See `doc/reference.md` for the full reducer table.

## Screen: GameTypeScreen

### List mode (default)
- List of game type cards sorted by creation order
- Each card shows name, win condition badge
- Each card has action icons:
  - 👁 (View) — opens detail modal
  - ✏️ (Edit) — opens edit form in modal
  - 🗑 (Archive/Delete) — opens archive confirmation modal

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
