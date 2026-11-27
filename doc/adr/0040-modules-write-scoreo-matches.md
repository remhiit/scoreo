---
title: Modules write Scoreo matches directly, under the host's invariant
decision: A module hands back the fields of Scoreo's own Match (ModuleMatch) through ModuleHost.saveMatch, which refuses — writing nothing — any match that contradicts itself or its game's rules (assertMatchConsistent).
status: Accepted
date: 2026-11-06
sources: commit 935fb1e, issue #609, PR #625; commit ba0a228, issue #608, PR #617
---

## Context

Modules used to produce their own result shape that the host translated. Once the models lived in
`shared-domain` (ADR-0026), a module could speak Scoreo's language directly — and a scoring bug in a
module must not leave a history that disagrees with its own totals.

## Decision

- `ModuleHost` is the grid's whole access to Scoreo's data: players (retired ones included), the
  game, saving the match, and the draft. A module has no repository and no storage key of its own.
- A module hands back a `ModuleMatch`: the fields only the module can fill in (`playerScores`,
  `rounds`, `manualWinners`, `moduleData`, optional `id` to update and `date`). Scoreo sets the rest
  (`id` when absent, `date`, `gameTypeId`, `secondaryPlayerScores: []`, `moduleData.moduleId`). The
  stored shape of `Match` is the same as for any other game.
- The winners are the module's own (it knows its tie-breaks), stored as handed back, not recomputed.
- `assertMatchConsistent(match, gameType)` (`packages/shared-domain/src/matchConsistency.ts`) throws
  on: a player listed twice in `playerScores` or in one round; a round scoring a player absent from
  `playerScores`; a `manualWinners` entry absent from `playerScores`; round detail whose
  `roundDetailStatus` is inconsistent, then — stricter — `playerScores` that are not what the game's
  scoring mode derives from the rounds. `rounds: []` is accepted.
- `saveMatch` runs it **before** writing: on a refusal it throws, nothing is written and the draft is
  kept. A module's own tests run it on what the module builds.
- Re-saving a match keeps the evening it was played (`date` absent keeps the existing date).

## Consequences

- This is the executable form of the rule the v1.1 import already applied to a file.
