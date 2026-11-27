---
title: One draft key per module (scoreo_module_draft_<moduleId>)
decision: Each module's game in progress is saved under its own localStorage key scoreo_module_draft_<moduleId>, separate from Scoreo's anonymous match draft.
status: Superseded by ADR-0043
date: 2026-08-22
sources: commit 506516e, issue #329, PR #332
---

## Context

Scoreo's `MatchDraftRepository` had a single anonymous slot (`scoreo_match_draft`) whose `rounds`
are typed strings; it could not hold a module's turn state, and two modules would overwrite each
other in it.

## Decision

New `localStorage` key `scoreo_module_draft_<moduleId>`, one per module, behind
`ModuleHost.loadDraft/saveDraft/clearDraft`. An unreadable draft is discarded, never repaired — it is
not a source of truth.

## Consequences

- Superseded by ADR-0043: a single draft slot for every game, generic or module; the legacy keys were
  erased in the contract phase (ADR-0044).
