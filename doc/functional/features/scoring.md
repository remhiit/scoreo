# Scoring

## Use Cases

| Use Case | Input | Output | Business Rule |
|----------|-------|--------|---------------|
| `CreateMatchUseCase` | `gameTypeId, playerScores, date, manualWinners, secondaryPlayerScores, rounds` | `Match` | Saves match; returns `Result<Match>` |

## MVI-style

| Component | Details |
|-----------|---------|
| **Reducer** | `scoreDetailReducer` — `apps/scoreo/src/ui/scoredetail/scoreDetailReducer.ts` |
| **Action** | `ScoreDetailAction`: `setViewMode`, `updateMatchDate`, `updateScore`, `addRound`, `removeRound`, `cancelImmediate`, `showCancelConfirm`, `confirmCancel`, `dismissCancelConfirm`, `validationFailed`, `openWinnerModal`, `openManualSelectionDialog`, `openSecondaryScoreDialog`, `saved`, `saveFailed`, `dismissModal`, `toggleModalWinner`, `confirmWinnersEmptyError`, `updateSecondaryScoreInput`, `secondaryScoreInvalid`, `secondaryScoreEscalate`, `toggleManualSelectionWinner`, `manualWinnersEmptyError`, `dismissTieBreak`, `openRoundSheet`, `closeRoundSheet`, `updateRoundSheetInput`, `submitRoundSheet` |
| **State** | `ScoreDetailState`: `gameType`, `players`, `rounds`, `matchDate`, `viewMode`, `showWinnerModal`, `modalWinners`, `showSecondaryScoreDialog`, `tiedPlayerIds`, `secondaryScoreInputs`, `showManualSelectionDialog`, `manualSelectionWinners`, `collectedSecondaryScores`, `error`, `saved`, `cancelled`, `editingMatchId`, `showCancelConfirm`, `showRoundSheet`, `roundSheetInputs` |

Screen: `apps/scoreo/src/ui/scoredetail/ScoreDetailScreen.tsx`. See `doc/reference.md` for the full reducer table.

## Screen: ScoreDetailScreen

### Top bar
- Title: "Score Detail" (new match) or "Edit match" (editing mode)
- Back button:
  - If new match: returns to Home
  - If editing: returns to History
- Cancel button: Opens cancel confirmation modal if scores are entered; closes screen without saving otherwise

### Match date field

A native `<input type="date">` sits above the view switch, always visible (both views read the same `matchDate` state). It's prefilled to today in create mode, or to the match's existing date in edit mode, and stays freely editable. The field's `max` is capped at today, so the date picker can't offer a future date; a future date typed in manually is still rejected on **Finish match** with an error, blocking the save. The field has no `required` attribute, so it can be cleared manually (e.g. backspace); an empty or calendar-invalid `matchDate` (not just a future one) is likewise rejected on **Finish match** with an error, blocking the save — otherwise it would silently store `Match.date: NaN` and break chronological sort (History, ELO, trophies). Leaving the field untouched keeps today's date (create) or the match's original date (edit) exactly as before this field existed. Only the calendar day is chosen — the time-of-day is never user-editable: on save, the chosen day is combined with the moment of saving's time-of-day in create mode, or with the original match's time-of-day in edit mode, so editing the date never changes what time a match appears to have been played at. Not persisted to the in-progress `MatchDraft` — resuming a draft always starts from today's date.

### View switch: Standings / History

A segmented control (`Standings` / `History`) sits above the content. `viewMode` defaults to `standings`. Round entry (adding/removing rounds, editing a cell) only happens in the **History** tab — switching tabs doesn't lose any entered scores, since both views read the same `rounds` state.

### Standings view (default)

