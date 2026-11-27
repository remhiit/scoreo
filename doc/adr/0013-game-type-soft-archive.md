---
title: Game types are archived, never deleted
decision: GameType gains active (default true); archiving hides a game from selection while history still resolves it.
status: Accepted
date: 2026-06-24
sources: commit 6e5c899 (origin of the decision not found beyond it)
---

## Context

Users wanted to clean old or test games out of the selection list, but matches reference their game
type by id.

## Decision

Schema change: `GameType` adds `active: Boolean = true`.

Old format (v1.1):

```json
{ "id": "...", "name": "Belote", "winCondition": "HIGHEST_SCORE", "tieBreakRule": "NONE", "tieBreakCondition": "HIGHEST_SCORE" }
```

New format (v1.2):

```json
{ "id": "...", "name": "Belote", "winCondition": "HIGHEST_SCORE", "tieBreakRule": "NONE", "tieBreakCondition": "HIGHEST_SCORE", "active": true }
```

Backward compatibility: old JSON without `active` deserializes with `active = true` (unknown keys
ignored, field defaulted). No explicit migration needed.

Behaviour: `GetGameTypesUseCase` excludes archived games from the selection list; History still
resolves archived games via `GameTypeRepository.findById()` (which includes inactive ones); an
**Archive** action in the Games screen's detail view archives a game.

## Consequences

- Playing a module's game again un-archives it (ADR-0027).
