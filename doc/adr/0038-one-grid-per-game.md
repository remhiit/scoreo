---
title: One grid per game
decision: A game bound to a module is scored only on the module's grid — a single Start match button, disabled outside the manifest's player range, never redirected to the generic grid.
status: Accepted
date: 2026-10-27
sources: commit 1ccaba4, issue #605, PR #615
---

## Context

ADR-0027 left the generic grid reachable for a module-bound game ("play in Scoreo" vs "play on the
module"). Two grids for one game meant two ways of counting the same history.

## Decision

In the game selection modal, a module game (unbound module entry, `GameType` bound by `moduleId`, or
unbound homonym claimed by name) has a single **Start match** button that goes through
`BindModuleUseCase` and opens the module's grid. Outside `[minPlayers, maxPlayers]` the button is
disabled and the range shown, with no fallback to the generic grid. "Play in Scoreo" is removed.

The generic grid remains only for reopening a match without `moduleData` for that module (a v1.1
import, or a match entered before the binding), and for the `#/score/…` routes (generic drafts,
hand-typed URLs).

## Consequences

- A game without a module is unchanged.
