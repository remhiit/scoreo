---
title: A module manifest's rules are frozen by a test
decision: The winCondition, minPlayers and maxPlayers of each module's manifest are frozen by registry.test.ts with hard-coded values per module, so changing them — which rewrites how that game's whole history is read — must be a deliberate edit of that test too.
status: Accepted
date: 2026-11-10
sources: commit 9f2356f, issue #642, PR #646 (manifest freeze in registry.test.ts)
---

## Context

A game's history is always read with its current rules, retroactively (ADR-0037). Since a
module-bound game's rules come from its manifest (ADR-0045), a one-line edit of a manifest would
silently rewrite the winners, Elo and trophies of every past match of that game.

## Decision

- `registry.test.ts` asserts, with hard-coded values per module, the manifest's `winCondition`,
  `minPlayers` and `maxPlayers`.
- Changing one of them is allowed, but only as a deliberate act: the same change must edit that test.

## Consequences

- A manifest rules change is visible in review as a change to `registry.test.ts`; once merged it
  shows up in the game's past winners, Elo and trophies, as intended.
