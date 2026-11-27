---
title: A game whose module is no longer registered is an ordinary game
decision: A game whose moduleId names no registered module keeps its moduleId but is treated as an ordinary game everywhere the host reads isModuleGame/findManifest, and is bound again if the module comes back.
status: Accepted
date: 2026-11-23
sources: commit bd3f264, issue #664, PR #667
---

## Context

The edit form and `MergeGameTypesUseCase` judged "module game" on `moduleId !== null`, while the
documentation and the detail view already treated a game whose module was removed as ordinary.

## Decision

- "Module game" means a **registered** module (`isModuleGame`, `findManifest`). An orphaned game keeps
  its stored `moduleId` and is otherwise ordinary: its detail and its edit form (player range fields
  included) are the ordinary ones; merging treats it as ordinary on either side (folded into an
  ordinary game, its `moduleData` matches keep their scores; kept, with no `assertMatchConsistent`
  guard), except that it is still refused into a game bound to a different registered module.
- Only the domain's `scoringModeIsSelectable`/`effectiveScoringMode`, which look at `moduleId` alone,
  keep it in points.
- If the module comes back, the game is bound again and its rules re-read from the manifest; a range
  edited in the meantime is ignored on read.

## Consequences

- Removing a module from the registry never locks its games.
