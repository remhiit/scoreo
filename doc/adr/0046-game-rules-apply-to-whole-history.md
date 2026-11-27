---
title: A game's rules apply to its whole history
decision: A game's history is always read with the game's current rules — there are no per-match rule snapshots — so changing a game's rules is a deliberate act that rewrites how all its past matches are read.
status: Accepted
date: 2026-11-10
sources: commit 9f2356f, issue #642, PR #646 (manifest freeze in registry.test.ts); commit 94e7975, issue #568, PR #589 (rescoring on mode change)
---

## Context

Matches store scores and winners, but winners, Elo, statistics and trophies are derived from the
game type's rules when read. Keeping a rule snapshot per match would make one game count two ways.

## Decision

- The rules of a game (`winCondition`, scoring mode, tie-break, player range) apply to its whole
  history, retroactively.
- For a module-bound game, the manifest's `winCondition`, `minPlayers` and `maxPlayers` are frozen by
  `registry.test.ts` with hard-coded values per module: changing a manifest rewrites how the whole
  history of that game is read, so it must be a deliberate edit of that test too.
- For an ordinary game, changing how rounds become a score rescores the stored matches at that
  moment (ADR-0037).

## Consequences

- A rules change shows up in past winners, Elo and trophies; that is intended.
