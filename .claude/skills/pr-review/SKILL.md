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
  Don't search for it (e.g. by scanning for `automation:needs-review`); the
  trigger context already identifies it precisely, including when several
  PRs carry `automation:needs-review` at once (each matching event starts
  its own independent session, one PR each).
- **Interactive** (asked directly in a session): review the PR the user
  named. Ask for the number if it wasn't given.

## Claim the run (R3 only, first action)

Before reading anything else: remove `automation:needs-review` and add
`automation:in-progress`. Do this immediately, before the checklist below —
not after. The routine's GitHub trigger fires on *any* `pull_request` action
while `automation:needs-review` is present (a Routine allows one GitHub
trigger, not a multi-select of actions, so `automation:needs-review` acts as
the queue flag instead of picking specific event types). If
`automation:needs-review` is still there when this step posts *any* label,
that label-add is itself a qualifying event and re-triggers R3 on the same
PR — clearing it first closes that door before it can reopen. Skip this step
for an ad hoc interactive review the user asked for directly (no labels to
manage there).

At this same moment, note the PR's current HEAD SHA (`pull_request_read`).
The checklist below reads the diff at this SHA — the guard just before
"Post the review" needs it to detect a HEAD that moved mid-review, and the
dedup check right below needs it to recognize a commit already reviewed.

## Skip a duplicate review (R3 only, right after claiming)

`.automation/routines.yml` declares `deduplicate_by: head_sha` for this
routine — this step is what actually enforces it (the dispatcher itself is
observability-only, `automation-plan.md` §4 "Dispatcher déclaratif"). Two
`labeled(automation:needs-review)` deliveries for the same commit are
possible even with "claim the run" in place (e.g. a duplicate webhook
delivery, or `requeue-lost-events.mjs` re-posing the label on a run that was
actually still in flight) — the class of double-fire behind incidents #94
and #99 (`doc/automation/state-machine.md` §5).

Read the PR's comments (`pull_request_read` `get_comments`) and find the one
whose body starts with `<!-- automation-log:pr-review -->` — the journal
`review-status-sync.yml` upserts after every verdict. If it exists, read its
`Commit analysé` and `Statut` fields:

- If `Commit analysé` equals the HEAD SHA just noted **and** `Statut` is not
  `running`, this exact commit was already reviewed by a prior run. Don't
  repeat the checklist or post a second review. Re-post the matching label
  (`succeeded` → `automation:review-pass`, `failed` → `automation:needs-fix`),
  remove `automation:in-progress`, and stop.
