---
title: Auto-saved match draft
decision: A match in progress is auto-saved as a MatchDraft under scoreo_match_draft after each score update, so it can be resumed from Home.
status: Accepted
date: 2026-06-24
sources: commit e04871d; commit a7e97d5 (Home resume banner)
---

## Context

A page reload, a closed tab or a phone locking mid-game must not lose the scores entered so far.

## Decision

Schema version: v1.x → v1.3+.

New model `MatchDraft`, stored in `localStorage` under `scoreo_match_draft`, with fields:

- `gameTypeId: String`
- `playerIds: List<String>`
- `rounds: List<Map<String, String>>` (the rounds as typed)
- `timestamp: Long`

Backward compatibility: a new key; existing users simply have no draft. No migration needed.

Behaviour: the score-entry screen saves the draft after each score update; Home shows a "Resume
match in progress" banner while a draft exists.

## Consequences

- One anonymous slot. Modules first got their own keys (ADR-0029), then joined this single slot
  (ADR-0043).
- The field documented as `timestamp` is `updatedAt` in today's schema
  (`matchDraft.schema.ts`, `.default(() => Date.now())`).
