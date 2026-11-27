---
title: A port is checked against its original by a differential golden test
decision: The TypeScript port of 1000 Sabords is verified against the Kotlin implementation, kept in legacy/ as an oracle, by a shared corpus both sides must turn into the same v1.1 export byte for byte.
status: Accepted
date: 2026-08-22
sources: commit 7fbafd5, issue #342, PR #343; commit e0b814b (Kotlin tests in CI)
---

## Context

Porting 416 lines of scoring rules blind is how a scoring bug ships. Reading the diff of a rewrite
proves nothing; two implementations agreeing on a corpus proves something.

## Decision

- `legacy/1ksabord-kotlin/` keeps the Kotlin/JS app, absorbed with its history, outside the pnpm
  workspace (a Gradle project). `.github/workflows/kotlin-legacy.yml` runs its tests on every pull
  request; nothing is developed there.
- `packages/module-mille-sabords/tests/golden/` holds one corpus of finished games and the v1.1
  envelope the Kotlin code produces from it. Both sides replay it (`GoldenExportTest` in Kotlin,
  `exportScoreo.golden.test.ts` in TypeScript), compared byte for byte; neither can drift without
  the other going red.
- The corpus deliberately includes a game where a Skull Island drives a player below zero, who then
  scores again: the clamp applies at every turn, not on the total.
- The Kotlin export logic was extracted (`construireEnveloppeExport`) so the test exercises the
  shipped path, not a copy.

## Consequences

- The legacy tree and its workflow are deleted once the port is delivered.
