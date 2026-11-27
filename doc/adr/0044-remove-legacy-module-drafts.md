---
title: Remove the legacy module draft keys (contract)
decision: The read fallback and the per-module draft repository are removed, and at startup removeLegacyModuleDrafts erases every scoreo_module_draft_* key, accepting that a never-resaved old module draft is lost.
status: Accepted
date: 2026-11-09
sources: commit abee487, issue #611, PR #641
---

## Context

Contract phase of ADR-0043, following ADR-0042.

## Decision

The read fallback, `ModuleDraftRepository`, `LocalStorageModuleDraftRepository` and their wiring in
`createServices` are removed; `ModuleHostAdapter.loadDraft()` reads only the single draft, and
`saveDraft`/`clearDraft`/`saveMatch` write only it. At startup (`main.tsx`),
`removeLegacyModuleDrafts(localStorage)` — idempotent, guarded against a throwing `localStorage`,
returning the number of keys removed — erases every key starting with `scoreo_module_draft_`.

An old module draft never re-saved into the single slot is lost. On 27/10/2026 Rémi waived the
one-release delay between expand and contract: he had no module draft pending and accepted losing
any that remained.

## Consequences

- Only `scoreo_match_draft` holds games in progress.
