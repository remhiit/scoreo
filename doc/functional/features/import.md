# Import

## Use Cases

| Use Case | Method | Input | Output |
|----------|--------|-------|--------|
| `ImportMatchesUseCase` | `preview(jsonString)` | Raw JSON string | `Result<ImportPreview>` |
| `ImportMatchesUseCase` | `execute(jsonString)` | Raw JSON string | `Result<ImportResult>` |

## Data Types

```typescript
interface ImportPreview {
  gameName: string
  count: number
}
interface ImportResult {
  imported: number
  skipped: string[]
  failed: string[]
}
```

## MVI-style

| Component | Details |
|-----------|---------|
| **Reducer** | `importReducer` — `apps/scoreo/src/ui/import/importReducer.ts` |
| **Action** | `ImportAction`: `previewReady`, `previewFailed`, `importSucceeded`, `importFailed`, `fileError`, `reset` |
| **State** | `ImportState`: `step` (`'IDLE'` → `'READY'` → `'DONE'`), `preview`, `jsonContent`, `result`, `error` |

Screen: `apps/scoreo/src/ui/import/ImportScreen.tsx`. See `doc/reference.md` for the full reducer table.

## Screen: ImportScreen

1. **IDLE** — design-system `DropZone` (click to select .json file)
   - A file input accepting `.json` files only
   - Label: "Click to select a JSON file"
2. **READY** — preview (boxed `DetailList`): game name + match count + **Execute** / **Reset** buttons
3. **DONE** — result summary with per-match status (Imported ✅ / Skipped ⚠️ / Failed ❌)
   - Each outcome is a design-system `StatusLine` (success / warning / danger), icon aligned with its text
   - Failed match IDs are the danger line's `details` (monospace, indented), rendered as siblings of the "Failed" line, not nested inside it
4. **ERROR** — if file cannot be read (e.g. permission denied, abort):
   - Error message displayed in IDLE state
   - **Retry** button to select another file

## Import JSON Format

Supports versions `1.0` and `1.1`. `version` is optional and defaults to `1.0` when absent — the v1.0 format predates that field.

```json
{
  "version": "1.1",
  "game": "Belote",
  "winCondition": "HIGHEST_SCORE",
  "games": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "date": 1767225600000,
      "ranking": [
        { "name": "Alice", "score": 25, "rank": 1 },
        { "name": "Bob",   "score": 18, "rank": 2 }
      ],
      "details": [
        { "scores": [{ "name": "Alice", "score": 10 }, { "name": "Bob", "score": 5 }] },
        { "scores": [{ "name": "Alice", "score": 15 }, { "name": "Bob", "score": 13 }] }
      ]
    }
  ]
}
```

### Fields

| Field | Required | Description |
|-------|----------|-------------|
| `version` | no | Schema version (`"1.0"` or `"1.1"`); defaults to `"1.0"` when absent |
| `game` | yes | Game type name (auto-created if new) |
| `winCondition` | no | `HIGHEST_SCORE`, `LOWEST_SCORE`, or `MANUAL` (default: `MANUAL`) |
| `games[]` | yes | Array of match objects |
| `games[].id` | yes | Unique match ID (UUID) |
| `games[].date` | no | Epoch ms timestamp (defaults to import date) |
| `games[].ranking` | yes | ≥2 entries with `name`, `score`, `rank` |
| `games[].details` | no | Round-by-round breakdown (v1.1+) |

### Validation

- `details` scores must sum to the `ranking` score for each player
- If mismatch → match marked as **Failed**, not stored
- If the sums match, `details` is stored as the match's `rounds` (round detail, resolved to internal player ids, in file order) — displayed in History exactly like a match scored directly in Scoreo
- Duplicate match ID → marked as **Skipped**
- Unknown game type → auto-created, always in "Total points" scoring (`POINTS`): the file carries points
- Unknown player name → auto-created

### Scoring mode of the target game

The file always carries points. A match imported into an **existing** game in "Rounds won" scoring (`ROUNDS_WON`) is stored in that game's unit, since a game's rules apply to its whole history (see [games](games.md#scoring-mode)):
- **with `details`**: its score is the count of rounds each player won, computed from `details` with the game's win condition (a round goes to the highest or lowest score, every tied player wins it); `details` is still stored as the match's `rounds`, in raw points. A player ranked 1st in the file stays a recorded winner only if they also have the most rounds won;
- **without `details`**: nothing to count rounds from, so the file's scores are kept as they are (and read as rounds won by the game).

A game bound to a scoring module always scores in points, so a match imported into it keeps the file's scores.

## Functional Tests

### Successful import
```
Given a valid JSON file with 3 matches for "Belote"
When I upload the file
Then preview shows "Belote" with count 3
When I click Execute
Then 3 matches are imported (Imported ✅)
```

### Duplicate match detection
```
Given a match with id "m1" already exists
When I import JSON containing a match with id "m1"
Then that match is Skipped ⚠️
```

### Name mismatch creates a duplicate
```
Given "Jean-Luc" already exists
When I import JSON whose ranking names "Jean Luc"
Then a second player "Jean Luc" is created (names are matched case-insensitively, but otherwise exactly)
And the two can be folded back together from Home's "Merge" dialog — see players.md
```
The same holds for the `game` field and game types — see [`games.md`](games.md#merge-dialog).

### Round detail preserved
```
Given a JSON with ranking score 25 (Alice) and details summing to 25 across 2 rounds
When I execute the import
Then the match is Imported ✅
And opening it from History shows both rounds, with each player's per-round score
```

### Import into an existing rounds-won game
```
Given an existing game "Tarot" in "Rounds won" scoring, where the lowest score wins a round
And a JSON with a "Tarot" match ranking Alice 13 (rank 1) and Bob 7, with details 10/5 and 3/2
When I execute the import
Then the match is Imported ✅ with Alice 0 and Bob 2 rounds won, and Bob as its winner
And opening it from History shows both rounds with their raw points
Given the same match without details
When I execute the import
Then the match is stored as a single round 13/7, Bob winning it: Alice 0 and Bob 1 round won, Bob as its winner
And a game created by an import ("Belote", unknown so far) is in "Total points" scoring
```

### Score mismatch detection
```
Given a JSON with ranking score 25 but details sum to 20
When I execute the import
Then that match is Failed ❌
```

### File read error
```
Given the ImportScreen is in IDLE state
When I click to select a file but the read operation fails (e.g. permission denied)
Then an error message appears: "Could not read file: {error reason}"
And I can click Retry to select another file
```
