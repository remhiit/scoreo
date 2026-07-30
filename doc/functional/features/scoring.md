# Scoring

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `CreateMatchUseCase` | `gameTypeId, playerScores, date, manualWinners, secondaryPlayerScores` | `Match` | Saves match; returns `Result<Match>` |

## MVI-style

| Component | Details |
|-----------|---------|
| **Reducer** | `scoreDetailReducer` — `src/ui/scoredetail/scoreDetailReducer.ts` |
| **Action** | `ScoreDetailAction`: `setViewMode`, `updateScore`, `addRound`, `removeRound`, `cancelImmediate`, `showCancelConfirm`, `confirmCancel`, `dismissCancelConfirm`, `validationFailed`, `openWinnerModal`, `openManualSelectionDialog`, `openSecondaryScoreDialog`, `saved`, `saveFailed`, `dismissModal`, `toggleModalWinner`, `confirmWinnersEmptyError`, `updateSecondaryScoreInput`, `secondaryScoreInvalid`, `secondaryScoreEscalate`, `toggleManualSelectionWinner`, `manualWinnersEmptyError`, `dismissTieBreak` |
| **State** | `ScoreDetailState`: `gameType`, `players`, `rounds`, `viewMode`, `showWinnerModal`, `modalWinners`, `showSecondaryScoreDialog`, `tiedPlayerIds`, `secondaryScoreInputs`, `showManualSelectionDialog`, `manualSelectionWinners`, `collectedSecondaryScores`, `error`, `saved`, `cancelled`, `editingMatchId`, `showCancelConfirm` |

Screen: `src/ui/scoredetail/ScoreDetailScreen.tsx`. See `doc/reference.md` for the full reducer table.

## Screen: ScoreDetailScreen

### Top bar
- Title: "Score Detail" (new match) or "Edit match" (editing mode)
- Back button:
  - If new match: returns to Home
  - If editing: returns to History
- Cancel button: Opens cancel confirmation modal if scores are entered; closes screen without saving otherwise

### View switch: Standings / History

A segmented control (`Standings` / `History`) sits above the content. `viewMode` defaults to `standings`. Round entry (adding/removing rounds, editing a cell) only happens in the **History** tab — switching tabs doesn't lose any entered scores, since both views read the same `rounds` state.

### Standings view (default)

A 2-column card grid (`.gs-grid`), one `.gs-card` per player, holding any headcount (tested up to 8 players) without horizontal scrolling:

```
┌─────────────┬─────────────┐
│ 1  Alice    │ 2  Bob      │
│ 18       +8 │ 17       +5 │
├─────────────┼─────────────┤
│ 3  Carl     │ 4  Dana     │
│ 12       +2 │  9       +1 │
└─────────────┴─────────────┘
```

- A hint line above the grid states how many rounds have been played and the win direction (e.g. "After 3 rounds · highest score leads").
- Cards are ranked by `gameType.winCondition` (`HIGHEST_SCORE` descending, `LOWEST_SCORE` ascending); players tied on total share the same rank.
- The card's bottom-right number is the delta: the score entered in the **last** round only (not the cumulative total).
- The leading card(s) — rank 1, possibly several on a tie — get an accented border/total (`.gs-card--lead`).
- This view is read-only: no inputs, no add/remove-round controls.

### History view: columns = players, rows = rounds + totals row.

| Player 1 | Player 2 | ... |
|----------|----------|-----|
| `[10]`   | `[5]`    | round 1 |
| `[8]`    | `[12]`   | round 2 |
| **18**   | **17**   | totals |
| ✕        | ✕        | delete round |

- Editable score cells with numeric input
- **✕** button on each round row to remove it
- **＋ Add round** button at the bottom

### Bottom bar

- **Finish match** to save (also auto-saves to localStorage as MatchDraft after each score update)
- **Cancel match**
- Pinned to the bottom of the screen (`.bottom-bar`), visible from both the Standings and History views.
- For `MANUAL` win condition: modal appears listing each player's total as a selectable row (○/●) to select winner(s)

### Cancel confirmation
When clicking **Cancel** with scores already entered:
- A confirmation modal appears: "Discard unsaved scores?"
- **Discard** button (red) → closes screen without saving, clears MatchDraft
- **Resume** button (primary) → closes modal, stays in scoring

When clicking **Cancel** with no scores entered:
- Screen closes immediately (no confirmation needed)

### Tie-break resolution flow

When a tie is detected (multiple players have the same top/lowest score), the system follows the game type's `tieBreakRule`:

