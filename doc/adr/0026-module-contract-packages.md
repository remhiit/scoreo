---
title: The module contract in module-api, Scoreo's models in shared-domain
decision: packages/module-api holds only what a module declares, receives and hands back, as types with no runtime code; packages/shared-domain holds the one definition of Scoreo's models that both the app and the modules use.
status: Accepted
date: 2026-08-22
sources: commit bdc1d07, issue #323, PR #324; commit ba0a228, issue #608, PR #617
---

## Context

Modules and the host need a stable border: the module must not depend on the app's internals
(repositories, use cases, storage), and the app must not import a module's code eagerly.

## Decision

Two distinct packages, on purpose:

- `packages/module-api`: `ScoringModuleManifest` (what a module declares), `ScoringModuleScreenProps`
  and `ModuleHost` (what its screen receives), `ModuleMatch` (what it hands back), `ScoringModule`.
  Types only, zero runtime code; imports only types from `shared-domain`.
- `packages/shared-domain`: `Player`, `GameType`, `Match`, `PlayerScore` (types, pure functions, zod
  schemas), the enums, `newId()`, `isUuid()`, `Result` — one definition for the whole workspace,
  re-exported by the app's `domain/model/`. Depends on `zod` only.

Repository ports, use cases and `MatchDraft` stay in the app: a module never needs them, since
everything it writes goes through `ModuleHost`.

## Consequences

- The field-level contract is documented as JSDoc in `packages/module-api/src/`.
- Since #617 the models themselves (not copies) live in `shared-domain`, so a module reads and
  writes `Match` exactly as the app does (ADR-0040).
