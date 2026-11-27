---
title: A module game's rules are read from its manifest
decision: For a game bound to a registered module, winCondition, minPlayers and maxPlayers come from the manifest, scoringMode is POINTS and tieBreakRule MANUAL_SELECTION, resolved at read time without ever rewriting the stored values.
status: Accepted
date: 2026-11-10
sources: commit 9f2356f, issue #642, PR #646; commit c62408c, PR #660 (findManifest injected, ESLint guard)
---

## Context

A module computes its own scores and winners (ADR-0040), but the stored `GameType` could carry other
rules (a homonym bound by name, a user edit), so history, statistics and Elo could disagree with
what the module decided. A semantic change, not a shape change: no field is added, renamed or
removed.

## Decision

- The manifest is the **only source** of the rules of a game bound to a registered module (found by
  `findManifest`). `applyModuleRules(gameType, manifest)` (pure, `domain/model/gameType.ts`) returns
  the game with the manifest's `winCondition`, `minPlayers`, `maxPlayers`, `scoringMode: 'POINTS'`
  and `tieBreakRule: 'MANUAL_SELECTION'` — the module's `manualWinners`, which `getWinners` returns
  on a tie for the lead. A game without `moduleId`, or whose module is not registered, is returned as
  is. `withModuleRules` (`apps/scoreo/src/modules/`) is the host's wrapper.
- `ModuleRulesGameTypeRepository` decorates `GameTypeRepository` (`getAll`, `findById`). Its writes
  keep the stored rules: re-saving a bound game (rename, archive, merge into it, binding a homonym)
  writes its other fields but leaves stored `winCondition`, `scoringMode`, `tieBreakRule`,
  `minPlayers`, `maxPlayers` untouched, so the user's rules come back if the module is unbound or
  removed, and Drive never propagates an overwrite. A game not stored yet is written as is.
- `createServices` hands the decorator to every use case **except `SyncUseCase`**, which keeps the
  raw repository: what Drive compares and uploads is unchanged.
- `UpdateGameTypeUseCase` throws `ValidationError` (nothing written) when those rules differ from the
  manifest's; name and archiving stay editable. It receives `findManifest` at construction — the
  application layer never imports `src/modules/` (ESLint `no-restricted-imports`, tests included).
- The Games screen shows those rules read-only, with no Edit.

Visible effect: a module match's `manualWinners` become the winners again (history, stats, Elo,
trophies). A device still on an older version keeps reading the stored rules until it updates.

## Consequences

- `registry.test.ts` freezes each manifest's rules (ADR-0046).
- Merging and name binding are guarded accordingly (ADR-0047); an orphaned game is ordinary
  (ADR-0048).
