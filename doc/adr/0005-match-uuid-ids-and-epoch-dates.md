---
title: Match v1 → v2, UUID ids and epoch-millisecond dates
decision: Match ids become UUID v4 and match dates become epoch milliseconds, with stored v1 matches migrated automatically and idempotently on read.
status: Accepted
date: 2026-06-08
sources: commit 38096e7 (origin of the decision not found beyond it)
---

## Context

The initial format used 12-character random alphanumeric ids and ISO date strings
(`"YYYY-MM-DD"`). Ids had to be globally unique to merge data from several devices and imports, and
dates needed a time of day and plain numeric comparison.

## Decision

Schema changes on `Match`:

- `Match.id`: 12-char random → UUID v4 (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`, produced by the id
  generator, `IdGenerator.newId()` then, `newId()` today);
- `Match.date`: `String` → number (epoch milliseconds).

Migration, handled automatically by the match repository (`LocalStorageMatchRepository`,
`migrateIfNeeded()`):

1. Read the raw JSON from the `localStorage` key `scoreo_matches`.
2. For each match object:
   - if `date` is a string → parse it as a `YYYY-MM-DD` date, convert to epoch ms at UTC midnight,
     replace the value;
   - if `id` does not match the UUID v4 pattern → replace it with a new UUID v4.
3. If any object changed, write the migrated array back to `localStorage`.

Trigger: decided as running on every call to `getAll()`, idempotent — once all data is migrated,
subsequent reads skip it.

## Consequences

- Old exports and old stored data keep loading; the cross-migration test replays a v1 snapshot
  (ADR-0017).
- Today the pure function is `migrateMatches()` (`infrastructure/migration/migrateMatches.ts`), and
  the repository runs it once per instance, before its first read, rather than on every `getAll()`
  — a later optimisation (commit bb297c9, "Migration cache") that keeps the same idempotent result.
