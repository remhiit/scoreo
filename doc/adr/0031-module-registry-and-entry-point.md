---
title: One registry names the modules; a module's entry point exports only its manifest and module
decision: apps/scoreo/src/modules/registry.ts is the only file in Scoreo that names a module, and a module package's entry point exports its manifest and its module and nothing else.
status: Accepted
date: 2026-08-23
sources: commit 216fe73, issue #344, PR #345; commit bdc1d07, issue #323, PR #324 (registry)
---

## Context

Modules must stay cheap to add and remove, and must not leak into Scoreo's main bundle: the registry
imports each module's entry point eagerly, so whatever that entry re-exports is reachable from the
main graph. 1000 Sabords re-exported its domain there for a while, and 8 kB of scoring rules rode
into `index.js`, chunk or no chunk.

## Decision

- `apps/scoreo/src/modules/registry.ts` is the only Scoreo file that names a module. `MODULES` holds
  the full entries; `MODULE_MANIFESTS` derives from them.
- Removing a module means deleting its folder, one import, one array entry, its row of
  `registry.test.ts`, then `pnpm install`.
- A manifest stays a plain object importing nothing but its type: Scoreo reads it eagerly.
- A module package's entry point exports its manifest and its module, nothing else; its own code
  reaches its domain by relative path. A build is the check (grep the main bundle for a string only
  the module has).
- The screen behind `load` is its own chunk; a module's strings join Scoreo's i18next instance when
  that chunk loads.

## Consequences

- The step-by-step checklist for adding a module is `.claude/skills/new-scoring-module/`.
