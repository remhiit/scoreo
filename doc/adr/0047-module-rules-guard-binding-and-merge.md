---
title: Name binding and merging must stay consistent with a module game's rules
decision: Binding by name only takes a homonym in effective POINTS mode whose every match passes assertMatchConsistent under the module's rules, and merging refuses to fold a module-bound duplicate into another game or to move inconsistent matches into a module game.
status: Accepted
date: 2026-11-17
sources: commit fa3067c, issue #643, PR #651; commit 41621b6, PR #662
---

## Context

Rule 2 of the binding (ADR-0027) stores the `moduleId` but, through the decorator (ADR-0045), keeps
the homonym's stored rules and does not recompute its matches; merging could likewise bring into a
module game matches its rules contradict.

## Decision

- **Name binding** only takes a homonym whose effective scoring mode is `POINTS` and whose every match
  passes `assertMatchConsistent` under the module's rules; a refused homonym stays an ordinary game
  and rule 3 creates the bound one. Rule 2 takes the first name match of `getAll(true)`, archived
  games included; with several homonyms, the launch is only offered on the one rule 2 would bind.
- **Merging** (`MergeGameTypesUseCase`) refuses with `ValidationError`, before writing anything, to
  fold a module-bound duplicate into a game bound to anything else, and — when the kept game is
  module-bound — any moved match that, rescored under its resolved rules, fails
  `assertMatchConsistent` (a rounds-won match without detail cannot be turned back into points). It
  receives `findManifest` at construction. A game's `moduleId` is never changed by a merge.
- The Games screen shows the refusal through its usual merge error, with a translated reason.

## Consequences

- Rules from the manifest cannot diverge from a module game's matches through binding or merging.
