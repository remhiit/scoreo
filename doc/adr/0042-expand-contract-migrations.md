---
title: Expand/contract, never a breaking migration
decision: A change that moves or removes stored data is shipped in two phases — expand (write the new shape, keep reading the old one) then contract (drop the old path) — and a migration never destroys data it cannot safely carry over.
status: Accepted
date: 2026-11-07
sources: commit 20d23d2, issue #610, PR #634; precedents commits e2347ad (ADR-0015) and 8510aad (ADR-0032)
---

## Context

Several versions of the app run at once on a user's data: another tab, a service-worker cache, a
second device syncing through Drive. A one-step rename or removal breaks whichever version is still
on the old shape, and local-first data cannot be repaired afterwards (ADR-0003).

## Decision

- **Expand**: the new shape is added with a default (ADR-0004); writers move to it; readers keep a
  fallback to the old shape. Old and new versions coexist without crash; the coexistence effects are
  stated in the ADR.
- **Contract**, in a later release: the fallback and the old storage are removed, and leftovers are
  cleaned up idempotently, guarded against an unavailable `localStorage`.
- A migration never overwrites a value it does not own, and keeps the old data when keeping it is
  free (rollback stays possible).
- Shortening the delay between expand and contract is an explicit owner decision, recorded in the
  contract's ADR.

## Consequences

- First applied to the single draft slot (ADR-0043, ADR-0044).
