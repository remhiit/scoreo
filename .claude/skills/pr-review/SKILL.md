---
name: pr-review
description: Review a Scoreo PR against its issue's spec — subjective checklist only (spec conformance, hexagonal architecture, zod backward-compat, doc freshness, debt introduced). Everything mechanical is already covered by ci.yml (lint/test/build/doc-links) — do not re-check those. Use when asked to review a PR in this repo, or as the R3 step in doc/technical/automation-plan.md.
---

# PR Review

Reviews what CI structurally cannot: whether the diff actually satisfies the
issue it claims to close, and whether it's honest about the repo's
architecture and backward-compat rules. See `project-conventions` for the
rules this checklist is built on.

## Which PR

- **As R3** (fired by the routine's GitHub trigger): the PR is the one from
  your triggering context — the `pull_request` event that started this run.
  Don't search for it (e.g. by scanning for `needs-review`); the trigger
  context already identifies it precisely, including when several PRs carry
  `needs-review` at once (each matching event starts its own independent
  session, one PR each).
- **Interactive** (asked directly in a session): review the PR the user
  named. Ask for the number if it wasn't given.

## Claim the run (R3 only, first action)

Before reading anything else: remove `needs-review` and add `in-progress`.
Do this immediately, before the checklist below — not after. The routine's
GitHub trigger fires on *any* `pull_request` action while `needs-review` is
present (a Routine allows one GitHub trigger, not a multi-select of
actions, so `needs-review` acts as the queue flag instead of picking
specific event types). If `needs-review` is still there when this step
posts *any* label, that label-add is itself a qualifying event and
re-triggers R3 on the same PR — clearing it first closes that door before
it can reopen. Skip this step for an ad hoc interactive review the user
asked for directly (no labels to manage there).

At this same moment, note the PR's current HEAD SHA (`pull_request_read`).
The checklist below reads the diff at this SHA — the guard just before
"Label the verdict" needs it to detect a HEAD that moved mid-review.

## Out of scope — don't re-check these

`ci.yml` already runs `lint`, `test`, `build`, `doc-links` on every push. Redoing
that by eye wastes the review on things a machine already verified with
certainty. If CI is red, that's a blocker on its own — no need to also
narrate it here.

## Checklist

1. **Spec conformance.** Open the linked issue (`Closes #N`). Does the diff
   satisfy every acceptance criterion? Is anything in the PR outside the
   issue's stated scope (scope creep, even well-intentioned) — should be
   called out.
2. **Hexagonal architecture respected.**
   - Reducers (`ui/*/`) stay pure — no repository calls, no use-case
     construction inside a reducer.
   - Use cases (`application/`) have zero framework dependency (no React
     imports, no DOM/localStorage access directly — that belongs behind a
     port).
   - New repository access goes through a `domain/port/` interface with the
     implementation in `infrastructure/`, not a direct call from application
     code.
3. **Backward-compat of serialized models.** For any change to
   `Player`/`GameType`/`Match`/`PlayerScore`: does every new field have a
   zod `.default()` in the matching `*.schema.ts`? Is every removed/renamed
   field documented in `doc/technical/migrations.md`? A missing default or
   an undocumented removal is a blocker, not a nit.
4. **Doc freshness.** Cross-check the PR's file changes against `doc/`: new
   reducer/use case/model/port/adapter/screen → matching `doc/reference.md`
   row and functional doc updated. If the code changed and the doc didn't,
   say which file is now stale.
5. **Debt introduced.** New `TODO`s, disabled tests, silenced type errors,
   copy-pasted logic that should have been a shared helper, a shortcut that
   only works for the happy path from the issue's examples. Flag it even if
   it's not blocking — that's the point of a subjective review.

## Output

State a verdict per item: conforms / doesn't conform / N/A, with a one-line
reason. End with an overall verdict:

- **Conforms** — nothing above blocks merge.
- **Needs changes** — list exactly what, scoped tightly enough that
  `address-feedback` can act on it without re-deriving the spec.

Don't soften a real blocker into a "nit" to avoid friction — a review that
never says no isn't protecting anything (see `automation-plan.md`'s risk
table: "Review sans mordant").

## Guard against a moved HEAD (R3 only, just before labeling)

Before posting any verdict label, re-read the PR's current HEAD SHA
(`pull_request_read`) and compare it to the SHA noted in "Claim the run".
If it differs, **do not post a verdict** — post `needs-review` back on its
own, in its own call, and stop there.

Why this matters: `review-status-sync.yml` stamps the `claude/review`
commit status onto `github.event.pull_request.head.sha` at the moment its
`labeled` event fires. A push landing between the start of this review
(which read the diff at the old HEAD) and the verdict label would get the
verdict's status stamped onto a commit this review never actually read.
`needs-review-label.yml`'s `synchronize` handler mostly closes this window
by re-queuing on every push, but webhook delivery order isn't guaranteed —
so this check stays load-bearing even though the race is rare. Don't drop
it as a "simplification" later.

## Label the verdict (R3 only)

No tool available to a Claude Code session here can post a raw commit
status, so the verdict surfaces as a label instead — a separate,
deterministic GitHub Action (`.github/workflows/review-status-sync.yml`)
translates it into the `claude/review` commit status. This step only
applies when running as the automated R3 step; skip it for an ad hoc
interactive review the user asked for directly.

`needs-review` is already gone (removed in "Claim the run" above) — this
step's job is to remove `in-progress` and post the terminal label:

- **Conforms** → set labels to `review-pass`, removing `in-progress`,
  `needs-fix`, and any `attempt-1`/`attempt-2`/`attempt-3` if present.
  Clearing the attempt counter matters: it's what `address-feedback` (R4)
  uses to cap retries on a *recurring* failure — leaving a stale
  `attempt-N` from an already-resolved cycle would make R4 misread a
  brand-new `needs-fix` (e.g. from a later rebase) as a continuation of
  the old one, and escalate to `needs-human` after fewer genuine attempts
  than the cap intends.
- **Needs changes** → set labels to `needs-fix`, removing `in-progress` and
  `review-pass` if present, and post a PR comment listing exactly what's
  blocking (this is what `address-feedback` will act on).

Apply exactly one of `review-pass`/`needs-fix`, never both. Re-adding
`needs-review` later (e.g. after a fix is pushed) queues another pass —
that's the mechanism R4 uses to request re-review.
