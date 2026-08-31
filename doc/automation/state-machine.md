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

## 1. Entities

Two independent label-driven state machines, **Issue** and **Pull
Request**, each layered on top of GitHub's own open/closed axis (orthogonal
to the labels below — an issue can be open with any control label, or
closed with `state_reason` `completed`/`not_planned`).

A PR is always linked to the issue it closes (`Closes #N`); the issue's own
`in-progress` label persists for the PR's entire review/fix lifecycle — R2
sets it once and nothing touches it again until the PR merges (issue closes)
or a human intervenes. The PR's labels below are what actually cycles.

## 2. Labels: three categories

| Label | Category | Meaning | Set by | Cleared by |
|---|---|---|---|---|
| `P0`…`P3` | Business | Priority, independent of pipeline state | R1 (human, at grooming) | Never automatically |
| `blocked` | Business | Issue has an open native `blocked_by` dependency | R1 (human, alongside a `## Dépendances` section) — no automation ever sets it | `unblock-issues.yml`, once every native blocker is closed |
| `queued` | Control | Spec validated, waiting for a dispatch slot | R1 (issue), `unblock-issues.yml` (dependent issue, once unblocked) | `dispatch-ready.mjs` |
| `ready` | Control | Dispatched, next in line for R2 — this is R2's trigger | `dispatch-ready.mjs`, `requeue-lost-events.mjs` (re-posing an orphaned one) | R2 (`implement-task`), in its first action |
| `in-progress` | Control | A routine currently owns this item ("claim the run") | R2 on an issue; R3 or R4 on a PR | The routine that set it, once its run ends (success, stop-and-ask, or escalation) |
| `needs-review` | Control | PR queued for R3 — this is R3's trigger | `needs-review-label.yml` (PR opened/ready/synchronize) | R3 (`pr-review`), in its first action |
| `attempt-1`/`attempt-2`/`attempt-3` | Control | R4's anti-loop retry counter on a PR | R4 (`address-feedback`), after a fix is pushed | R4 itself (old counter, before posting the new one), or R3 on `review-pass` (clears a stale counter) |
| `review-pass` | Result | R3's verdict: PR conforms to its issue's spec | R3 | R3, if a later review overturns it to `needs-fix`; `needs-review-label.yml` (clears a stale one, on synchronize) |
| `needs-fix` | Result **and** control | R3's verdict: PR needs changes — **also** R4's trigger (dual role, see below) | R3 | R4, in its first action; `needs-review-label.yml` (clears a stale one, on synchronize) |
| `needs-human` | Result | Terminal escalation: automation cannot resolve this without a decision | R4 (attempt cap or scope mismatch on a PR) | Only a human, by removing it and re-queuing |
| `auto` | Result | Eligible for auto-merge once required checks are green | R2 only, when the diff matches the risk-Faible whitelist (`automation-plan.md` §5) | R4, on escalation to `needs-human` |

**`needs-fix` is deliberately dual-role**: it is both R3's verdict *and* the
label whose presence is R4's GitHub trigger filter. There is no separate
"queue label" for R4 the way `needs-review` decouples PR-opened from R3 —
the verdict itself is the queue. This is why R4's first action removes
`needs-fix` before doing anything else (§5): as long as it's present, any
further label write on the PR re-matches R4's trigger.

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
| R2 — implementation | Versioned routine | `issues` `labeled`, filter `ready` | `.claude/skills/implement-task/SKILL.md` |
| R3 — review | Versioned routine | `pull_request`, any action, filter `needs-review` | `.claude/skills/pr-review/SKILL.md` |
| R4 — fix | Versioned routine | `pull_request` `labeled`, filter `needs-fix` | `.claude/skills/address-feedback/SKILL.md` |
| R5 — hygiene | Versioned routine, scheduled | Cron, weekly (Monday 06:00 UTC) | `.claude/skills/site-quality/SKILL.md` |
| R6 — report | Versioned routine, scheduled (not yet created — Phase 6 rodage pending, see `automation-plan.md` §7) | Cron, weekly (planned) | `.claude/skills/weekly-report/SKILL.md` |
| `dispatch-ready.mjs` | Action | Same workflow as the sweeper below | Promotes one `queued` issue to `ready` |
| `needs-review-label.yml` | Action | `pull_request` opened/ready_for_review/synchronize | Clears stale `review-pass`/`needs-fix`, poses `needs-review` |
| `review-status-sync.yml` | Action | `pull_request` `labeled`, filter `review-pass`/`needs-fix` | Translates the label into the `claude/review` commit status |
| `auto-merge-sync.yml` | Action | `pull_request` labeled/unlabeled, filter `auto` | Enables/disables native GitHub auto-merge; on success, closes linked issues in the same job |
| `requeue-lost-events.yml` (`requeue-lost-events.mjs`) | Action | Cron hourly + `issues` unlabeled/closed | Re-poses an orphaned `ready`/`needs-review`/`needs-fix` still present > 30 min without `in-progress` |
| `requeue-lost-events.yml` (`sweep-merged-prs.mjs`) | Action | Same workflow, runs after the sweeper above | Catch-up close of issues left open by a PR merged in the last 7 days |
| `unblock-issues.yml` | Action | `issues` `closed`, filter `state_reason == completed` | Promotes dependents to `queued` once every native blocker is closed |
| `sync-issue-dependencies.yml` | Action | `issues` opened/edited | Parses `## Dépendances`, posts the native `blocked_by` link |
| `close-linked-issues.yml` | Action | `pull_request` `closed`, filter `merged == true` | Closes issues referenced by `Closes #N` (manual-merge path) |
| `project-sync.yml` | Action | labeled/unlabeled/closed + cron 6h | One-way sync: labels → Project `Status` field |

