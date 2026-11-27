---
title: GameType.moduleId and lazy binding of a game to its module
decision: GameType gains moduleId (default null), stamped lazily by BindModuleUseCase the first time a module is played, never exported in the v1.1 file format.
status: Accepted
date: 2026-08-22
sources: commit 26593eb, issue #326, PR #327; commit c0e262b, issue #551, PR #552 (resolveBindingTarget)
---

## Context

Game-specific counters became modules loaded by Scoreo (ADR-0025). Scoreo must know which module can
score which `GameType`, without materializing anything at startup: a fresh profile must show no game
until one has been played.

## Decision

`GameType` gains `moduleId: string | null`. At first it was a **capability flag**, not a redirection
(the generic score screen stayed reachable; see ADR-0038 for the later "one grid per game").

Binding is lazy, in `BindModuleUseCase`, when someone chooses to play on the module:

1. a `GameType` already carries this `moduleId` → reuse it, whatever its name has become;
2. otherwise a `GameType`'s name is one the manifest claims (`gameNames`, case-insensitive,
   ignoring surrounding blanks) → stamp `moduleId` onto it — the common case of a history created by
   a v1.1 import;
3. otherwise create the `GameType` now, from the manifest.

Rule 1 makes the operation idempotent. Rules 1 and 2 un-archive the game: playing a game is asking
for it back. Rules 1 and 2 live in one pure function, `resolveBindingTarget`, also used by the game
selection modal, so the game it launches is by construction the one the binding picks.

Old format:

```json
{ "id": "gt1", "name": "Belote", "winCondition": "HIGHEST_SCORE", "tieBreakRule": "NONE", "tieBreakCondition": "HIGHEST_SCORE", "tieBreakLabel": null, "active": true }
```

New format: the same with `"moduleId": null`.

Backward compatibility: `moduleId` has `.default(null)` — an older `GameType` decodes unbound, and
stays so until a module is played. Covered by `serialization.contract.test.ts` (with and without
`moduleId`).

**The field never leaves the installation in the v1.1 JSON.** The file contract travels to
installations where module ids mean nothing. In return, `ImportMatchesUseCase.resolveGameType`
consults the manifests as a second resort: when the file's game name matches no local game but a
module claims it, the game already bound to that module is reused — otherwise a bound then renamed
game would be imported again under its old name, next to itself.

## Consequences

- `moduleId` (manifest field) is stable forever and never derived from a name.
- The modal lists a registered module as a game unless `resolveBindingTarget` resolves to a game
  bound to it or an active homonym, which then stands for the module.
- Rule 2 is later restricted to consistent homonyms (ADR-0047).
- The capability-flag reading (the generic grid still reachable for a bound game) is replaced by
  ADR-0038, "one grid per game": a bound game is now scored only on its module's grid. The field,
  its lazy binding rules and its absence from the v1.1 file format stay in force.
