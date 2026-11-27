---
title: GameType.scoringMode, scoring by rounds won
decision: GameType gains scoringMode ('POINTS' default | 'ROUNDS_WON') as a separate field rather than a fourth WinCondition; a game's rules apply to its whole history (no per-match rule snapshot), so changing how rounds become a score rescores the game's matches at that moment, never at load.
status: Accepted
date: 2026-10-21
sources: commit 94e7975, issue #568, PR #589; commit 8fa8d07, issue #593, PR #665 (compensation); commit fa3067c, issue #643, PR #651 (module guards on merge)
---

## Context

Some games (e.g. Tarot played as a series) are won on the number of rounds won, not on the sum of
points.

## Decision

New optional serialized field on `GameType`: `scoringMode: 'POINTS' | 'ROUNDS_WON'`. `POINTS`
(default) sums the rounds; `ROUNDS_WON` stores as final score the number of rounds each player won
(a round's winner follows `winCondition`; every tied player wins it). It is a separate field, not a
fourth `WinCondition` value: an older version reading a game synced through Drive would no longer
parse `winCondition`, and `localStorageGameTypeRepository` returns `[]` on a parse failure.

New format:

```json
{ "id": "gt1", "name": "Tarot", "winCondition": "LOWEST_SCORE", "scoringMode": "ROUNDS_WON", "tieBreakRule": "NONE", "tieBreakCondition": "HIGHEST_SCORE", "tieBreakLabel": null, "active": true, "moduleId": null }
```

Backward compatibility: `.default('POINTS')` — a `GameType` without the field (older data, Drive,
import) reads in points mode, losslessly. Covered by `serialization.contract.test.ts`.

**Coexistence with an older version (Drive sync):** a version unaware of the field strips it and
reads the game in points. Known effects meanwhile: (1) the `playerScores` of a `ROUNDS_WON` match are
round-win counts that the old version reads as points — for `LOWEST_SCORE` + `ROUNDS_WON` it names as
winner the player who won the **fewest** rounds (winners, Elo, trophies inverted on that device);
(2) if that version re-saves the game types, `scoringMode` disappears and sync propagates the loss:
the game goes back to `POINTS` everywhere, without rescoring its matches. Those matches are then
flagged "inconsistent data" if their stored score matches their detail under neither mode, otherwise
read as is; re-editing the game back to `ROUNDS_WON` rescores them.

**A game's rules apply to its whole history.** Matches store scores and winners, but winners, Elo,
statistics and trophies are derived from the game type's current rules when read; there is no
per-match rule snapshot, which would make one game count two ways. Changing a game's rules is
therefore a deliberate act that rewrites how all its past matches are read, retroactively; a rules
change shows up in past winners, Elo and trophies, as intended.

**Changing the mode rescores and rewrites matches.** `Match.playerScores` stores the score in the
game's mode; `Match.rounds` always keeps raw points. When `UpdateGameTypeUseCase` changes how rounds
become a score (effective mode, or `winCondition` of a `ROUNDS_WON` game), it recomputes from
`Match.rounds`, with the new rules, the `playerScores` of every match of the game whose detail agrees
with its stored score, converts matches without detail when the game moves from points to rounds won
(below), then rewrites the matches (`MatchRepository.saveAll`) **before** saving the game type: if
writing the matches fails, the game keeps its old rules. If saving the game type then fails (quota),
the use case compensates (#593): it rewrites the rescored matches as read before rescoring (only
those), then rethrows the original error unchanged; nothing is written when no match was rescored.
Known limit: if that compensating write fails too, the game-type error still surfaces and matches may
stay rescored under rules the game no longer has. `manualWinners` and `secondaryPlayerScores` are not
touched. No migration at load. The rule (`roundScoringChanged`) and per-match rescoring
(`rescoreMatch`, `domain/model/match.ts`) are shared with game-type merging.

**Merging game types:** `MergeGameTypesUseCase` applies the same rule to moved matches when a
duplicate turns rounds into a score differently from the kept game (rescored with the kept game's
rules; a points match without detail becomes a single round when the kept game is `ROUNDS_WON`);
inconsistent matches keep their stored score. In an ordinary kept game, matches carrying
`moduleData` are never rescored (#590). Module guards (#643): the merge is refused
(`ValidationError`, nothing written) when a duplicate is bound to a module and the kept game is not
bound to the same module, or when the kept game is module-bound and a moved match, rescored under its
rules, fails `assertMatchConsistent`. `preview` no longer raises `rulesDiffer` for a module match.

**Module-bound game:** a `GameType` with `moduleId !== null` always has effective mode `POINTS`
(`effectiveScoringMode`): the module computes its own scores. `UpdateGameTypeUseCase` stores
`POINTS`, the form hides the choice, and its matches are never rescored into rounds won.

- **Match without detail** (`rounds: []`): when its game moves from effective `POINTS` to
  `ROUNDS_WON` (mode change, merge into a `ROUNDS_WON` game, import into an existing `ROUNDS_WON`
  game) it is **converted** into a single round carrying its stored `playerScores`, saved in
  `Match.rounds`, then rescored as a consistent match (the best player(s) under `winCondition` win
  that round). A module game's match is never converted. In any other change it keeps its stored
  score. Re-editing it builds synthetic rounds (`syntheticRounds`) that give back exactly that score
  under the current mode.
- **Consistent detail**: the stored score is either the sum of rounds or the count of rounds won
  under the current `winCondition` (`roundDetailStatus`), whatever the current mode. Re-editing shows
  the raw rounds; saving recomputes with the current mode.
- **Inconsistent detail** (neither): the detail is **kept**, never replaced by a single row; the
  match counts with its stored score (mode changes do not rescore it) and an "inconsistent data"
  warning shows in History and the editor. Saving it recomputes the score from its (possibly
  corrected) rounds with the current mode: the detail becomes authoritative. A `ROUNDS_WON` match
  without detail whose scores cannot be round-win counts (negative, non-integer) is treated the same
  way.

**Import:** the import format does not carry the field and always gives points; games created by an
import are `POINTS`. Importing into an existing `ROUNDS_WON` game computes each match's rounds-won
score from its `details`, keeps in `manualWinners` only the file's first-ranked players who are also
rounds-won winners; a match without detail becomes a single round, then is counted in rounds won.

## Consequences

- The mode choice is a domain rule shared with the form (`scoringModeIsSelectable`).
