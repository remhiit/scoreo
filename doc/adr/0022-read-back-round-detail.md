---
title: Read the stored round detail back on re-edit and in History
decision: Re-editing a match rebuilds the editor from Match.rounds, and History shows the rounds read-only, falling back to a single round of totals when the detail is empty.
status: Accepted
date: 2026-08-16
sources: commit 7543583, issue #303, PR #304
---

## Context

Once `Match.rounds` was stored (ADR-0021), reopening a match still rebuilt a single round carrying
the totals — and saving it again destroyed the stored detail.

## Decision

- `buildInitialState()` rebuilds the editor from `match.rounds` in edit mode instead of a single
  round carrying the totals.
- The History screen offers a read-only modal listing the rounds.
- Fallbacks keep the original behaviour — a single round carrying `playerScores` — when `rounds` is
  empty (a match older than #249, or imported), or when the stored detail contradicts the totals.
  At the time, `roundsAgreeWithTotals()`: a player unknown to the match, or a per-player sum
  different from `playerScores`.

Re-opening and re-saving a match no longer destroys its round detail. Round-level statistics and
trophies stay out of scope.

## Consequences

- Since #568 (ADR-0037), `roundDetailStatus()` also accepts a count of rounds won, and an
  inconsistent detail is shown as is on re-edit and becomes authoritative on save, instead of being
  replaced by a single row.
