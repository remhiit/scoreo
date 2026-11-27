---
title: One draft slot for every game (expand)
decision: MatchDraft (scoreo_match_draft) becomes the only draft slot, generic or module, with a new moduleState { moduleId, state } | null field holding a module's opaque state; starting any game replaces the draft of another.
status: Accepted
date: 2026-11-07
supersedes: ADR-0029
sources: commit 20d23d2, issue #610, PR #634
---

## Context

Per-module draft keys (ADR-0029) meant several games could be "in progress" at once, and the Home
"Resume match" banner only knew Scoreo's own draft. The generic grid's `rounds` of typed strings
could not hold 1000 Sabords' dice, events and current turn, which must survive a reload.

## Decision

**Expand** phase (ADR-0042): `MatchDraft` (key `scoreo_match_draft`) becomes the single draft slot.
`moduleState: { moduleId: string; state: unknown } | null` carries a module's opaque state; `null`
for the generic grid. `ModuleHostAdapter.saveDraft` writes here (`rounds: []`), no longer writes
`scoreo_module_draft_<moduleId>`, and erases that old key.

New format:

```json
{ "gameTypeId": "gt1", "playerIds": ["p1", "p2"], "rounds": [], "updatedAt": 1767225600000, "moduleState": { "moduleId": "skyjo", "state": { "...": "module-specific" } } }
```

Backward compatibility: `moduleState` is `.nullable().default(null)` — an existing draft reads with
`null`. Covered by `serialization.contract.test.ts` and `localStorageMatchDraftRepository.test.ts`.

Read fallback: `ModuleHostAdapter.loadDraft()` reads `moduleState.state` when the single draft
belongs to this module and this `gameTypeId`, otherwise falls back to the old key. An old module
draft stays resumable from the module's screen, not from the Home banner; as soon as the module
re-saves, it moves into the single slot and `saveDraft` erases the old key. `clearDraft()` and saving
a match clear the single draft if it belongs to the module, and the old key.

One slot: starting a game (generic or module) replaces another game's draft in progress.

Coexistence with an older version (other tab, service-worker cache): it reads the single draft
stripping `moduleState` and takes it for a generic draft without rounds — at worst an empty grid
offered on resume.

Module-side rules: `loadDraft()` returns the state only when the slot belongs to this module and game
type; while `editing` is set a module neither writes nor clears the draft (the match is saved, the
slot belongs to a new game possibly in progress); the Home banner reopens the module's grid for such
a draft while the module is registered.

## Consequences

- Contract phase: ADR-0044.
