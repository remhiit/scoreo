# Automation state machine

The formal contract behind `doc/technical/automation-plan.md`: every state an
issue or a pull request can be in, every event that moves it, which
component owns that transition, and whether it's automatic or requires a
human. `automation-plan.md` stays the narrative — architecture rationale,
phases, incidents. This document is the reference table an implementer (or a
routine's own skill file) checks against to answer "given this label state
and this event, what happens next" without ambiguity.

If the two ever disagree, treat it as a bug: either this table is stale
(update it) or a routine no longer matches its documented contract (fix the
routine). `automation-plan.md` §4–§9 documents the reasoning and the
incidents that shaped each rule below; this file doesn't repeat that
history, only the resulting contract.

All automation labels carry the `automation:` prefix (issue #415 — a
migration from the earlier unprefixed names `queued`/`ready`/`in-progress`/
`needs-review`/`review-pass`/`needs-fix`/`needs-human`/`attempt-1`/
`attempt-2`/`attempt-3`/`auto`, kept only in already-marked historical
sections of `automation-plan.md`). Priority labels (`P0`…`P3`) and `blocked`
are business labels, outside this migration.

## 1. Entities

Two independent label-driven state machines, **Issue** and **Pull
Request**, each layered on top of GitHub's own open/closed axis (orthogonal
to the labels below — an issue can be open with any control label, or
closed with `state_reason` `completed`/`not_planned`).

A PR is always linked to the issue it closes (`Closes #N`); the issue's own
`automation:in-progress` label persists for the PR's entire review/fix
lifecycle — R2 sets it once and nothing touches it again until the PR merges
(issue closes) or a human intervenes. The PR's labels below are what
actually cycles.

## 2. Labels: six categories

| Label | Category | Meaning | Set by | Cleared by |
|---|---|---|---|---|
| `P0`…`P3` | Business | Priority, independent of pipeline state | R1 (human, at grooming) | Never automatically |
| `blocked` | Business | Issue has an open native `blocked_by` dependency | R1 (human, alongside a `## Dépendances` section) — no automation ever sets it | `unblock-issues.yml`, once every native blocker is closed |
| `automation:queued` | État/file | Spec validated, waiting for a dispatch slot | R1 (issue), `unblock-issues.yml` (dependent issue, once unblocked) | `dispatch-ready.mjs` |
| `automation:ready` | État/déclencheur R2 | Dispatched, next in line for R2 — this is R2's trigger | `dispatch-ready.mjs`, `requeue-lost-events.mjs` (re-posing an orphaned one) | R2 (`implement-task`), in its first action |
| `automation:in-progress` | Contrôle | A routine currently owns this item ("claim the run") | R2 on an issue; R3 or R4 on a PR | The routine that set it, once its run ends (success, stop-and-ask, or escalation) |
| `automation:needs-review` | File/déclencheur R3 | PR queued for R3 — this is R3's trigger | `needs-review-label.yml` (PR opened/ready/synchronize) | R3 (`pr-review`), in its first action |
| `automation:attempt-1`/`automation:attempt-2`/`automation:attempt-3` | Compteur | R4's anti-loop retry counter on a PR | R4 (`address-feedback`), after a fix is pushed | R4 itself (old counter, before posting the new one), or R3 on `automation:review-pass` (clears a stale counter) |
| `automation:review-pass` | Verdict | R3's verdict: PR conforms to its issue's spec | R3 | R3, if a later review overturns it to `automation:needs-fix`; `needs-review-label.yml` (clears a stale one, on synchronize) |
| `automation:needs-fix` | Verdict **et** file/déclencheur R4 | R3's verdict: PR needs changes — **also** R4's trigger (dual role, see below) | R3 | R4, in its first action; `needs-review-label.yml` (clears a stale one, on synchronize) |
| `automation:needs-human` | Escalade | Terminal escalation: automation cannot resolve this without a decision | R4 (attempt cap or scope mismatch on a PR); R2 (incomplete/ambiguous spec) | Only a human, by removing it and re-queuing |
| `automation:enabled` | Autorisation | Eligible for auto-merge once required checks are green | R2 only, when the diff matches the risk-Faible whitelist (`automation-plan.md` §5) | R4, on escalation to `automation:needs-human` |

No `automation:done` label exists or is ever created: GitHub's own issue
closure and its `state_reason` (`completed`, `not_planned`, `duplicate`)
remain the sole signal that an issue's lifecycle has ended.

