---
title: pnpm monorepo with game scoring modules loaded on demand
decision: The repository is a pnpm workspace where Scoreo (apps/scoreo) is the only deployed application and each game's dedicated score counter is a package under packages/ that Scoreo builds into a chunk loaded the first time it is opened.
status: Accepted
date: 2026-08-21
sources: commit 72a8b16, issue #314, PR #315; commit bdc1d07, issue #323, PR #324
---

## Context

Dedicated score counters existed as separate apps (Torī Valley Scoreboard, the Kotlin 1000 Sabords)
with their own players, history and deployment. They were to become part of Scoreo, sharing its
players, history, statistics and sync, without weighing on Scoreo's startup.

## Decision

- A pnpm workspace (`apps/*`, `packages/*`); every command runs from the root, fanning out with
  `pnpm -r`.
- Scoreo, `apps/scoreo/`, is the only application and the only one deployed.
- A **module** — the score-entry grid and rules of one game — is a package `packages/module-<game>/`,
  with no `index.html`, no Vite config and nothing deployed of its own. Scoreo lists it through its
  eager manifest and loads its screen lazily (`ScoringModule.load()` is a thunk): a module nobody
  opens costs zero bytes.
- Internal packages are consumed as TypeScript source (`exports` → `src/index.ts`): nothing to build
  before the app compiles.

## Consequences

- Absorbed repositories keep their history (Torī Valley); standalone shells were removed later
  (#330, #657).
- `legacy/1ksabord-kotlin/` sits outside the workspace on purpose: a Gradle project kept as a test
  oracle (ADR-0030).
