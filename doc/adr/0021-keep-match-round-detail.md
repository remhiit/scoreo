---
title: Keep the round detail of played matches (Match.rounds)
decision: Match stores rounds as PlayerScore[][], one entry per played round, defaulted to [] for older and imported matches, with no backfill.
status: Accepted
date: 2026-08-10
sources: commit f2ecdc7, issue #249, PR #256
---

## Context

`MatchDraft.rounds` (the per-round detail typed during a game) was thrown away when the match was
saved: `Match` only kept the final score per player (`playerScores`). Any statistic or trophy based
on how a game unfolded (best round, comebacks, number of rounds) was impossible, and the detail of
games already played was lost for good once saved.

## Decision

`Match` (`match.ts` / `match.schema.ts`) adds `rounds: PlayerScore[][]` — one entry per played
round, each listing that round's score for every participant. `CreateMatchUseCase.invoke()` accepts
`rounds` as an option and persists it; the score-entry screen converts the typed rounds
(`state.rounds`, `Record<string, string>[]`) into `PlayerScore[][]` on save (creation and editing
from History), ignoring the final round not yet played.

Old format:

```json
{ "id": "...", "date": 1700000000000, "gameTypeId": "...", "playerScores": [...], "manualWinners": [], "secondaryPlayerScores": [] }
```

New format:

```json
{ "id": "...", "date": 1700000000000, "gameTypeId": "...", "playerScores": [...], "manualWinners": [], "secondaryPlayerScores": [], "rounds": [[{ "playerId": "p1", "score": 10 }, { "playerId": "p2", "score": 5 }]] }
```

Backward compatibility: `MatchSchema` declares `rounds` with `.default([])` — a `Match` serialized
before this change decodes with `rounds: []`. Matches imported through `schemas/import/` kept
`rounds: []` at the time (the import format did not carry the round detail). No backfill: the data
no longer exists and cannot be rebuilt.

Out of scope of #249: storing only — nothing read the data yet (see ADR-0022).

## Consequences

- Import later kept the round detail too (commit 72bea61, PR #370).
- Round detail is optional: a match with `rounds: []` contradicts nothing (ADR-0040).
