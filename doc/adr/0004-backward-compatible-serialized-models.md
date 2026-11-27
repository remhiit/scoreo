---
title: Serialized models stay backward-compatible
decision: Data stored by any earlier version must remain readable after an update; adding a field always comes with a default, and removing, renaming or retyping a field requires a documented migration.
status: Accepted
date: 2026-05-21
sources: commit a9aa783 (ignoreUnknownKeys + defaults); commit 66cee9e (rule written in CLAUDE.md); commit 1e8de5b, PR #50 (zod form)
---

## Context

All data lives on the user's device (ADR-0003). There is no server-side migration and no way to
repair a user's data after the fact. Several app versions also coexist: an old tab, a service-worker
cache, or another device syncing through Drive.

## Decision

Any change to a serialized domain model must be backward compatible with at least the previous
version. Applies to `Player`, `GameType`, `Match`, `PlayerScore` and their enums (`WinCondition`,
`ScoringMode`), and to `MatchDraft`.

- **Adding a field**: always declare a default (`.default()` in the zod schema; formerly a Kotlin
  default value), so old data deserializes cleanly. Unknown keys are stripped on read
  (`ignoreUnknownKeys` in Kotlin, zod's native strip today).
- **Renaming or removing a field**: a migration step (read the old shape, transform, write the new
  one), documented as an ADR.
- **Never change the type of an existing field** without a migration.

## Consequences

- `serialization.contract.test.ts` holds one case per legacy shape: an old JSON still decodes with
  the same defaults.
- A new enum value would break an older version's parsing; a new concept goes in a new field instead
  (see ADR-0037).
- Soft-delete (`active`) is preferred over deletion, so history stays readable (ADR-0007, ADR-0013).
