# Export to Scoreo

`src/application/exportMatchesUseCase.ts`, triggered from [`history.md`](history.md).

Turns the whole local match history into a `.json` file that [Scoreo](https://github.com/remhiit/scoreo) can import — Scoreo is the general-purpose scoreboard app; Torī Valley is the specialized calculator that feeds it.

## Contract

The file targets **Scoreo's import contract v1.1** (`schemas/import/v1.1.json-schema` in the scoreo repo, documented in its `doc/functional/features/import.md`). Anything that changes in the shape below has to stay valid against that schema.

| Field | Value produced |
|---|---|
| `version` | `"1.1"` |
| `game` | `"La Vallée des Torī"` — Scoreo creates the game type on first import |
| `winCondition` | `"HIGHEST_SCORE"` |
| `exportedAt` / `gameCount` | export timestamp, number of exported matches |
| `games[].id` | the Torī Valley match id, verbatim |
| `games[].date` | the match's `playedAt` |
| `games[].ranking` | one entry per player: `name`, total VP, `rank` |
| `games[].details` | 7 pseudo-rounds (see below) |

Matches are exported oldest first.

## Why re-exporting everything is safe

Scoreo de-duplicates on `games[].id`, and the export reuses the local match id unchanged, so a match already imported comes back as **Skipped ⚠️** rather than as a duplicate. There's no "export only what's new" mode and none is needed.

## Pseudo-rounds (`details`)

Torī Valley has no rounds, so the score breakdown is emitted as one pseudo-round per scoring category, in this fixed order (Scoreo's contract has no label field on a round — the order is the only thing carrying the meaning, and they display as "round 1..7"):

| # | Category |
|---|---|
| 1 | Bambou (Objectif points) |
| 2 | Cerisier |
| 3 | Montagne |
| 4 | Eau |
| 5 | Village |
| 6 | Torī series (`scoreTorii()`) |
| 7 | Parchemin + Pinceau |

These categories partition `scorePlayerResult()`, so each player's rounds sum back to their `ranking` score — which is what Scoreo's import validates before accepting a match (a mismatch would mark it **Failed ❌**).

## Rank and the winner

`rank` is a standard competition ranking on total VP, except that rank 1 goes only to `matchWinners()` — the rulebook breaks a top-score tie by Torī count then Pinceau (see [`scoring.md`](scoring.md#winner--tie-break)), a rule Scoreo doesn't know, so the exported rank is what carries it across. Scoreo stores rank-1 players as the match's manual winners.

## Player names

Scoreo resolves players by name (case-insensitively) and creates unknown ones, so every player in the file needs a distinct, non-blank name:

- A deleted-and-anonymized player (blank name) is exported as `Unknown player (<first 8 chars of id>)`.
- Two players sharing a name are both suffixed the same way, e.g. `Alice (a1b2c3d4)`.

Both forms are derived from the id, so they stay stable across exports and keep matching the same Scoreo player.

## Limits

- **Solo matches are not exported** — Scoreo's `ranking` requires at least 2 players. History reports how many were left out after an export.
- **When nothing is exportable, no file is offered.** Scoreo's contract declares `games` with `minItems: 1`, so a history holding nothing but solo matches has no valid file to produce: History shows "Nothing to export…" instead of downloading one that would be rejected at import. `ExportMatchesUseCase` still returns a payload with an empty `games` — that's the signal, and callers must not turn it into a file.
- The breakdown is one-way. Scoreo stores per-match totals, so re-importing into Torī Valley isn't possible (and there's no import side here).
- The Objectif card variants recorded per match (see [`objectif-cards.md`](objectif-cards.md)) are not exported — Scoreo's contract has no place for them.

## Language

The button and its notices are translated (`history.exportForScoreo`, `history.exportSkippedSolo`, `history.exportNothing`), and the filename uses the **local** calendar day. The file's *contents* are deliberately not translated: `game` is always `La Vallée des Torī` and the placeholder player names are always English, so exporting in French and in English produces names Scoreo still matches to the same players.