A 2-column card grid (design-system `StandingsGrid`), one `StandingsCard` per player, holding any headcount (tested up to 8 players) without horizontal scrolling:

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
- In a `ROUNDS_WON` game (`gameType.scoringMode`), the card's total is the number of rounds won and cards are ranked most rounds first, whatever the `winCondition` (which then only decides who wins each round). Blank rounds are skipped, a blank cell in a played round counts 0, and every player tied for a round's best score wins it. The hint line reads "most rounds won leads".
- The card's bottom-right number is the delta: the score entered in the **last** round only (not the cumulative total). In a `ROUNDS_WON` game it reads "+1" on the card of every player who won the last entered round (all tied winners included) and is absent on the others.
- The leading card(s) — rank 1, possibly several on a tie — get an accented border/total (`StandingsCard`'s `lead`).
- This view is read-only: no inputs, no add/remove-round controls.

### Rounds-won saving

On save, a `ROUNDS_WON` game stores `Match.playerScores[i].score` = rounds won by that player, while `Match.rounds` keeps the raw points entered per round. Winners are the players with the most rounds won (also for `LOWEST_SCORE`); a tie applies the game's `tieBreakRule`. Reopening such a match for editing restores the raw points and recomputes the count.

The game's **current** mode decides, for every match. Switching a game's mode recomputes and rewrites the stored `playerScores` of every match of that game whose round detail agrees with its score (see [games](games.md#scoring-mode)). Re-editing a match whose detail agrees with its stored score — as the points sum **or** as the count of rounds won, whatever the current mode — restores the raw rounds, and saving recomputes it with the current mode: rounds 10/2, 1/8, 9/3 stored as 2/1 in rounds won, game switched back to points, reopened and saved unchanged → 20/13, raw rounds kept.

A match stored **without** round detail (imported, or saved before `Match.rounds`) reopens with a **synthetic detail** that gives back exactly its stored score under the current mode, then behaves like any match whose detail agrees with its score (see [Data Reconstruction](#data-reconstruction)): in rounds won, one round per round won, each won by a single player — Alice 3, Bob 2 reopens as 5 rounds, 3 won by Alice and 2 by Bob. Saving it unchanged keeps 3/2; adding a round Alice wins saves 4/2.

A match whose detail is **inconsistent** (the stored score is neither the sum nor the rounds won) reopens with its **stored rounds** and an "Inconsistent data" warning above the views. The detail is authoritative: on save the score is recomputed from those rounds (as corrected or completed by the user, rounds added the usual way) with the current mode, and they are saved as the match's detail — the match becomes consistent and the warning goes away. Until it is re-edited, it keeps counting with its stored score.

In the winner-selection dialog, each player's subtitle shows the figure the game is decided on — rounds won in a `ROUNDS_WON` game, points otherwise. The round entry sheet always shows points, since that is what it takes.

### History view: one card per round (`RoundHistoryList`, `apps/scoreo/src/ui/scoredetail/RoundHistoryList.tsx`)

Each round is a design-system `RoundCard` (a region named "Round N"), not a table row — this is what lets any player count (tested up to 8) fit without horizontal scrolling:

```
┌ Round 1 ──────────────── ✕ ┐
│ [Alice 10] [Bob 5]          │
└──────────────────────────────┘
┌ Round 2 ──────────────── ✕ ┐
│ [Alice 8] [Bob 12]          │
└──────────────────────────────┘
        [ Add round ]
```

- the card's cells are `HistoryCell`s (player name + editable `NumberField`) on a two-column grid; cells wrap onto more lines instead of the card scrolling sideways, and the card never clips, it grows with the wrapped cells.
- Editable score cells with numeric input (for already-entered rounds; unchanged by the round entry sheet below). Native spinner arrows are suppressed on these fields (design-system number inputs never show them), so a 2-digit score is never clipped.
- **✕** button in the card's head removes that round; hidden while only one round remains, same as before.
- **"Add round"** button below the list opens the round entry sheet (`openRoundSheet`) — the same sheet as the bottom bar's "Enter round N" button, not a direct empty-round insert.

### Round entry sheet

The primary way to enter a new round. A full-width primary button in the bottom bar reads "Enter round N" (N = `nextRoundNumber(rounds)`, the first not-yet-played round + 1). Tapping it opens `RoundEntrySheet` (`apps/scoreo/src/ui/scoredetail/RoundEntrySheet.tsx`), a bottom sheet (design-system `Sheet`) over a dimming scrim:

- Title "Round N".
- One `SheetRow` per player: name, current total (computed before this round), and a `NumberInput` stepper defaulted to 0.
- Rows scroll internally (design-system `Sheet`); the sheet is capped at 80% of the viewport height, so the title and footer buttons stay visible.
- Footer: **Cancel** (secondary — closes the sheet, `roundSheetInputs` discarded, `rounds` untouched) and **Save round** (primary — writes the round into `rounds` and closes).

State (`showRoundSheet`, `roundSheetInputs`) lives in `ScoreDetailState`; `submitRoundSheet` fills the first not-yet-played round (or appends one if all existing rounds are already played) and triggers the same `saveDraft` autosave as a direct cell edit. Standings update immediately since both views read the same `rounds` state.

### Bottom bar

- Full-width primary **Enter round N** button (opens the round entry sheet above).
- **Finish match** to save (also auto-saves to localStorage as MatchDraft after each score update).
- **Cancel match**.
- Pinned to the bottom of the screen (design-system `ActionBar`: full-width "Enter round N" over Cancel / Finish match), visible from both the Standings and History views.
- For `MANUAL` win condition: modal appears listing each player's total as a selectable row (selection shown by the accent tint) to select winner(s)

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
2. **MANUAL_SELECTION** → A **ManualSelectionDialog** appears immediately with selectable rows (selection shown by the accent tint) to select winners among tied players
3. **SECONDARY_SCORE** → A **SecondaryScoreDialog** appears:
   - Title uses `tieBreakLabel` (e.g. "Number of cards ?")
   - One numeric input per tied player
   - On submit: if the secondary score breaks the tie → match saved
   - If the tie persists → escalates to **ManualSelectionDialog**

The **ManualSelectionDialog** offers:
- Selectable rows (design-system `ListRow`, accent tint when selected) to select one or more winners
- "Keep tie" button to preserve equality (all tied win)
- Confirm button to finalize

## Edit Mode

When navigating to `ScoreDetailScreen` with a `matchId` parameter (from History), the screen loads the existing match and enters edit mode.

### Data Reconstruction

All matches are stored with `playerScores` (total score per player) and `rounds` (per-round detail, `PlayerScore[][]`, one entry per round played — empty for matches saved before this was tracked, or imported without round detail). When editing, the screen rebuilds the editor from the stored `rounds`: one editor round per stored round, so the History tab shows the match exactly as it was played, and re-saving it untouched leaves `Match.rounds` unchanged.

The stored rounds are used when they agree with `playerScores`: every round names only players of the match (a participant missing from a round counts 0 in it), and the scores are either the per-player sums or the counts of rounds won under the current `winCondition` (`roundDetailStatus`, `domain/model/match.ts`), whatever the current scoring mode.

A match with **no** stored round detail (`rounds: []` — saved before this was tracked, or imported) gets a **synthetic detail** (`syntheticRounds`, `domain/model/match.ts`) whose recompute under the current mode gives back exactly the stored `playerScores`, and is then edited like a match whose detail agrees with its scores:
- **points**: a single round holding the final scores (the editor shows one round with the totals, as before);
- **rounds won**: as many rounds as rounds won in total, each won by exactly one player. Under `HIGHEST_SCORE` the round's winner has 1 and the others 0; under `LOWEST_SCORE` the winner has 0 and the others 1, so that `computeRoundsWon` gives the stored counts back. Alice 3, Bob 2 → 5 rounds. When nobody won a round (0/0), the editor opens on an empty round.

The synthetic detail is **saved** as the match's `Match.rounds` like any entered rounds (the editor does not tell it apart from rounds the user typed): from then on the match has a detail that agrees with its score, so a later mode change recomputes it from that detail — the 1/0 rounds of a rounds-won match then sum, in points, to the same counts under `HIGHEST_SCORE`; a points match's single round becomes one round won by its leader. Saving unchanged never alters the stored scores.

There is no cap on that synthetic detail: a match without detail gets one synthetic round per round won in rounds won (one round in points), however many that is.

When the stored rounds **disagree** with the scores (a round names a player who isn't in the match, or the scores are neither the sums nor the rounds won), the editor still shows the **stored rounds** (a score of a player outside the match is left out) and an "Inconsistent data" warning (`inconsistentRoundDetail`). The detail is authoritative: on save, `playerScores` is recomputed from the rounds in the editor (corrected, completed or extended the usual way) with the current mode, and those rounds are saved as `Match.rounds`. The match is then consistent and no longer flagged. Until it is re-edited, it counts with its stored scores.

A rounds-won match without detail whose stored scores cannot be counts of rounds won (negative, or not whole numbers) has no synthetic detail that gives them back: it reopens with a single round holding the stored scores, flagged "Inconsistent data" as well, and is then saved like any other shown detail (that round is stored and scored with the current mode).

### Workflow

1. User clicks match card in History
2. `ScoreDetailScreen` loads match + rebuilds its stored rounds (a synthetic detail without stored rounds, the stored rounds with a warning for inconsistent detail, see above)
3. Title changes to "Edit match"
4. User edits rounds/scores (the History tab lists the match's own rounds)
5. Clicks "Finish match" (button text unchanged, intent same)
6. Calls `UpdateMatchUseCase` instead of `CreateMatchUseCase`
7. Match overwritten (id preserved; date preserved unless the match date field was changed, in which case only the calendar day changes, the original time-of-day is kept)
8. Returns to Home after successful save

## Functional Tests

### Score entry
```
Given a game with players Alice and Bob
When I enter "10" for Alice and "5" for Bob in round 1
And I click "Finish match"
Then a Match is saved with Alice=10, Bob=5
```

### Choosing a match date

```
Given a new match, the date field prefilled to today
When I change the date to a day last week
And I enter scores and click "Finish match"
Then the Match is saved with the chosen date, at the current time of day
```

### Rejecting a future match date

```
Given a new match
When I type a date in the future into the date field
And I enter scores and click "Finish match"
Then an error is shown and the match is not saved
```

### Rejecting an empty or invalid match date

```
Given a new match
When I clear the date field (or it holds a calendar-invalid date)
And I enter scores and click "Finish match"
Then an error is shown and the match is not saved
```

### Editing a match's date

```
Given an existing match played on a given day
When I open it for editing and change the date field to an earlier day
And I click "Finish match"
Then Match.date's calendar day is updated, but its time-of-day is unchanged
And the Historique list and its chronological order (History, ELO, trophies) reflect the new date
```

### Add and remove a round
```
Given a game with 2 players and 1 round
When I click "＋ Add round"
Then a second empty round appears
When I click "✕" on the second round
Then I'm back to 1 round
```

### Enter a round via the round entry sheet
```
Given a game with players Alice and Bob, no round played yet
When I click "Enter round 1" in the bottom bar
Then the round entry sheet opens, showing Alice and Bob each at 0
When I enter "10" for Alice and "4" for Bob
And I click "Save round"
Then the sheet closes, round 1 is saved with Alice=10, Bob=4
And the Standings view reflects the new totals immediately
And the bottom bar now reads "Enter round 2"
```

### Cancel the round entry sheet
```
Given the round entry sheet is open with some values entered
When I click "Cancel" (or tap the dimming scrim)
Then the sheet closes
And no round is added or modified
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
Given a completed match exists with Alice=20, Bob=15, stored without round detail
When I click the match card in History
Then ScoreDetailScreen loads in edit mode:
   - Title shows "Edit match"
   - Rounds reconstructed as 1 round: Alice=20, Bob=15
   - Players and game type preserved
When I update Alice to 25 and click "Finish match"
Then the match is updated with new scores (same ID, same date)
   And History displays updated scores
```

### Editing a match keeps its rounds

```
Given a completed match played in 3 rounds
When I open it for editing from History
Then the History tab shows those 3 rounds with their own scores
When I click "Finish match" without changing anything
Then the match is saved with the same 3 rounds (no round detail is lost)
```

### Editing a match whose rounds disagree with its totals

```
Given a points match stored as Alice=100, Bob=12 with a single stored round Alice=10, Bob=5
When I open it for editing from History
Then the History tab shows that stored round, Alice=10, Bob=5
   And an "Inconsistent data" warning is shown
When I click "Finish match" without changing anything
Then the match is saved as Alice=10, Bob=5, with that round as its detail
   And it is no longer flagged as inconsistent
When I reopen it, enter a round Alice=3, Bob=7 and click "Finish match"
Then the match is saved as Alice=13, Bob=12, with both rounds as its detail
```

### Editing a rounds-won match stored without round detail

```
Given a "Rounds won" game where the lowest score wins a round
   And a match imported without round detail, stored as Alice=3, Bob=2
When I open it for editing from History
Then the History tab shows 5 rounds: 3 where Alice has 0 and Bob 1, 2 where Alice has 1 and Bob 0
   And the standings show Alice 3, Bob 2 rounds won
When I click "Finish match" without changing anything
Then the match is still saved as Alice=3, Bob=2, with those 5 rounds as its detail
When I reopen it, enter a round Alice=10, Bob=2 and click "Finish match"
Then the match is saved as Alice=3, Bob=3
```

### Reopening a rounds-won match after the game went back to points

```
Given a match played in rounds won, rounds 10/2, 1/8, 9/3, stored as 2/1
   And its game switched back to "Total points"
When I open it for editing from History
Then the History tab shows the 3 raw rounds
When I click "Finish match" without changing anything
Then the match is saved as 20/13 with the same 3 rounds
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

## Mockup (Round entry sheet)

```
┌─────────────────────────────┐
│  ...standings behind scrim... │
├─────────────────────────────┤
│           ▬▬▬                │
│  Round 4                    │
│  Alice · 16          [ 0 ]  │
│  Bob   · 26          [ 0 ]  │
│  [Cancel]      [Save round] │
└─────────────────────────────┘
```

## Mockup (History view)

```
┌─────────────────────────────┐
│  Score Detail               │
│ ┌ Round 1 ──────────── ✕ ┐  │
│ │ [Alice 10] [Bob 5]      │  │
│ └──────────────────────────┘  │
│ ┌ Round 2 ──────────── ✕ ┐  │
│ │ [Alice 8] [Bob 12]      │  │
│ └──────────────────────────┘  │
│        [ Add round ]         │
│  [Finish match]  [Cancel]   │
└─────────────────────────────┘
```
