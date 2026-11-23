# Scoreo overlay — `address-feedback`

This file is Scoreo's overlay for the shared skill `dev-workflow:address-feedback`
(plugin `dev-workflow` from the `remhiit/workflows` marketplace). The shared
skill reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where the
two disagree, **this file wins**. It holds only what is specific to Scoreo:
its paths and commands, and its automation pipeline (labels, routines R2–R5,
the coordinator and its sub-agents, traceability). Everything generic lives in
the shared skill, so an improvement made there reaches Scoreo unless this
file overrides that point.

Section titles keep the names they had when this skill lived in
`.claude/skills/address-feedback/SKILL.md`, so a reference such as
`address-feedback/SKILL.md` § "X" elsewhere in the repo now means § "X" of this file.
Step numbers ("step 6") refer to the shared skill's procedure, which keeps the
same numbering.

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
  Normalize that value the way `skill-contract.md` § "Traçabilité" states it:
  strip a context-window suffix (`claude-opus-5[1m]` → `claude-opus-5`), and
  prefer `external_metadata.last_served_model` when it is present and differs
  from `session_context.model` — a turn-scoped fallback changes what served
  the run without changing what the session is set to, and that call can come
  back with no usable `session_context.model` at all.
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


## Procédure — Scoreo specifics

The shared skill's steps 1–8 apply, with Scoreo's commands from
`project-conventions/SKILL.md` § verifications. These are the pipeline
additions for the steps named.

### Step 6 — push

6. **Push to the same branch** (new commit, not an amend of history that's
   already been reviewed — the reviewer should be able to see what changed
   since their comment), only once the full suite is green (step 5). This
   commit carries the same two git trailers `implement-task/SKILL.md` step 9
   adds to its own commit — `Skill: address-feedback` and `Model: <id>`,
   `<id>` obtained per "Traçabilité" above, never a guessed value — so a fix
   commit is traceable to the skill/model that produced it exactly like an
   implementation commit is.
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

### Step 9 — terminal labels

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
  suite is green, carrying the `Skill: address-feedback` / `Model: <id>`
  trailers.
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