1. **NONE** → All tied players are winners (equality preserved)
2. **MANUAL_SELECTION** → A **ManualSelectionDialog** appears immediately with selectable rows (○/●) to select winners among tied players
3. **SECONDARY_SCORE** → A **SecondaryScoreDialog** appears:
   - Title uses `tieBreakLabel` (e.g. "Number of cards ?")
   - One numeric input per tied player
   - On submit: if the secondary score breaks the tie → match saved
   - If the tie persists → escalates to **ManualSelectionDialog**

The **ManualSelectionDialog** offers:
- Selectable rows (○/●, `ListItemRow`) to select one or more winners
- "Keep tie" button to preserve equality (all tied win)
- Confirm button to finalize

## Edit Mode

When navigating to `ScoreDetailScreen` with a `matchId` parameter (from History), the screen loads the existing match and enters edit mode.

### Data Reconstruction

All matches are stored with `playerScores` (total score per player). When editing, rounds are reconstructed as 1 round containing these totals. User can then split into multiple rounds or edit the single-round total as desired.

### Workflow

1. User clicks match card in History
2. `ScoreDetailScreen` loads match + reconstructs as 1 round with totals
3. Title changes to "Edit match"
4. User edits rounds/scores
5. Clicks "Finish match" (button text unchanged, intent same)
6. Calls `UpdateMatchUseCase` instead of `CreateMatchUseCase`
7. Match overwritten (id preserved, date preserved)
8. Returns to Home after successful save

## Functional Tests

### Score entry
```
Given a game with players Alice and Bob
When I enter "10" for Alice and "5" for Bob in round 1
And I click "Finish match"
Then a Match is saved with Alice=10, Bob=5
```

### Add and remove a round
```
Given a game with 2 players and 1 round
When I click "＋ Add round"
Then a second empty round appears
When I click "✕" on the second round
Then I'm back to 1 round
```

### Manual winner selection
```
Given a game with MANUAL win condition
And Alice has 10, Bob has 5
When I click "Finish match"
Then a modal appears showing both players' totals as selectable rows
And I can select Alice as winner
When I confirm
Then the match is saved with manualWinners=["Alice"]
```

### Tie-break with secondary score
```
Given a game with SECONDARY_SCORE tie-break rule
And Alice and Bob both have 10 points
When I click "Finish match"
Then a SecondaryScoreDialog appears with label "Number of cards ?"
When I enter "5" for Alice and "3" for Bob and click Confirm
Then Bob wins (LOWEST_SCORE tie-break condition)
```

### Tie-break with manual selection
```
Given a game with MANUAL_SELECTION tie-break rule
And Alice and Bob both have 10 points
When I click "Finish match"
Then a ManualSelectionDialog appears
When I select Alice and click Confirm
Then the match is saved with manualWinners=["Alice"]
```

### Edit match from history
```
Given a completed match exists with Alice=20, Bob=15
When I click the match card in History
Then ScoreDetailScreen loads in edit mode:
   - Title shows "Edit match"
   - Rounds reconstructed as 1 round: Alice=20, Bob=15
   - Players and game type preserved
When I update Alice to 25 and click "Finish match"
Then the match is updated with new scores (same ID, same date)
   And History displays updated scores
```

### Edit match preserves original date
```
Given a match created on 2026-01-01
When I edit the match and change scores
And click "Finish match"
Then the match date remains 2026-01-01 (not updated to current date)
```

### Cancel match with confirmation
```
Given I'm in the scoring screen with entered scores
When I click Cancel
Then a modal appears: "Discard unsaved scores?"
And I click Discard
Then the screen closes without saving and returns to Home
And the MatchDraft is cleared
```

### Auto-save & resume match
```
Given I'm in the scoring screen
When I enter scores and then navigate away (or refresh page)
Then a MatchDraft is saved to localStorage with the same gameTypeId and playerIds
And I return to Home
And I see a banner: "Resume match in progress: Alice vs Bob"
When I click the resume button
Then I return to the scoring screen with all previously entered scores
```

### Discard incomplete match
```
Given a MatchDraft exists
When I'm on Home and I decide not to resume
Then I can ignore the banner and start a new match
And the previous MatchDraft will be overwritten by the new match's data
```

## Mockup (History view)

```
┌─────────────────────────────┐
│  Score Detail               │
│  ┌──────┬──────┬──────┐     │
│  │Alice │ Bob  │Total │     │
│  ├──────┼──────┼──────┤     │
│  │ [10] │ [5]  │  15  │ ✕  │
│  ├──────┼──────┼──────┤     │
│  │ [8]  │ [12] │  20  │ ✕  │
│  ├──────┼──────┼──────┤     │
│  │  18  │  17  │  35  │     │
│  └──────┴──────┴──────┘     │
│  [ ＋ Add round ]            │
│  [Finish match]  [Cancel]   │
└─────────────────────────────┘
```
