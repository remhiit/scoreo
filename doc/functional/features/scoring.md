# Scoring

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `CreateMatchUseCase` | `gameTypeId, playerScores, date, manualWinners, secondaryPlayerScores` | `Match` | Saves match; returns `Result<Match>` |

## MVI

| Component | Details |
|-----------|---------|
| **Handler** | `ScoreDetailHandler` — `src/commonMain/.../ui/scoredetail/ScoreDetailHandler.kt` |
| **Intent** | `ScoreDetailIntent`: `UpdateScore`, `AddRound`, `RemoveRound`, `Terminate`, `ConfirmWinners`, `DismissModal`, `ToggleModalWinner`, `UpdateSecondaryScoreInput`, `SubmitSecondaryScores`, `ToggleManualSelectionWinner`, `ConfirmManualWinners`, `KeepTie`, `DismissTieBreak` |
| **State** | `ScoreDetailState`: `gameType`, `players`, `rounds`, `totals`, `showWinnerModal`, `modalWinners`, `showSecondaryScoreDialog`, `tiedPlayerIds`, `secondaryScoreInputs`, `showManualSelectionDialog`, `manualSelectionWinners`, `collectedSecondaryScores`, `error` |

## Screen: ScoreDetailScreen

Grid: columns = players, rows = rounds + totals row.

| Player 1 | Player 2 | ... |
|----------|----------|-----|
| `[10]`   | `[5]`    | round 1 |
| `[8]`    | `[12]`   | round 2 |
| **18**   | **17**   | totals |
| ✕        | ✕        | delete round |

- Editable score cells with numeric input
- **✕** button on each round row to remove it
- **＋ Add round** button at the bottom
- **Terminer la partie** to save
- For `MANUAL` win condition: modal appears listing each player's total with checkboxes to select winner(s)

### Tie-break resolution flow

When a tie is detected (multiple players have the same top/lowest score), the system follows the game type's `tieBreakRule`:

1. **NONE** → All tied players are winners (equality preserved)
2. **MANUAL_SELECTION** → A **ManualSelectionDialog** appears immediately with checkboxes to select winners among tied players
3. **SECONDARY_SCORE** → A **SecondaryScoreDialog** appears:
   - Title uses `tieBreakLabel` (e.g. "Number of cards ?")
   - One numeric input per tied player
   - On submit: if the secondary score breaks the tie → match saved
   - If the tie persists → escalates to **ManualSelectionDialog**

The **ManualSelectionDialog** offers:
- Checkboxes to select one or more winners
- "Keep tie" button to preserve equality (all tied win)
- Confirm button to finalize

## Functional Tests

### Score entry
```
Given a game with players Alice and Bob
When I enter "10" for Alice and "5" for Bob in round 1
And I click "Terminer la partie"
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
When I click "Terminer la partie"
Then a modal appears showing both players' totals
And I can check Alice as winner
When I confirm
Then the match is saved with manualWinners=["Alice"]
```

### Tie-break with secondary score
```
Given a game with SECONDARY_SCORE tie-break rule
And Alice and Bob both have 10 points
When I click "Terminer la partie"
Then a SecondaryScoreDialog appears with label "Number of cards ?"
When I enter "5" for Alice and "3" for Bob and click Valider
Then Bob wins (LOWEST_SCORE tie-break condition)
```

### Tie-break with manual selection
```
Given a game with MANUAL_SELECTION tie-break rule
And Alice and Bob both have 10 points
When I click "Terminer la partie"
Then a ManualSelectionDialog appears
When I select Alice and click Valider
Then the match is saved with manualWinners=["Alice"]
```

## Mockup

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
│  [Terminer]    [Annuler]    │
└─────────────────────────────┘
```
