---
title: GameType.minPlayers / maxPlayers, a game's player range
decision: GameType gains minPlayers and maxPlayers (int ≥ 1 or null for no limit, default null), used only to enable Start match; no recorded match is checked or changed.
status: Accepted
date: 2026-11-03
sources: commit 699cf8c, issue #606, PR #616
---

## Context

Some games only make sense with a given number of players (chess: 2); launching them outside that
range is a mistake the app can prevent.

## Decision

Two optional serialized fields on `GameType`: `minPlayers: number | null` and
`maxPlayers: number | null` (`null` = no limit). They only gate launching a match from the game
selection window (**Start match** disabled outside the range, game without module); no recorded match
is checked or modified.

New format:

```json
{ "id": "gt1", "name": "Échecs", "winCondition": "HIGHEST_SCORE", "minPlayers": 2, "maxPlayers": 2 }
```

Backward compatibility: both are `z.number().int().min(1).nullable().default(null)` — a `GameType`
without them (older data, Drive, import) reads without limit, losslessly. A value below 1 or
non-integer is refused by the schema. Covered by `serialization.contract.test.ts`.

Coexistence with an older version (Drive sync): an older version strips the fields and reads the game
without range. If it re-saves the game types, the range disappears everywhere (sync propagates the
loss), with no other effect than lifting the launch block — nothing is recomputed.

Import/export: the v1.1 format does not carry the range; games created by import have no limit.
Merge: the kept game keeps its own range.

## Consequences

- For a module-bound game, the range is read from the manifest (ADR-0045).