## 4. Complete transition table

Every row is `current state → event → actor → target state`. "Owner" says
whether the transition fires without a human (**Auto**) or requires one
(**Human**).

| # | Entity | Current state | Event | Actor | Target state | Owner |
|---|---|---|---|---|---|---|
| 1 | Issue | No control label | R1 grooming session confirms the spec | R1 (human) | `P0`…`P3` + `queued` (own calls, `queued` last) | Human |
| 2 | Issue | `queued` | Sweeper cron/trigger fires, nothing `ready`/`in-progress`, ≤2 PRs `needs-review` | `dispatch-ready.mjs` | `ready` (highest priority, oldest first) | Auto |
| 3 | Issue | `queued` | Sweeper fires but a slot is occupied, or the `needs-review` backlog > 2 | `dispatch-ready.mjs` | `queued` (no-op) | Auto |
| 4 | Issue | `ready` | `issues.labeled(ready)` | R2 (`implement-task`) | `in-progress`; branch, code, tests, doc, PR opened with `Closes #N`; `auto` posed only if risk stays Faible | Auto |
| 5 | Issue | `ready` | `issues.labeled(ready)` fires but the issue is no longer actionable (already claimed, closed) | R2 | `ready` unchanged — R2 does nothing else, never picks a different issue | Auto (guard) |
| 6 | Issue | `ready` | Spec turns out ambiguous/incomplete once R2 reads it fully | R2 | `in-progress` → `needs-human`; comment naming what's missing | Human (escalated) |
| 7 | Issue | Posed `ready` > 30 min ago, still `ready` (lost event, run-cap exceeded) | Hourly cron | `requeue-lost-events.mjs` | `ready` removed then re-posed alone (regenerates the `labeled` event) | Auto |
| 8 | Issue | `in-progress`, PR linked | PR merges, `close-linked-issues.yml` or the same-job close in `auto-merge-sync.yml` runs | Action | Issue closed, `state_reason: completed` | Auto |
| 9 | Issue | `in-progress`, PR linked and merged, but the immediate close missed (wait loop expired) | Hourly cron, within the 7-day catch-up window | `sweep-merged-prs.mjs` | Issue closed | Auto (catch-up) |
| 10 | Issue | Closed, `state_reason: completed`, was blocking others | `issues.closed` | `unblock-issues.yml` | Each dependent with every native blocker now closed: `blocked` removed, `queued` posed | Auto |
| 11 | Issue | Any (new or edited body carries `## Dépendances`) | `issues` opened/edited | `sync-issue-dependencies.yml` | Native `blocked_by` link posed per cited blocker (own no-op on 422/not-found) | Auto |
| 12 | PR | Opened (no control label yet) | `pull_request` opened/ready_for_review/synchronize | `needs-review-label.yml` | Stale `review-pass`/`needs-fix` cleared, then `needs-review` posed | Auto |
| 13 | PR | `needs-review` | `pull_request` event while `needs-review` present | R3 (`pr-review`) | `in-progress` (claim), then either `review-pass` (conforms) or `needs-fix` (+ PR comment) once the diff at the noted HEAD SHA is reviewed | Auto |
| 14 | PR | `needs-review`, R3 about to label | HEAD SHA moved mid-review (a push landed) | R3 | `needs-review` re-posed alone, no verdict | Auto (guard) |
| 15 | PR | `review-pass` | Nothing — required checks (`lint`/`test`/`build`/`doc-links`/`e2e`/`claude/review`) still pending or red | *(none)* | `review-pass` unchanged — native branch protection withholds merge independently of labels | Auto (native GitHub, no routine involved) |
| 16 | PR | `review-pass` (+ `auto` if eligible) | Every required check green | Native GitHub auto-merge (if `auto` present) | PR merges → issue closes (#8/#9) | Auto |
| 17 | PR | `needs-fix` | `pull_request.labeled` while `needs-fix` present | R4 (`address-feedback`) | `needs-fix` and any stale `attempt-N` removed, `in-progress` posed (claim) — all before deciding the attempt number | Auto |
| 18 | PR | `in-progress` (R4 claimed, attempt N ≤ 3) | Fix implemented, full check suite green, pushed | R4 | `in-progress` removed, `attempt-N` posed; push retriggers #12 | Auto |
| 19 | PR | `in-progress` (R4 claimed, would be attempt 4, i.e. `attempt-3` was already present) | Attempt cap reached | R4 | `in-progress` removed, `auto` removed if present, `needs-human` posed; comment summarizing what's still wrong | Human (escalated) |
| 20 | PR | `in-progress` (R4 claimed, any attempt) | The flagged fix turns out to need a materially larger change than the review anticipated | R4 | Same as #19: `needs-human`, `auto` removed, explanatory comment — treated as the cap regardless of the attempt number | Human (escalated) |
| 21 | PR | `needs-review` again (re-queued by #18's push) | `pull_request` synchronize | `needs-review-label.yml` | `needs-fix` removed (stale), `needs-review` posed → back to #13 | Auto |
| 22 | PR | `review-pass` | Later review reopens it | R3 | `attempt-*` cleared alongside the verdict, so a later unrelated `needs-fix` starts its own cap fresh | Auto |
| 23 | PR or Issue | Posed `needs-review`/`needs-fix` > 30 min ago, no `in-progress` (lost event) | Hourly cron | `requeue-lost-events.mjs` | Label removed then re-posed alone | Auto |
| 24 | PR or Issue | `needs-human` | — | — | Terminal: `unblock-issues.mjs` and `dispatch-ready.mjs` both explicitly skip any item carrying it | Human only, by removing it and re-queuing |

## 5. The R3 ↔ R4 loop

`needs-review` and `needs-fix` cycle through rows #12–#22 above until one of
two terminal outcomes: `review-pass` survives a full review (merge path), or
the attempt cap is hit (`needs-human`, row #19/#20).

- **Claim the run, always first.** Both R3 and R4 remove their trigger label
  (`needs-review`, `needs-fix`) *before* posing any other label — including
  before deciding whether to proceed. A trigger label left in place while a
  later label-write happens re-matches the same GitHub filter and re-fires
  the routine on its own writes. This exact bug produced a runaway
  `attempt-1` → `attempt-2` → `attempt-3` chain in about a minute on PR #111
  (`automation-plan.md` §4, Phase 5) before the ordering rule was fixed.
- **The attempt counter is read before it's cleared.** R4 looks at whichever
  of `attempt-1`/`attempt-2`/`attempt-3` is present *before* removing it, to
  compute this run's number (no label → attempt 1; `attempt-1` present →
  attempt 2; `attempt-2` present → attempt 3, the last one allowed). It then
  clears the old label immediately (claim step) and only adds the new one
  once the fix is actually done and pushed — so a run that stops early
  (rows #19/#20) never posts a counter for work it didn't finish.
  Interactive invocations apply the same read, even with no labels to
  manage — an issue already at `attempt-3` doesn't get a fourth try just
  because a human ran the skill by hand.
- **`review-pass` resets the counter.** R3 clears any `attempt-*` label when
  it reaches `review-pass` (row #22), so a stale counter from an already-
  resolved cycle never makes an unrelated later `needs-fix` (e.g. from a
  rebase) look like a continuation and escalate after fewer than three real
  attempts.
- **Cap is 3, not "3 pushes".** Rows #19 and #20 both land on `needs-human`
  the moment either condition is met — three genuine fix attempts *or* a
  single attempt revealing the fix is out of the review's stated scope.
  Both are the same signal: the disagreement between what was asked and
  what's feasible isn't resolving by iterating, so a human decides instead
  of a fourth (or a scope-expanding) guess.

## 6. Recovery, failure and retry rules

- **A run cap being hit loses the event, not queues it** (`automation-plan.md`
  §3). Because every trigger label is only ever removed by the routine that
  claims it ("claim the run", §5), an event lost to the cap is legible after
  the fact: the trigger label (`ready`/`needs-review`/`needs-fix`) is still
  sitting there, unclaimed, past a threshold no real run would take.
  `requeue-lost-events.yml` (hourly cron + `issues` unlabeled/closed) checks
  every such item's last `labeled` timeline event; past 30 minutes with no
  `in-progress`, it removes and re-poses the label alone, in its own call,
  regenerating the `labeled` event the routine's trigger matches. Retry is
  unbounded and blind — there's no way to query remaining routine quota from
  GitHub, so a still-exhausted quota just leaves the label for the next
  hourly pass. An item stuck for days is a signal for R6 to flag a broken
  routine, not a quota problem.
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
- **`needs-human` is terminal for every piece of automation that reads it.**
  `dispatch-ready.mjs` skips a candidate carrying it (row #3's eligibility
  filter, `pickNextQueued`); `unblock-issues.mjs` skips it too
  (`BLOCKING_LABELS`), logging that a human must re-queue. No workflow ever
  removes `needs-human` — only a human, by clearing it and re-applying
  whatever control label restarts the pipeline (`queued` for an issue,
  `needs-review` for a PR).
- **`in-progress` is the one label three different routines (R2, R3, R4)
  all use as "I currently own this."** It never carries information about
  *which* routine claimed it — only the entity's other labels (still `ready`-
  shaped vs. `needs-review`/`needs-fix`-shaped) disambiguate that, and only
  matters for a human reading the backlog, never for automation logic.

## 7. Special cases

### CI red

`ci.yml`'s `lint`/`test`/`build`/`doc-links`/`e2e` jobs are explicitly out of
`pr-review`'s checklist (`pr-review/SKILL.md` § Out of scope) — R3 judges
only what CI structurally cannot (spec conformance, architecture, backward
compat, doc freshness, debt). This means **a red required check and a
`review-pass` verdict can coexist on the same commit**: R3 doesn't downgrade
its verdict to `needs-fix` just because CI is red, and nothing else does
either.

That's not a contradiction in practice, because the label state machine and
branch protection are two independent gates (row #15/#16): native GitHub
branch protection withholds the merge button until *every* required check
is green, regardless of `review-pass`/`auto`. A red check therefore blocks
merge on its own, with no label transition and no routine invoked by CI
failure alone — R3 doesn't re-review on a check going red, and R4 only
starts from `needs-fix`, not from a failing check.

Concretely: if CI is red for a reason R3's checklist did flag (e.g. a
missing zod default `pr-review` calls out as a backward-compat blocker),
that's `needs-fix` and R4 fixes it — CI going green is then a side effect of
R4's own "re-run the full check suite before pushing" step. If CI is red for
a reason outside R3's checklist (e.g. a flaky `e2e` run, or a check that
started failing after R3 already passed the PR), there is currently **no
automated remediation** — the PR sits at `review-pass`(/`auto`) with a red
required check until either a later push turns it green or a human notices.
This is a known gap, not a hidden one: R6's "PR open > 3 days" section
(`weekly-report/SKILL.md` §1) is exactly the mechanism that's supposed to
surface it for a human, listing the PR's current labels alongside its age so
a `review-pass` PR stuck red for days reads as a stuck pipeline rather than
"waiting on review".

### Contradictory feedback

The attempt cap (§5) *is* the resolution rule: a fix that can't converge in
three tries, or that reveals a scope mismatch on the very first try
(row #20), is escalated to `needs-human` rather than iterated on
indefinitely. There is no separate "conflict detection" step — three
genuine attempts (or one attempt showing the ask is bigger than the review
stated) is the operational definition of "this needs a human decision, not
another guess." `address-feedback/SKILL.md` step 2 makes this explicit: a
fix requiring a materially larger change than the review anticipated is
escalated immediately, on the same terms as exhausting the counter, instead
of spending a further attempt guessing at unrequested scope.

### Incomplete issue

`implement-task/SKILL.md` step 1 requires R2 to stop rather than guess scope
when the spec is ambiguous or missing acceptance criteria. As R2 (no human
watching the session live), "stop" means: post a comment on the issue naming
exactly what's missing, then release the claim taken in "Which issue" — swap
`in-progress` for `needs-human` (row #6) — rather than leaving the issue
silently parked on `in-progress` with no PR and nothing watching it (a state
none of the sweepers in §6 catch, since `in-progress` is precisely the
"a run is legitimately using this" signal they're built to leave alone). The
interactive path (a human runs `implement-task` directly) keeps its original
meaning of "ask" — there's a person present to answer.
