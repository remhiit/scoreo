---
title: Match.moduleData, the module's state stored opaquely
decision: Match gains moduleData { moduleId, version, data } | null (default null), stored and synced with the match but never read by Scoreo; the host stamps moduleId and the module owns version and migrates its own payload.
status: Accepted
date: 2026-08-22
sources: commit 506516e, issue #329, PR #332
---

## Context

A match scored on a module must be **reopenable** on that module with its grid restored. The ranking
alone is not enough: Torī needs its Objective cards and per-player detail, 1000 Sabords its turn
state.

## Decision

`Match` gains `moduleData: { moduleId, version, data } | null`.

`data` is **opaque**: Scoreo never inspects it; only the module that wrote it can read it, and
`version` belongs to the module, which migrates its own payload. A deliberate exception to domain
purity, in exchange for which the module's state is synced to Drive for free, like the rest of the
`Match`.

`moduleId` is stamped by the host, not by the module: that is what guarantees a payload is never
handed to the wrong module (`resolveEditing` refuses to give a module another module's payload;
reopening such a match starts a fresh grid).

New format:

```json
{ "id": "m1", "date": 1700000000, "gameTypeId": "gt1", "playerScores": [], "manualWinners": [], "secondaryPlayerScores": [], "rounds": [], "moduleData": { "moduleId": "tori-valley", "version": 1, "data": { "…": "…" } } }
```

Backward compatibility: `moduleData` has `.default(null)` — a match written before, or scored by
Scoreo itself, reads with `moduleData: null`. Covered by `serialization.contract.test.ts`.

## Consequences

- The draft of a module's game in progress was stored separately (ADR-0029, later ADR-0043).
