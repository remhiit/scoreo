---
title: Cross-migration test on the oldest stored format
decision: One test replays a localStorage snapshot in the oldest documented format through the real adapters and checks that nothing is lost and that migration is idempotent.
status: Accepted
date: 2026-07-11
sources: commit 948bb03, issue #45, PR #54
---

## Context

The app is 100 % local-first with no backend (ADR-0003): nothing can repair a user's data after an
update. Per-field contract tests do not prove that a real old profile survives all migrations
together.

## Decision

`apps/scoreo/src/infrastructure/crossMigration.test.ts` replays, in a single `localStorage`
snapshot, the oldest format: players and game types without `active`, game types without tie-break
fields, v1 matches (12-character ids, `"YYYY-MM-DD"` dates, no `manualWinners` /
`secondaryPlayerScores`), and the legacy `scoreo_theme` key instead of `scoreo_flavor` /
`scoreo_accent` — without `scoreo_match_draft` or `scoreo_sync_config` (newer than the snapshot).

The snapshot goes through the real adapters, not fakes. Each test checks that no data is lost (same
players, same game types, same match scores after migration), and the match migration's idempotence
is checked explicitly (a second `getAll()` does not regenerate already-migrated ids).

## Consequences

- This is the only guarantee that existing users lose nothing in an update; it must stay green.