**Valid combinations** — at most one label per category above can be
present on a given item at a time, except: a queue/state label
(`automation:queued`/`automation:ready`/`automation:in-progress`/
`automation:needs-review`) may coexist with at most one counter
(`automation:attempt-N`) and/or `automation:enabled`. **Invalid
combinations**, which `scripts/migrate-automation-labels.mjs` refuses to
resolve automatically (§5 below of `automation-plan.md`'s issue #415 spec):
more than one `automation:attempt-N` at once; `automation:review-pass` and
`automation:needs-fix` together; `automation:needs-human` together with any
of `automation:ready`/`automation:needs-review`/`automation:needs-fix`; an
old unprefixed label alongside its new prefixed equivalent past the cutover.

**`automation:needs-fix` is deliberately dual-role**: it is both R3's
verdict *and* the label whose presence is R4's GitHub trigger filter. There
is no separate "queue label" for R4 the way `automation:needs-review`
decouples PR-opened from R3 — the verdict itself is the queue. This is why
R4's first action removes `automation:needs-fix` before doing anything else
(§5): as long as it's present, any further label write on the PR re-matches
R4's trigger.

## 3. Components: versioned routines vs. deterministic actions

A **routine** is a Claude Code session invoked by a GitHub trigger or a
schedule; its entire behavior is the linked skill file's content — no other
state. "Versioned" means exactly that: the routine's version *is* the git
history of `.claude/skills/<name>/SKILL.md`. Changing what a routine does is
an ordinary PR through this same pipeline — reviewable, revertable, subject
to the same `pr-review` checklist as any other change.

An **action** is a GitHub Actions workflow: deterministic, zero LLM, never
judges anything subjective (`automation-plan.md` §2 principle 2).

| Component | Kind | Trigger | Implementation |
|---|---|---|---|
| R1 — grooming | Interactive only, never a routine | A human says "Plan"/"crée une issue" | `.claude/skills/issue-to-spec/SKILL.md` |
| R2 — implementation | Versioned routine | `issues` `labeled`, filter `automation:ready` | `.claude/skills/implement-task/SKILL.md` |
| R3 — review | Versioned routine | `pull_request`, any action, filter `automation:needs-review` | `.claude/skills/pr-review/SKILL.md` |
| R4 — fix | Versioned routine | `pull_request` `labeled`, filter `automation:needs-fix` | `.claude/skills/address-feedback/SKILL.md` |
| R5 — hygiene | Versioned routine, scheduled | Cron, weekly (Monday 06:00 UTC) | `.claude/skills/site-quality/SKILL.md` |
| R6 — report | Versioned routine, scheduled (not yet created — Phase 6 rodage pending, see `automation-plan.md` §7) | Cron, weekly (planned) | `.claude/skills/weekly-report/SKILL.md` |
| `automation-dispatch.yml` (`scripts/automation-dispatch.mjs`) | Action | `issues`/`pull_request` `labeled` | Resolves and logs which routine/skill/entity/target_label matches the event, per the declarative mapping in `.automation/routines.yml` (documented by `schemas/automation/routines.schema.json`) — read-only, doesn't replace the routines' own triggers or any workflow below |
| `automation-config` (job in `ci.yml`, same script) | Action | `pull_request` (CI) | Validates `.automation/routines.yml` against the same resolver — an invalid config (e.g. two routines on the same `entity`/`trigger_label`, the class of bug behind #99) fails CI clearly |
| `dispatch-ready.mjs` | Action | Same workflow as the sweeper below | Promotes one `automation:queued` issue to `automation:ready` |
| `needs-review-label.yml` | Action | `pull_request` opened/ready_for_review/synchronize | Clears stale `automation:review-pass`/`automation:needs-fix`, poses `automation:needs-review` |
| `review-status-sync.yml` | Action | `pull_request` `labeled`, filter `automation:review-pass`/`automation:needs-fix` | Translates the label into the `claude/review` commit status; also upserts the PR's `pr-review` entry in `scripts/automation-log.mjs`'s idempotent journal |
| `scripts/automation-log.mjs` | Helper (called by an Action, not a workflow of its own) | N/A | Finds/creates/updates a routine's single marked journal comment on an issue/PR (`automation-plan.md` § Journal d'exécution idempotent) |
| `auto-merge-sync.yml` | Action | `pull_request` labeled/unlabeled, filter `automation:enabled` | Enables/disables native GitHub auto-merge; on success, closes linked issues in the same job |
| `requeue-lost-events.yml` (`requeue-lost-events.mjs`) | Action | Cron hourly + `issues` unlabeled/closed | Re-poses an orphaned `automation:ready`/`automation:needs-review`/`automation:needs-fix` still present > 30 min without `automation:in-progress` |
| `requeue-lost-events.yml` (`sweep-merged-prs.mjs`) | Action | Same workflow, runs after the sweeper above | Catch-up close of issues left open by a PR merged in the last 7 days |
| `unblock-issues.yml` | Action | `issues` `closed`, filter `state_reason == completed` | Promotes dependents to `automation:queued` once every native blocker is closed |
| `sync-issue-dependencies.yml` | Action | `issues` opened/edited | Parses `## Dépendances`, posts the native `blocked_by` link |
| `close-linked-issues.yml` | Action | `pull_request` `closed`, filter `merged == true` | Closes issues referenced by `Closes #N` (manual-merge path) |
| `project-sync.yml` | Action | labeled/unlabeled/closed + cron 6h | One-way sync: labels → Project `Status` field |
| `scripts/migrate-automation-labels.mjs` | One-shot migration tool (not a workflow) | Run manually by a repo admin | Migrates every open issue/PR from the unprefixed labels to their `automation:`-prefixed equivalent, idempotently, refusing to touch an item with an incompatible label combination (§2 above) |

## 4. Complete transition table

Every row is `current state → event → actor → target state`. "Owner" says
whether the transition fires without a human (**Auto**) or requires one
(**Human**).

| # | Entity | Current state | Event | Actor | Target state | Owner |
|---|---|---|---|---|---|---|
| 1 | Issue | No control label | R1 grooming session confirms the spec, readiness verdict `READY_FOR_IMPLEMENTATION` (`issue-to-spec/SKILL.md` § Determining the readiness verdict — a `NEEDS_CLARIFICATION` verdict never reaches this row, no issue is created until it clears) | R1 (human) | `P0`…`P3` + `automation:queued` (own calls, `automation:queued` last) | Human |
| 1b | Issue | No control label | Same, but readiness verdict `BLOCKED_BY_DEPENDENCY` (spec complete, `## Dépendances` cites an open blocker) | R1 (human) | `P0`…`P3` + `blocked` (own calls, `blocked` last) instead of `automation:queued` — row #10 promotes it to `automation:queued` once every native blocker closes | Human |
| 2 | Issue | `automation:queued` | Sweeper cron/trigger fires, nothing `automation:ready`/`automation:in-progress`, ≤2 PRs `automation:needs-review` | `dispatch-ready.mjs` | `automation:ready` (highest priority, oldest first) | Auto |
| 3 | Issue | `automation:queued` | Sweeper fires but a slot is occupied, or the `automation:needs-review` backlog > 2 | `dispatch-ready.mjs` | `automation:queued` (no-op) | Auto |
| 4 | Issue | `automation:ready` | `issues.labeled(automation:ready)` | R2 (`implement-task`) | `automation:in-progress`; deterministic branch (created or reused if a prior interrupted run left one), a short plan written before any change, code, tests, doc, PR opened with `Closes #N` plus the plan and validation results in its body; `automation:enabled` posed only if risk stays Faible | Auto |
| 5 | Issue | `automation:ready` | `issues.labeled(automation:ready)` fires but the issue is no longer actionable (already claimed, closed, or an open PR already references it via `closed_by_pull_requests`) | R2 | `automation:ready` unchanged — R2 does nothing else, never picks a different issue, never opens a second PR | Auto (guard) |
| 6 | Issue | `automation:ready` | Spec turns out ambiguous/incomplete (including an unverifiable definition of done, a `blocked` label that shouldn't have reached `automation:ready`, or a check suite that can't be made green) once R2 reads it fully or finishes implementing | R2 | `automation:in-progress` → `automation:needs-human`; comment naming what's missing or failing | Human (escalated) |
| 7 | Issue | Posed `automation:ready` > 30 min ago, still `automation:ready` (lost event, run-cap exceeded) | Hourly cron | `requeue-lost-events.mjs` | `automation:ready` removed then re-posed alone (regenerates the `labeled` event) | Auto |
| 8 | Issue | `automation:in-progress`, PR linked | PR merges, `close-linked-issues.yml` or the same-job close in `auto-merge-sync.yml` runs | Action | Issue closed, `state_reason: completed` | Auto |
| 9 | Issue | `automation:in-progress`, PR linked and merged, but the immediate close missed (wait loop expired) | Hourly cron, within the 7-day catch-up window | `sweep-merged-prs.mjs` | Issue closed | Auto (catch-up) |
| 10 | Issue | Closed, `state_reason: completed`, was blocking others | `issues.closed` | `unblock-issues.yml` | Each dependent with every native blocker now closed: `blocked` removed, `automation:queued` posed | Auto |
| 11 | Issue | Any (new or edited body carries `## Dépendances`) | `issues` opened/edited | `sync-issue-dependencies.yml` | Native `blocked_by` link posed per cited blocker (own no-op on 422/not-found) | Auto |
| 12 | PR | Opened (no control label yet) | `pull_request` opened/ready_for_review/synchronize | `needs-review-label.yml` | Stale `automation:review-pass`/`automation:needs-fix` cleared, then `automation:needs-review` posed | Auto |
| 13 | PR | `automation:needs-review` | `pull_request` event while `automation:needs-review` present | R3 (`pr-review`) | `automation:in-progress` (claim), then either `automation:review-pass` (conforms) or `automation:needs-fix` (+ PR comment) once the diff at the noted HEAD SHA is reviewed | Auto |
| 14 | PR | `automation:needs-review`, R3 about to label | HEAD SHA moved mid-review (a push landed) | R3 | `automation:needs-review` re-posed alone, no verdict | Auto (guard) |
| 15 | PR | `automation:review-pass` | Nothing — required checks (`lint`/`test`/`build`/`doc-links`/`e2e`/`claude/review`) still pending or red | *(none)* | `automation:review-pass` unchanged — native branch protection withholds merge independently of labels | Auto (native GitHub, no routine involved) |
| 16 | PR | `automation:review-pass` (+ `automation:enabled` if eligible) | Every required check green | Native GitHub auto-merge (if `automation:enabled` present) | PR merges → issue closes (#8/#9) | Auto |
| 17 | PR | `automation:needs-fix` | `pull_request.labeled` while `automation:needs-fix` present | R4 (`address-feedback`) | `automation:needs-fix` and any stale `automation:attempt-N` removed, `automation:in-progress` posed (claim) — all before deciding the attempt number | Auto |
| 18 | PR | `automation:in-progress` (R4 claimed, attempt N ≤ 3) | Fix implemented, full check suite green, pushed | R4 | `automation:in-progress` removed, `automation:attempt-N` posed; push retriggers #12 | Auto |
| 19 | PR | `automation:in-progress` (R4 claimed, would be attempt 4, i.e. `automation:attempt-3` was already present) | Attempt cap reached | R4 | `automation:in-progress` removed, `automation:enabled` removed if present, `automation:needs-human` posed; comment summarizing what's still wrong | Human (escalated) |
| 20 | PR | `automation:in-progress` (R4 claimed, any attempt) | The flagged fix turns out to need a materially larger change than the review anticipated | R4 | Same as #19: `automation:needs-human`, `automation:enabled` removed, explanatory comment — treated as the cap regardless of the attempt number | Human (escalated) |
| 21 | PR | `automation:needs-review` again (re-queued by #18's push) | `pull_request` synchronize | `needs-review-label.yml` | `automation:needs-fix` removed (stale), `automation:needs-review` posed → back to #13 | Auto |
| 22 | PR | `automation:review-pass` | Later review reopens it | R3 | `automation:attempt-*` cleared alongside the verdict, so a later unrelated `automation:needs-fix` starts its own cap fresh | Auto |
| 23 | PR or Issue | Posed `automation:needs-review`/`automation:needs-fix` > 30 min ago, no `automation:in-progress` (lost event) | Hourly cron | `requeue-lost-events.mjs` | Label removed then re-posed alone | Auto |
| 24 | PR or Issue | `automation:needs-human` | — | — | Terminal: `unblock-issues.mjs` and `dispatch-ready.mjs` both explicitly skip any item carrying it | Human only, by removing it and re-queuing |

## 5. The R3 ↔ R4 loop

`automation:needs-review` and `automation:needs-fix` cycle through rows
#12–#22 above until one of two terminal outcomes: `automation:review-pass`
survives a full review (merge path), or the attempt cap is hit
(`automation:needs-human`, row #19/#20).

- **Claim the run, always first.** Both R3 and R4 remove their trigger label
  (`automation:needs-review`, `automation:needs-fix`) *before* posing any
  other label — including before deciding whether to proceed. A trigger
  label left in place while a later label-write happens re-matches the same
  GitHub filter and re-fires the routine on its own writes. This exact bug
  produced a runaway `automation:attempt-1` → `automation:attempt-2` →
  `automation:attempt-3` chain in about a minute on PR #111
  (`automation-plan.md` §4, Phase 5) before the ordering rule was fixed.
- **The attempt counter is read before it's cleared.** R4 looks at whichever
  of `automation:attempt-1`/`automation:attempt-2`/`automation:attempt-3` is
  present *before* removing it, to compute this run's number (no label →
  attempt 1; `automation:attempt-1` present → attempt 2;
  `automation:attempt-2` present → attempt 3, the last one allowed). It then
  clears the old label immediately (claim step) and only adds the new one
  once the fix is actually done and pushed — so a run that stops early
  (rows #19/#20) never posts a counter for work it didn't finish.
  Interactive invocations apply the same read, even with no labels to
  manage — an issue already at `automation:attempt-3` doesn't get a fourth
  try just because a human ran the skill by hand.
- **`automation:review-pass` resets the counter.** R3 clears any
  `automation:attempt-*` label when it reaches `automation:review-pass`
  (row #22), so a stale counter from an already-resolved cycle never makes
  an unrelated later `automation:needs-fix` (e.g. from a rebase) look like a
  continuation and escalate after fewer than three real attempts.
- **Cap is 3, not "3 pushes".** Rows #19 and #20 both land on
  `automation:needs-human` the moment either condition is met — three
  genuine fix attempts *or* a single attempt revealing the fix is out of the
  review's stated scope. Both are the same signal: the disagreement between
  what was asked and what's feasible isn't resolving by iterating, so a
  human decides instead of a fourth (or a scope-expanding) guess.

## 6. Recovery, failure and retry rules

- **A run cap being hit loses the event, not queues it** (`automation-plan.md`
  §3). Because every trigger label is only ever removed by the routine that
  claims it ("claim the run", §5), an event lost to the cap is legible after
  the fact: the trigger label (`automation:ready`/`automation:needs-review`/
  `automation:needs-fix`) is still sitting there, unclaimed, past a
  threshold no real run would take. `requeue-lost-events.yml` (hourly cron +
  `issues` unlabeled/closed) checks every such item's last `labeled`
  timeline event; past 30 minutes with no `automation:in-progress`, it
  removes and re-poses the label alone, in its own call, regenerating the
  `labeled` event the routine's trigger matches. Retry is unbounded and
  blind — there's no way to query remaining routine quota from GitHub, so a
  still-exhausted quota just leaves the label for the next hourly pass. An
  item stuck for days is a signal for R6 to flag a broken routine, not a
  quota problem.
- **A merge whose close-out never lands gets a 7-day catch-up window.**
  `auto-merge-sync.yml` waits, in the same job, for its own auto-merge to
  complete (poll, ~20 min cap) before closing linked issues — a workaround
  for GitHub's rule that events caused by `GITHUB_TOKEN` never start a new
  workflow run, which is why a separate `close-linked-issues.yml` can't see
  a bot-authored merge (`automation-plan.md` §7, Phase 5 incident). If that
  wait loop itself expires before the merge actually completes (observed on
  PR #264), `sweep-merged-prs.mjs` — run by the same hourly sweeper, right
  before the dispatcher — re-closes any issue whose linked PR merged within
  the last 7 days, idempotently (never re-`PATCH`es an already-closed
  issue).
- **`automation:needs-human` is terminal for every piece of automation that
  reads it.** `dispatch-ready.mjs` skips a candidate carrying it (row #3's
  eligibility filter, `pickNextQueued`); `unblock-issues.mjs` skips it too
  (`BLOCKING_LABELS`), logging that a human must re-queue. No workflow ever
  removes `automation:needs-human` — only a human, by clearing it and
  re-applying whatever control label restarts the pipeline
  (`automation:queued` for an issue, `automation:needs-review` for a PR).
- **`automation:in-progress` is the one label three different routines (R2,
  R3, R4) all use as "I currently own this."** It never carries information
  about *which* routine claimed it — only the entity's other labels (still
  `automation:ready`-shaped vs. `automation:needs-review`/
  `automation:needs-fix`-shaped) disambiguate that, and only matters for a
  human reading the backlog, never for automation logic.

## 7. Special cases

### CI red

`ci.yml`'s `lint`/`test`/`build`/`doc-links`/`e2e` jobs are explicitly out of
`pr-review`'s checklist (`pr-review/SKILL.md` § Out of scope) — R3 judges
only what CI structurally cannot (spec conformance, architecture, backward
compat, doc freshness, debt). This means **a red required check and a
`automation:review-pass` verdict can coexist on the same commit**: R3
doesn't downgrade its verdict to `automation:needs-fix` just because CI is
red, and nothing else does either.

That's not a contradiction in practice, because the label state machine and
branch protection are two independent gates (row #15/#16): native GitHub
branch protection withholds the merge button until *every* required check
is green, regardless of `automation:review-pass`/`automation:enabled`. A red
check therefore blocks merge on its own, with no label transition and no
routine invoked by CI failure alone — R3 doesn't re-review on a check going
red, and R4 only starts from `automation:needs-fix`, not from a failing
check.

Concretely: if CI is red for a reason R3's checklist did flag (e.g. a
missing zod default `pr-review` calls out as a backward-compat blocker),
that's `automation:needs-fix` and R4 fixes it — CI going green is then a
side effect of R4's own "re-run the full check suite before pushing" step.
If CI is red for a reason outside R3's checklist (e.g. a flaky `e2e` run, or
a check that started failing after R3 already passed the PR), there is
currently **no automated remediation** — the PR sits at
`automation:review-pass`(/`automation:enabled`) with a red required check
until either a later push turns it green or a human notices. This is a
known gap, not a hidden one: R6's "PR open > 3 days" section
(`weekly-report/SKILL.md` §1) is exactly the mechanism that's supposed to
surface it for a human, listing the PR's current labels alongside its age so
a `automation:review-pass` PR stuck red for days reads as a stuck pipeline
rather than "waiting on review".

### Contradictory feedback

The attempt cap (§5) *is* the resolution rule: a fix that can't converge in
three tries, or that reveals a scope mismatch on the very first try
(row #20), is escalated to `automation:needs-human` rather than iterated on
indefinitely. There is no separate "conflict detection" step — three
genuine attempts (or one attempt showing the ask is bigger than the review
stated) is the operational definition of "this needs a human decision, not
another guess." `address-feedback/SKILL.md` step 4 makes this explicit: a
fix requiring a materially larger change than the review anticipated is
escalated immediately, on the same terms as exhausting the counter, instead
of spending a further attempt guessing at unrequested scope.

Since #380, this extends one level down, to individual feedback items
rather than only to the PR as a whole: `address-feedback/SKILL.md` step 1
builds R4's worklist from the R3 verdict comment *plus* the PR's inline
review threads (`pull_request_read` method `get_review_comments`),
excluding any thread already `isResolved` — a thread a previous R4 run (or
a human) already resolved is never re-fixed, re-flagged, or re-narrated,
which is what makes repeated R4 runs on the same PR idempotent at the
comment level, not just at the label level. Step 2 prioritizes the
remaining worklist (`blocking` from the R3 verdict or a `REQUEST_CHANGES`
review, `important` otherwise, `nit` last, fixed only if trivial). Step 3
applies the same escalation as the scope-mismatch case above to two items
that directly conflict, or a single item too vague to act on without
guessing — before any code is touched, not after a failed attempt. Step 8
requires every run (clean, partial, or escalated) to publish one synthesis
comment (corrigé / non appliqué / arbitrage requis), so a human reading the
PR never has to reconstruct what happened from the diff and label history
alone. A full check suite that stays red after the fix is treated the same
way (step 5): R4 never pushes a failing commit, and never leaves the PR
silently parked on `automation:in-progress` — an unresolvable red suite
escalates like any other item R4 can't safely finish.

### Incomplete issue

`implement-task/SKILL.md` step 1 requires R2 to stop rather than guess scope
when the spec is ambiguous or missing acceptance criteria. As R2 (no human
watching the session live), "stop" means: post a comment on the issue naming
exactly what's missing, then release the claim taken in "Which issue" — swap
`automation:in-progress` for `automation:needs-human` (row #6) — rather than
leaving the issue silently parked on `automation:in-progress` with no PR and
nothing watching it (a state none of the sweepers in §6 catch, since
`automation:in-progress` is precisely the "a run is legitimately using this"
signal they're built to leave alone). The interactive path (a human runs
`implement-task` directly) keeps its original meaning of "ask" — there's a
person present to answer.
