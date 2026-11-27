---
title: Local-first, localStorage as the source of truth
decision: All data lives in the browser's localStorage, with no backend; the app must work fully offline and without any account.
status: Accepted
date: 2026-05-21
sources: commit a9aa783 (origin of the decision not found beyond the initial scaffold)
---

## Context

Scoreo tracks scores between friends. It is a static PWA (GitHub Pages) with no server, and must
work at a game table without network.

## Decision

- Players, game types and matches are stored in `localStorage` under keys prefixed `scoreo_`
  (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches`, …), through the
  `LocalStorage*Repository` adapters.
- There is no backend. Cloud sync, when it came, was made optional (ADR-0009).

## Consequences

- An app update must never lose stored data: serialized models stay backward-compatible
  (ADR-0004), and the cross-migration test is the guarantee (ADR-0017).
- `localStorage` is per origin, not per path; apps sharing the `remhiit.github.io` origin must not
  collide (ADR-0024, ADR-0032).
- Storage access is guarded where the app starts: an unavailable `localStorage` (private mode,
  quota, blocked site data) must not prevent startup.