- Otherwise (no log comment, a different SHA, or `Statut: running` — another
  session's review is genuinely in flight right now) proceed with the
  checklist below as normal. A different SHA means a new commit landed since
  the last review, which is exactly the case that must get a fresh pass.

`review-status-sync.yml` is the only writer of this journal (§ out of
scope below) — a session running this skill never writes or edits it
itself, only reads it.

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

## Output: classify every finding

Don't collapse the checklist into a binary conforms/doesn't-conform per
item. For each issue actually found — whether it's one of the five
checklist points above or something else noticed while reading the diff —
record a **finding**: a one-line summary, a **severity**, and a **concrete
recommendation** (what to change, specific enough that `address-feedback`
or a human can act on it without re-deriving the spec — never "consider
improving X", say what X becomes).

Severity is one of:

- **`blocking`** — must be fixed before merge: doesn't satisfy an
  acceptance criterion, a reducer calling a repository directly, a missing
  zod `.default()`, an undocumented field removal.
- **`important`** — should be fixed, meaningfully weakens the change, but
  isn't on its own a reason to hold the merge open indefinitely — a stale
  doc page, real debt that isn't the happy-path shortcut kind.
- **`suggestion`** — worth doing, no material downside to merging without
  it (naming, a nearby refactor opportunity, a nice-to-have test).
- **`uncertain`** — can't be resolved from the diff alone; needs a human's
  judgment call rather than a guess in either direction.

Don't soften a real `blocking`/`important` finding into a `suggestion` to
avoid friction — a review that never says no isn't protecting anything (see
`automation-plan.md`'s risk table: "Review sans mordant"). Symmetrically,
don't inflate a `suggestion` to `blocking` to make a point — the whole
reason for four levels instead of two is so R4 (and a human reading the
review) can tell "must fix" from "worth knowing" at a glance.

The overall verdict follows directly from the findings, not a separate
judgment call:

- **`automation:review-pass`** — no `blocking` or `important` finding.
  `suggestion`/`uncertain` findings don't hold up merge on their own (issue
  #379 — "ne pas déclencher R4 sur de simples suggestions"); still surface
  them in the review so a human can act on them later if they choose to.
- **`automation:needs-fix`** — at least one `blocking` or `important`
  finding.

## Guard against a moved HEAD (R3 only, just before posting the review)

Before posting anything, re-read the PR's current HEAD SHA
(`pull_request_read`) and compare it to the SHA noted in "Claim the run".
If it differs, **do not post a review or a verdict label** — post
`automation:needs-review` back on its own, in its own call, and stop there.

Why this matters: `review-status-sync.yml` stamps the `claude/review`
commit status onto `github.event.pull_request.head.sha` at the moment its
`labeled` event fires. A push landing between the start of this review
(which read the diff at the old HEAD) and the verdict label would get the
verdict's status stamped onto a commit this review never actually read.
`needs-review-label.yml`'s `synchronize` handler mostly closes this window
by re-queuing on every push, but webhook delivery order isn't guaranteed —
so this check stays load-bearing even though the race is rare. Don't drop
it as a "simplification" later.

## Post the review (R3 only)

One formal PR review is this commit's single synthesis — the dedup guard
above is what keeps that to one per SHA, this step is just how it's shaped.
Reserve inline comments for findings tied to a specific file/line that are
actionable there and then; anything broader (spec conformance as a whole, a
doc page that should have been updated, a pattern spanning several files)
goes only in the review's summary body, not scattered as inline noise.

1. `pull_request_review_write` `method: create`, no `event` — opens a
   pending review at the noted HEAD SHA (`commitID`).
2. For each localized, actionable finding, `add_comment_to_pending_review`
   with the `path`/`line` it applies to, body starting with its severity
   (e.g. `**blocking**: ...`) followed by the recommendation.
3. `pull_request_review_write` `method: submit_pending`, `event: COMMENT` —
   **never** `APPROVE` or `REQUEST_CHANGES` (no auto-approval mechanism,
   `automation-plan.md` §3). The submit `body` is the synthesis: every
   finding (inline ones too, so the review reads standalone) grouped by
   severity, plus the overall verdict line from "Output" above.

Skip this step for an ad hoc interactive review the user asked for
directly — just report the findings and verdict in the conversation.

## Label the verdict (R3 only)

No tool available to a Claude Code session here can post a raw commit
status, so the verdict surfaces as a label instead — a separate,
deterministic GitHub Action (`.github/workflows/review-status-sync.yml`)
translates it into the `claude/review` commit status. This step only
applies when running as the automated R3 step; skip it for an ad hoc
interactive review the user asked for directly.

`automation:needs-review` is already gone (removed in "Claim the run"
above) — this step's job is to remove `automation:in-progress` and post the
terminal label, right after the review from "Post the review" above is
submitted:

- **`automation:review-pass`** → removing `automation:in-progress`,
  `automation:needs-fix`, and any
  `automation:attempt-1`/`automation:attempt-2`/`automation:attempt-3` if
  present. Clearing the attempt counter matters: it's what
  `address-feedback` (R4) uses to cap retries on a *recurring* failure —
  leaving a stale `automation:attempt-N` from an already-resolved cycle
  would make R4 misread a brand-new `automation:needs-fix` (e.g. from a
  later rebase) as a continuation of the old one, and escalate to
  `automation:needs-human` after fewer genuine attempts than the cap
  intends.
- **`automation:needs-fix`** → removing `automation:in-progress` and
  `automation:review-pass` if present. The submitted review already lists
  every `blocking`/`important` finding with its recommendation — that's
  what `address-feedback` acts on, nothing further to post here.

Apply exactly one of `automation:review-pass`/`automation:needs-fix`, never
both. Re-adding `automation:needs-review` later (e.g. after a fix is
pushed) queues another pass — that's the mechanism R4 uses to request
re-review.
