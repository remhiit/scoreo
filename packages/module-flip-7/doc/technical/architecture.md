# Flip 7 — technical notes

## Structure

| Path                         | Content                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/index.ts`               | Exports the manifest and the module, nothing else (the bundle trap)                              |
| `src/module.ts`              | The manifest, and `load` — a dynamic import of the screen                                        |
| `src/domain/hand.ts`         | `Flip7Hand`, its zod schema, `handScore`, `isFlip7`, the rule constants                          |
| `src/domain/round.ts`        | `Flip7Round`, running totals, `isGameOver` / `isTieBreak` (200, tie-break)                       |
| `src/domain/moduleResult.ts` | Ranking (higher wins, shared ranks) and the `ModuleMatchResult` handed back                      |
| `src/ui/module/`             | MVI: `flip7ModuleTypes.ts` (state, actions, draft schema), the pure reducer, the screen          |
| `src/design/`                | `ModuleRoot` only — the `.module-flip-7` scope; every other element is a design-system component |

## Data

The round log stores **hands, not scores**: `{ entries: [{ playerId, hand: { busted, numbers,
modifiers, doubled } }] }`. Scores are always derived (`handScore`), so the reducer keeps no
aggregate and a reopened match shows exactly which cards made each score.

- `moduleData` (`dataVersion: 1`): `{ players: string[], rounds: Flip7Round[] }`
  (`Flip7ModuleDataSchema`).
- Draft (`DRAFT_VERSION = 1`): the same plus `hands`, the round being entered
  (`Flip7DraftSchema`), read by `buildInitialState`. A draft for another table, or one the schema
  refuses (another version, a corrupt hand), starts a clean game.
- Reopening (`buildEditingState`) reads `editing.data` only when `editing.version` is the
  manifest's `dataVersion`. The host hands the players back in **ranking** order (`playerScores`),
  so the table is matched as a set and the stored seating is kept. While a reopened match is
  on screen the module never writes or clears the draft slot, which may hold another, unfinished
  game — but the host's `saveMatch` clears that slot on every save, an update included
  (`ModuleHostAdapter`, shared by every module), so re-saving a reopened match still drops it.
- The result's `rounds` carry each round's derived score per player, so they sum to the ranking
  (`assertRoundsSumToRanking`, called by the module and again by the host).

## Look

The screen composes `@scoreboards/design-system` only: `Panel` per hand, `Chip` per card, `Badge`
for the live score, `StandingsGrid`/`StandingsCard`, `RoundCard`/`HistoryCell`/`Score` for the log.
Nothing here is specific enough to need a game piece, so `src/design/` holds the root wrapper alone.
