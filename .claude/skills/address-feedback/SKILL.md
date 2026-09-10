---
name: address-feedback
description: Fix exactly what's actually actionable in a Scoreo PR's outstanding feedback — nothing broader, nothing already handled. Use when addressing review comments or CI failures on an open PR here. This is the R4 step in doc/technical/automation-plan.md. Also invoked, procedure unchanged, as the coordinator's fix sub-agent (`.claude/skills/coordinator/SKILL.md`, #469) — see the "As the coordinator's sub-agent" notes below for the deltas that mode requires.
---

# Address Feedback

## Objectif

Fixes the scope a review actually flagged. Does not refactor, does not
"while I'm here" clean up adjacent code, does not revisit decisions the
review didn't raise. It is the fix half of the R3 ↔ R4 loop — it never
re-reviews, that's `pr-review`'s job.

## Entrées requises

The PR under fix, and `pr-review`'s submitted review on it (summary body via
`pull_request_read` `get_reviews`, inline comments via `get_review_comments`)
— every finding there already carries an explicit severity marker
(`blocking`/`important`/`suggestion`/`uncertain`) plus evidence, impact, and
confidence (`pr-review/SKILL.md` § Output). As R4, also the PR's current
labels, read in "Claim the run" below before anything else.

As the coordinator's fix sub-agent (#469), the review this run acts on is
whichever round the coordinator's isolated review sub-agent just submitted
on this same PR — still read the normal way (`get_reviews`/
`get_review_comments`), not paraphrased in the launch prompt; the attempt
number, however, comes directly from the coordinator (see "Attempt counter"
below), not from reading labels.

## Préconditions

### Which PR

- **As R4** (fired by the routine's GitHub trigger): the PR is the one
  from your triggering context — the `pull_request` `labeled` event
  (label `automation:needs-fix`) that started this run. Don't search for it.
- **Interactive** (asked directly in a session): the PR the user named.
- **As the coordinator's fix sub-agent** (#469): the PR number is given
  directly in this sub-agent's launch prompt, along with the exact
  `blocking`/`important` findings to act on. Nothing to search for.

### Claim the run (R4 only, first action)

Before touching any code, in this exact order:

1. Read the PR's current labels and note which of
   `automation:attempt-1`/`automation:attempt-2`/`automation:attempt-3` is
   present, if any (this decides the attempt number, see below).
2. Remove `automation:needs-fix` **and** that existing
   `automation:attempt-N` label (if any), and add `automation:in-progress`
   — all before anything else, including before deciding whether to
   proceed or before posting any new `automation:attempt-N`.

This order matters and isn't optional, for two separate reasons hit on the
same PR (#111):

- **Removing `automation:needs-fix` first.** R4's GitHub trigger fires on
  *any* `pull_request.labeled` event while `automation:needs-fix` is
  present. If `automation:needs-fix` is still there when a later step posts
  `automation:attempt-1`, that post is itself a `labeled` event that
  matches the trigger and re-fires R4 — which then sees
  `automation:attempt-1`, posts `automation:attempt-2` (still with
  `automation:needs-fix` present), re-fires again, and so on. R4 chained
  through `automation:attempt-1` → `automation:attempt-2` →
  `automation:attempt-3` → `automation:needs-human` within about a minute
  from its own label writes, not from three genuine fix attempts. Removing
  `automation:needs-fix` first closes that door before any later label-add
  can reopen it.
- **Removing the old `automation:attempt-N` up front, not at the end.** If
  the new `automation:attempt-N` is only added later without clearing the
  previous one first, both end up present. Since `pr-review` doesn't touch
  attempt labels when it posts `automation:needs-fix`, the *next*
  `address-feedback` run would then read the stale lower
  `automation:attempt-N` still sitting there and recompute the same
  attempt number instead of advancing — silently defeating the 3-attempt
  cap. Clearing it here, before the fix work even starts, avoids ever
  having two attempt labels present at once.

Skip this step in interactive mode (no labels to manage there), but still
apply the attempt-count decision below. **Also skip this step as the
coordinator's fix sub-agent** (#469): this run never claimed
`automation:needs-fix` because the coordinator never posts it on a PR it
owns (that label is R4's own live GitHub trigger — posting it on a
coordinator-owned PR would start an independent, uncoordinated second
`address-feedback` session racing this one, `coordinator/SKILL.md` §
Limites). The coordinator posts `automation:attempt-N` itself, before
launching this sub-agent — nothing for this step to claim or remove.

### Attempt counter

`automation-plan.md` caps autonomous fix attempts at 3 per recurring
`automation:needs-fix` cycle. Using the labels read in "Claim the run"
above (before they were removed):

- **No attempt label was present** → this is attempt 1.
- **`automation:attempt-1` was present** → this is attempt 2.
- **`automation:attempt-2` was present** → this is attempt 3, the last one
  allowed.
- **`automation:attempt-3` was present** → this would be a 4th attempt.
  **Stop here — do not touch the code.** `automation:in-progress` was just
  added in "Claim the run" and the old `automation:attempt-3` already
  removed — escalate as described in "Escalating to a human" below.

**As the coordinator's fix sub-agent** (#469): skip deriving the number from
labels — the coordinator states it directly in the launch prompt (it already
computed it the same way, from whichever `automation:attempt-*` it last
posted, before this sub-agent started). An attempt 4 never reaches this
sub-agent at all: the coordinator stops and escalates itself once
`automation:attempt-3` is already present, without ever launching a fourth
fix sub-agent (`coordinator/SKILL.md` § 3).

Remember which attempt number this run is (1, 2, or 3) — it's the label to
add at the end of the workflow below, once the fix is actually done.

`pr-review/SKILL.md` clears any `automation:attempt-*` label when it
reaches `automation:review-pass`, so a stale counter from an
already-resolved cycle never carries over into a later, unrelated
`automation:needs-fix`.

Even run interactively (no routine involved), apply the same check — an
issue that's already at `automation:attempt-3` shouldn't get a fourth try
just because a human happened to invoke the skill this time.

## Traçabilité

Per `doc/automation/skill-contract.md` § "Traçabilité" (#494): step 8's
synthesis carries the model that actually ran this fix, `<id>` (e.g.
`claude-sonnet-5`, never the marketing name).

- **As R4** (this skill running as its own Claude Code Remote session): call
  `get_session` (no `session_id`) and use `session_context.model`.
- **As the coordinator's fix sub-agent** (#469): `get_session` doesn't
  apply — read the model self-reported in this sub-agent's own system
  prompt (the #423 mechanism), and include it when reporting back to the
  coordinator at the end of the workflow (step 9), alongside whether the fix
  is done and pushed.

If neither source is available, `<id>` is `inconnu` — never guessed — with
the reason stated alongside it.

## Escalade

Per `doc/automation/skill-contract.md` §3, specialized to this skill's own
stop conditions — the attempt cap in "Attempt counter" above, and steps
3/4/5 of the Procédure below. As R4 (no human watching the session live),
escalating means the sequence below, not asking in a session.

### Escalating to a human (R4)

Every path in this skill that ends in `automation:needs-human` — the
attempt cap above, and steps 3/4/5 of the workflow below — follows the same
sequence (issue #429). It is not enough to label the PR: the issue's own
`automation:in-progress`, held since R2 claimed it
(`doc/automation/state-machine.md` §1), is what
`dispatch-ready.mjs`'s `MAX_IN_FLIGHT` counts as "in flight" — leaving it in
place freezes the entire backlog behind this one PR, not just this PR.

1. On the **PR**: remove `automation:in-progress` (added in "Claim the
   run"), remove `automation:enabled` if present, add
   `automation:needs-human`.
2. Identify the linked issue from `Closes #N` in the PR's body — the same
   issue R2 claimed when it opened this PR.
3. On that **issue**, in this exact order: add `automation:needs-human`,
   add `automation:queued`, and only then remove `automation:in-progress`.
   Reversing this order is not safe: removing the issue's
   `automation:in-progress` first is itself an `unlabeled` event that
   `requeue-lost-events.yml` reacts to by running `dispatch-ready.mjs` in
   the same pass — if `automation:queued` isn't posed yet, or was posed
   before `automation:needs-human`, that window could let the dispatcher
   promote the issue straight back to `automation:ready`, undoing the
   escalation (`doc/automation/state-machine.md` §6, "Escalation frees its
   slot").
4. Post the synthesis (workflow step 8) naming precisely what's wrong —
   this is what a human reads instead of reconstructing the loop from label
   history.

Once these three issue-side labels are in place, a human only has to remove
`automation:needs-human` to make the issue a dispatch candidate again —
`automation:queued` is already there, no separate re-queuing step.

**As the coordinator's fix sub-agent** (#469): skip steps 1–3 above — this
sub-agent never claimed any label itself, so it has none to release, and the
issue's `automation:in-progress` has been held by the coordinator, not by
this sub-agent, for the run's entire lifetime. Report the escalation reason
back to the coordinator instead (still publish the synthesis, step 4/workflow
step 8, on the PR — that part is unchanged, it's what a human reads
regardless of which component performed the label sequence). The coordinator
(`coordinator/SKILL.md` § Escalade) performs steps 1–3 itself.

## Procédure

1. **Gather feedback, excluding what's already handled.**
   - Read `pr-review`'s submitted review (`pull_request_read` method
     `get_reviews` for the summary body, `get_review_comments` for its
     inline comments) — every finding there carries an explicit severity
     prefix, `blocking`/`important`/`suggestion`/`uncertain`, plus evidence,
     impact, and a confidence level (`pr-review/SKILL.md` § Output).
     **Severity alone decides scope here** — evidence/impact/confidence are
     context for understanding *why* a finding was raised, not additional
     filters to weigh: `pr-review` already folds confidence into severity
     before posting (a `blocking`/`important` finding never carries low
     confidence — low confidence there means the finding is `uncertain`
     instead, `pr-review/SKILL.md` § "Confidence and `uncertain` severity"),
     so this step never needs to re-derive that judgment call or second-guess
     a finding's severity against its confidence field.
     `automation:needs-fix` only means at
     least one `blocking`/`important` finding exists in that review — build
     the fix worklist from those two severities only. A `suggestion`/
     `uncertain` finding in the same review is visible context, not part of
     this run's scope — leave it alone unless it's inseparable from a
     `blocking`/`important` fix. Each inline thread from `get_review_comments`
     carries `isResolved`. **Skip every thread where `isResolved` is
     `true`** — a resolved thread was already acted on (fixed and resolved
     by a previous run of this skill, or resolved directly by a human as
     acknowledged/won't-fix). This is what keeps a comment from being
     retreated across attempts: resolution state lives on GitHub, not in
     this skill's memory, so it survives across runs and across the attempt
     counter resetting.
   - Build the worklist from the review's `blocking`/`important` findings —
     inline ones with an *unresolved* thread, plus any summary-body ones —
     minus whatever a prior run already resolved. A finding with no
     corresponding severity marker is not in scope — don't go looking for
     more to fix, and don't infer severity from wording (`bloquant`, `must
     fix`) on a plain, unmarked comment; that guessing is exactly what the
     explicit severity prefix replaces.
2. **Prioritize the worklist**, blocking first:
   - **Blocking**: every `blocking` finding from the review.
   - **Important**: every `important` finding from the review.
   - **Out of scope this run**: `suggestion`/`uncertain` findings, and any
     plain PR comment/thread with no severity marker — leave those threads
     open and don't act on them; note skipped `suggestion`/`uncertain`
     findings in the synthesis (step 8) only if a human is likely to look
     for them there, otherwise they're already visible on the review itself.
   Work blocking items first, then important, so a run that has to stop
   partway (attempt cap, time) has already banked the items that actually
   block merge.
3. **Check for contradiction or ambiguity before fixing anything.** Two
   items asking for opposite changes, or a single item too vague to act on
   without guessing the reviewer's intent, is not something to resolve by
   picking one side. Treat this exactly like a scope mismatch discovered
   mid-fix (below): stop, don't touch the code for the conflicting/ambiguous
   items, and escalate. **As R4**: escalate as described in "Escalating to a
   human" above, with the synthesis (step 8) naming precisely which items
   conflict or are unclear and why — leave their threads unresolved so a
   human finds them in place. See `doc/automation/state-machine.md` §
   Contradictory feedback.
4. **Fix only the prioritized, unambiguous list.** If a fix reveals it can't
   be done without a larger change than the review anticipated, stop and
   flag that explicitly rather than expanding scope unilaterally — this is
   the one case where checking in beats plowing ahead. **As R4**, treat this
   the same as exhausting the attempt cap: escalate as described in
   "Escalating to a human" above, with the synthesis (step 8) explaining the
   scope mismatch — don't spend a further attempt guessing at a bigger
   change nobody asked for. While fixing, run fast targeted checks
   after each item (`pnpm lint`, `pnpm typecheck`, and the specific
   `*.test.ts(x)` file(s) touched) to catch mistakes early without paying
   for a full suite run per item.
5. **Never push on red.** Once every item to fix is actually fixed, re-run
   the full check suite (`pnpm lint && pnpm typecheck && pnpm test && pnpm
   build && pnpm test:e2e`) — a fix for one flagged item shouldn't introduce
   a new failure elsewhere. Build before the e2e run — `playwright.config.ts`
   starts its server with `pnpm preview`, which serves `apps/scoreo/dist/`.
   In the Claude Code remote environment, Chromium is preinstalled
   (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) — do not run `playwright
   install`; locally, run `pnpm --filter scoreo exec playwright install
   chromium` first if needed. If an e2e test fails in a way that looks
   unrelated to this diff, re-run once before concluding it's flaky — don't
   "fix" a test at random just to make it pass. **If the suite still doesn't
   pass, do not commit and do not push** — a red commit is worse than no
   commit, and it would push a broken HEAD out for re-review. Treat a fix
   that can't be made to pass validation the same as the contradiction/scope
   cases above: escalate as described in "Escalating to a human" above
   rather than leaving the PR — and the linked issue — silently parked on
   `automation:in-progress` with nothing watching them, and say in the
   synthesis (step 8) what's still red and what was tried.
6. **Push to the same branch** (new commit, not an amend of history that's
   already been reviewed — the reviewer should be able to see what changed
   since their comment), only once the full suite is green (step 5).
   Pushing triggers `needs-review-label.yml` (`synchronize`), which clears
   the stale `automation:needs-fix` and re-queues R3
   (`automation:needs-review`) on its own — this is what returns the PR to
   review after a successful fix; nothing else to do here to get
   re-reviewed. **As the coordinator's fix sub-agent** (#469): pushing still
   happens exactly the same way, but this PR carries
   `automation:coordinator-owned`, so `needs-review-label.yml` skips it
   entirely (#468) — no automatic re-queue. The coordinator itself launches
   the next isolated review sub-agent on the new HEAD SHA once this sub-agent
   reports back.
7. **Resolve every thread actually fixed** (`pull_request_review_write`
   method `resolve_thread`, or `resolve_review_thread`, with the thread's
   node ID from `get_review_comments`). Leave unresolved anything not
   applied (an out-of-scope `suggestion`/`uncertain` finding, items
   escalated) — an unresolved thread is exactly the signal a later run (or a
   human) uses to know it's still open, and what keeps this idempotent: a
   thread already resolved by an earlier run is filtered out at step 1 of
   the *next* run, so it's never re-fixed, re-flagged, or re-narrated.
8. **Publish one synthesis, always** — whether this run finishes clean,
   partially, or escalates, and regardless of whether step 6 pushed anything.
   Post a single PR comment (`add_issue_comment`) structured as:
   - `✅ Corrigé` — the items actually fixed, pushed, and resolved (or
     "aucun" if none).
   - `⏭️ Non appliqué` — items left alone, each with why: a `suggestion`/
     `uncertain` finding out of scope, an `important` item not reached due
     to the attempt cap, etc. Empty section if nothing was skipped.
   - `⚠️ Arbitrage requis` — only present when this run escalates to
     `automation:needs-human`: the contradictory/ambiguous items, the scope
     mismatch, or the still-red check, described precisely enough that a
     human doesn't have to reconstruct it from the diff and label history.
   - **Traçabilité** — `skill \`address-feedback\`` + `modèle \`<id>\`` per
     § "Traçabilité" above.
   This replaces narrating each individual comment inline — the synthesis is
   the one place a human (or the next run) looks for what happened, and the
   diff plus resolved threads are the record of *how*. This synthesis is
   this skill's instance of `doc/automation/skill-contract.md` §2's
   structured output (Statut = clean/partial/escalated; Résumé =
   `✅ Corrigé`; Questions non résolues = `⚠️ Arbitrage requis`; Traçabilité =
   the bullet above).
9. **Remove `automation:in-progress` and add the attempt number remembered
   from the counter step above** (`automation:attempt-1`/
   `automation:attempt-2`/`automation:attempt-3`) — the old attempt label
   was already cleared in "Claim the run", so this only adds the new one.
   This is the run's terminal label, posted only now that the fix is
   actually done and pushed. Skip this step on the escalation paths (steps
   3/4/5) — those already end in `automation:needs-human`, not an attempt
   label. **As the coordinator's fix sub-agent** (#469): skip this step too
   — there's no `automation:in-progress` from this sub-agent to remove, and
   the coordinator already posted the current attempt's
   `automation:attempt-N` before launching it (see "Claim the run" above).
   Report back that the fix is done and pushed instead, alongside this run's
   own self-reported model (§ "Traçabilité" above); the coordinator takes it
   from there (§ 3 of `coordinator/SKILL.md`).

## Sorties obligatoires

Once a run reaches a clean or partial outcome (step 9; the escalation path
above never reaches it):

- A new commit pushed to the same branch (step 6), only once the full check
  suite is green.
- Every thread actually fixed resolved (step 7).
- One synthesis comment, always (step 8) — `✅ Corrigé`/`⏭️ Non appliqué`/
  `⚠️ Arbitrage requis`/Traçabilité.
- `automation:in-progress` removed and the current attempt's
  `automation:attempt-N` posed (step 9).

As the coordinator's fix sub-agent (#469): the first three bullets still
apply unchanged; the last one doesn't (step 9 above) — no label is posted by
this sub-agent, the coordinator already manages both labels itself.

## Contrôles

Step 5's full check suite, re-run after every fix and before any push:
`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`.
A run that can't get this green does not commit and does not push (step 5)
— it escalates instead (see Escalade above).

## Limites

- Never fixes anything outside the review's `blocking`/`important` findings
  — a `suggestion`/`uncertain` finding or an unmarked comment is left alone
  (Procédure step 2).
- Never refactors or cleans up adjacent code the review didn't flag (see
  Objectif).
- Never re-reviews — that verdict is `pr-review`'s alone; this skill only
  reacts to an existing `automation:needs-fix` review.
- Never pushes a commit while the full check suite is red (Procédure
  step 5).
- Never spends a fourth attempt, or a larger-than-flagged change, without
  escalating first (see "Attempt counter" and Escalade above).
- As the coordinator's fix sub-agent (#469): never posts
  `automation:needs-fix`, `automation:attempt-N`, or the escalation label
  sequence itself — every label write for a PR the coordinator owns is the
  coordinator's alone (see "Claim the run" and "Escalating to a human").
