---
name: coordinator
description: Fuses R2 (implementation), R3 (review) and R4 (fix) into a single Claude Code session that drives an issue from `automation:ready` to a reviewed, corrected PR without any label-driven handoff between steps. Invoked in place of `implement-task` on the same GitHub trigger (`issues.labeled`, filter `automation:ready`). Delegates each step to a fresh sub-agent running that step's own skill (`implement-task`, `pr-review`, `address-feedback`) via the `Agent` tool — review runs as two isolated sub-agents on disjoint corpora, functional and technical, neither getting context from the implementation step or from each other (see "Context isolation" below), arbitrated by the mechanical rule in `scripts/review-verdict.mjs`. This is tranches 3 and 4 of #430 in doc/technical/automation-plan.md.
---

# Coordinator

## Objectif

Runs implementation → review → fix as sub-agents of one session instead of
three independent routine runs stitched together by GitHub label events.
Two problems this solves, both explained in issue #469: **budget** (a
two-round fix today costs six separate routine runs — R2, then R3/R4
alternated twice, each R4 push re-triggering R3 — where the coordinator
spends one), and **accidental complexity** ("claim the run", SHA dedup, the
moved-HEAD guard, the `automation:attempt-N` counter, the fixed label
ordering in `needs-review-label.yml`) that exists only because handing off
between R2/R3/R4 today goes through an asynchronous bus (GitHub labels) with
no ordering or delivery guarantee. Sequential steps inside one session don't
need any of that.

This skill does not itself write code, review a diff, or fix a finding — it
orchestrates. Each of those three jobs stays exactly `implement-task`'s,
`pr-review`'s, and `address-feedback`'s own procedure, run as a sub-agent
(`Agent` tool) rather than as an independent routine invocation — review
runs as *two* such sub-agents, one per corpus (#470, tranche 4/4 of #430:
the split is worth doing only because their inputs are disjoint — a
functional reviewer reading the spec and `doc/functional/`, a technical
reviewer reading `doc/technical/architecture.md` and `project-conventions`,
never each other's input or each other's output). This skill also does not
decide a review verdict: the verdict follows mechanically from
`scripts/review-verdict.mjs`, fed both reviewers' findings (§ "The review
verdict is mechanical" below), never this skill's own judgment call — in
particular, a disagreement between the two reviewers is never arbitrated by
reading both reviews and picking a side.

**Boundary with `pr-review` as a standalone routine.** A PR opened by a
human or by R5 (`site-quality`) never goes through this skill — it still
gets queued for review the existing way, `automation:needs-review` →
standalone R3 (`doc/automation/state-machine.md` row #12/#13). This skill
only ever owns a PR it opened itself, on an issue it claimed.

## Entrées requises

The triggering issue (same shape `implement-task/SKILL.md` § "Which issue"
already assumes: acceptance criteria, `## Fichiers impactés`, a risk
category, and a `READY_FOR_IMPLEMENTATION` readiness verdict). Nothing else
is assumed in context — every sub-agent this skill launches gets its own
input built fresh from GitHub (see each step below), never forwarded from
this session's own conversation history.

## Préconditions

### Which issue

Identical rule to `implement-task/SKILL.md` § "Which issue": act only on the
issue named by this run's trigger. If it's no longer actionable (not
`automation:ready` any more, already closed, or `closed_by_pull_requests`
already lists an open PR), **stop and do nothing else** — same guard,
checked the same way, before claiming anything.

### Claim the run (first action)

Exactly `implement-task/SKILL.md`'s claim step: remove `automation:ready`,
add `automation:in-progress`, in its own call. This label is held on the
**issue** for this run's entire lifetime — implementation, every review
round, every fix round — cleared only at the very end (merge-eligible
hand-off or escalation), never in between. A crash between rounds is
therefore recoverable the same way a crashed R2/R4 run already is: the
hourly stale-ownership sweep (`requeue-lost-events.mjs`, issue #467) treats
an issue's `automation:in-progress` older than `STALE_OWNERSHIP_THRESHOLD_MINUTES`
(180 min) as a dead run and escalates to `automation:needs-human` — this
skill relies on that existing sweep rather than building its own recovery
path (`## Hors scope` of #469 explicitly excludes #429's pipeline-release
work; #467 is the filet, already merged).

### Verify readiness

Same as `implement-task/SKILL.md` step 1: if the verdict is anything but
`READY_FOR_IMPLEMENTATION`, or the spec is ambiguous/incomplete, or the
issue still carries `blocked`, escalate per § Escalade below instead of
guessing.

## Préalables vérifiés (before this skill goes live)

#469's acceptance criteria require two things checked **before** activation,
with the result recorded here rather than assumed:

1. **Can a Claude Code Routine launch sub-agents?** — **Verified, yes.**
   This session (itself running under the same trigger shape a Routine
   uses — a GitHub `issues.labeled` webhook, no human watching live)
   launched a foreground `Agent` call during the drafting of this skill and
   received a normal reply back (`sub-agent alive, model: claude-sonnet-5`,
   1.6s, 0 tool uses). A session that can launch a foreground sub-agent and
   read its result is structurally sufficient for the step-by-step
   orchestration this skill describes.
2. **What happens when a run exceeds its duration limit?** — **Not
   verified — undocumented.** The public Claude Code Routines documentation
   states routines are a research preview whose "behavior, limits, and API
   surface may change," and does not state a wall-clock timeout, a
   turn/step cap independent of it, or any signal that would let an
   external system detect "this run was cut off by a duration limit" versus
   "this run finished normally." Context-compaction interaction with any
   such limit is likewise undocumented.

Per #469's own error-handling section ("Un des préalables non vérifié ...
la mise en service n'a pas lieu et le résultat est consigné — c'est un cas
d'arrêt, pas un détail à contourner"), prerequisite 2 failing means: this PR
delivers the skill, the sub-agent isolation rules in the three wrapped
skills, and the declarative config, but does **not** itself flip a live
GitHub Routine trigger onto this skill — exactly like every other routine in
this repo's history (R2/R3/R4/R5), whose actual activation has always been a
separate, manual step (a human configuring the trigger at
claude.ai/code/routines, per `automation-plan.md` §7's phase log). What this
PR *does* change is `.automation/routines.yml`'s declarative entry for the
`automation:ready` trigger (§ "Fichiers impactés" below) — the
observability/validation layer, not the live trigger — so a human deciding
to activate this skill has one place to point the real Routine at, with the
unresolved duration-limit question flagged for them here rather than
discovered mid-incident. A long coordinator run (implementation + up to
three review/fix rounds) is exactly the shape most exposed to an
undocumented cutoff, which is why this isn't a formality to wave through.

## Routage (dry-run, #406)

Runs once, right after "Claim the run" above and before § 1 below. It
computes and journals the sub-agent model this run *would* route to, and the
matrix decides whether that model is actually applied to § 1's `Agent` call:
`.automation/routing-policy.yml#activation` (#476) resolves a mode per
triplet (routine × complexity band × risk level) via
`scripts/routing-activation.mjs#resolveActivation` — `observe` (a triplet
missing from the matrix, or the matrix itself absent, always resolves
`observe`; so does any triplet whose risk is `high`, whatever the matrix
declares) or `apply`. The matrix this skill ships with (and every matrix
until a human deliberately flips a triplet, per `automation-plan.md` §5
"Passage du dry-run à l'activation contrôlée") declares `observe`
everywhere, so every `Agent` call in this skill keeps launching without an
explicit `model` override for as long as that holds, exactly as
`## Limites` already states.

1. Build a `TaskContext` (`scripts/task-context.mjs#buildTaskContext`) from
   the issue already read while claiming the run — `eventName: 'issues'`, a
   payload built from that same issue, `routine: 'coordinator'` (the key
   this run's entry actually has in `.automation/routines.yml`, not
   `coordinator-implement` — that name is only the automation-log marker for
   this step's journal entry, below), this run's id.
2. Load `.automation/routines.yml`, `.automation/model-catalog.yml`,
   `.automation/routing-policy.yml`
   (`scripts/automation-dispatch.mjs#loadRoutinesConfig`/`#loadModelCatalog`/`#loadRoutingPolicy`).
3. Call `scripts/routing-dry-run.mjs#resolveRoutingDryRun` with that
   `TaskContext`, the issue's **full, untruncated** body as `issueBody`
   (never `TaskContext.entity.bodyExcerpt` — `## Catégorie de risque` sits
   near the end of a long spec and `task-context.mjs`'s own truncation could
   silently drop it), the issue's labels, the three loaded configs, and no
   `llmResponse` — this step never launches the classification sub-agent
   itself (#403's own wiring into this skill is a separate, later change).
   When `resolveRoutingDryRun`'s internal `shouldRunLlmFallback` check would
   have warranted one, the chain continues on the heuristic assessment alone
   and says so in the returned `limits`, exactly as
   `scripts/routing-dry-run.mjs` already handles that case on its own.
4. A non-empty `missing`, or an error thrown by `resolveRoutingDryRun`
   through `routeModel` (invalid catalog/policy version, no policy for this
   routine, a missing band) or through `resolveActivation` (a matrix entry
   naming an unknown mode/routine/band — the CI job `automation-config`
   already refuses such a matrix at merge time, so this is defense in depth,
   not the expected path) — **never** caught or turned into a partial
   decision — go straight to § Escalade below, naming exactly what's
   missing or invalid. Nothing has launched yet at this point, so this is
   the same kind of precondition failure as "Verify readiness" above, just
   discovered one step later.
5. Otherwise, capture `rollbackAtOpen` — the boolean value of `rollback` read
   from the `routingPolicy` object step 2 above already loaded (`false` when
   absent, never re-derived from anything else) — in this session's own
   memory, unchanged, to reuse when this run's journal closes (§ "Converged"
   step 4 / § Escalade step 3 below, issue #490). Then upsert the **issue's**
   own journal
   (`scripts/automation-log.mjs#upsertAutomationLog`, `number` = the issue,
   routine `coordinator-implement`, `status: 'running'`), passing this
   decision's `complexity`, `routing`, the new `routingApplied`
   (`resolveRoutingDryRun`'s own `applied` field), `activation`
   (`resolveRoutingDryRun`'s own `activation` field — the resolved mode and
   its reason) and `taskContextVersion` (`TaskContext.version`) fields — so
   the rendered journal (`scripts/automation-log.mjs` § dry-run rendering)
   lets an operator compare the proposed model, the resolved activation mode
   and why, the model actually used (unchanged as long as that mode is
   `observe`, per this section's opening line), and the routine's eventual
   result. A relaunch of this skill on the same issue updates this same
   comment via its marker (`markerFor('coordinator-implement')`) — never a
   second one, same guarantee `upsertAutomationLog` already gives every
   other caller. This `status: 'running'` is not left standing once the run
   finishes: § "Converged" step 4 and § Escalade step 3 below close this
   same journal with the run's real outcome, so the comparison this journal
   exists for actually includes the routine's result, not just its starting
   snapshot.

This step reads three config files, builds one `TaskContext`, and upserts
one comment — no model choice is ever applied here, and no `Agent` call in
§ 1–§ 3 below reads this decision's `selectedModel` back.

## Budgets (#478)

Runs once, right after § "Routage" above and before § 1 below reads any
further. A run that routes to a costlier model (once activation ever moves
past `observe`) can also consume more — more sub-agents, more fix rounds —
than today; this section caps that, with a stop as the *only* outcome of a
crossed limit, never a silent fallback to a cheaper model, whatever the
resolved risk level. `scripts/routing-budget.mjs` is the pure decision
layer this whole section calls into (`loadBudgets`, `checkBudget`) — see
`doc/automation/model-routing.md` § "Budgets" for its full contract.

1. Call `scripts/routing-budget.mjs#loadBudgets(routingPolicy)` with the
   same `routingPolicy` object § "Routage" step 2 already loaded. A thrown
   error (a zero/negative/non-numeric budget, an unknown field — never
   silently ignored) is the same kind of precondition failure as §
   "Routage" step 4: go straight to § Escalade below, naming the error
   verbatim (it already names the file and the key). Nothing has launched
   yet at this point. A missing `budgets` section throws nothing — it
   resolves to `{}`, every check below becomes non-binding.
2. Keep a `subagentsLaunched` counter in this session's own memory, starting
   at 0 for this run. Immediately before every `Agent` call this skill
   itself makes (§ 1's one call, each of § 2's two calls per round, § 3's
   one call per round — never after the fact, so a launch that doesn't
   happen is never counted), call
   `checkBudget(budgets, { subagentsLaunched: subagentsLaunched + 1 },
   { routine: 'coordinator', scope: 'subagentsLaunched' })`. `status:
   'exceeded'` means: don't launch that sub-agent, stop right here, go to §
   Escalade below with this result. `status: 'ok'` means: launch it, then
   increment the counter by one.
3. Before starting a **new** fix round (§ 3, at the same point that section
   already reads/increments its own `automation:attempt-N`), call
   `checkBudget(budgets, { fixIterations: N }, { routine: 'coordinator',
   scope: 'fixIterations' })` with `N` = the round about to start.
   `exceeded` stops before posting `automation:attempt-N` and before
   launching that round's fix sub-agent — go to § Escalade below.
4. Once, right after step 1 above and before § 1 launches anything, read
   this run's own rolling-day counter: `search_issues` for
   `is:issue in:comments "<!-- automation-log:coordinator-implement -->"
   updated:>=<24h ago, ISO 8601>` and count the matches — the same
   best-effort approximation `weekly-report/SKILL.md` § "Verdicts R3"
   already uses for a period count with no dedicated metrics store,
   stated as such rather than presented as exact (a journal is opened at
   run start and closed at run end, so a run spanning the window boundary
   can be counted zero, one, or twice depending on exactly when the search
   runs — acceptable slack for a budget, not for a report). If the search
   itself errors or returns nothing usable, treat the counter as
   unavailable — pass `counters: {}` (no `runsPerDay` key) to the call
   below, which is exactly `checkBudget`'s own "compteurs de période
   indisponibles" case: the period budget is skipped (`status: 'ok'`,
   noted in the result's `limits`), never blocking the run on a read
   failure. Otherwise call `checkBudget(budgets, { runsPerDay: <count> },
   { routine: 'coordinator', scope: 'runsPerDay' })`; `exceeded` stops
   before § 1 launches anything — go to § Escalade below.

None of the above ever changes which model an `Agent` call uses — a
crossed budget is orthogonal to § "Routage"'s own model choice, and never
resolved by picking a cheaper one, including when this run's own risk
level is `high` (where § "Routage" already forces `observe`): a budget
stop has exactly one outcome, the same escalation sequence every other
stop in this skill already uses, never a smaller/cheaper retry and never
an automatic relaunch.

## Procédure

### 1. Implementation

Launch one `Agent` sub-agent (full tool access — file edit, git, `pnpm`,
GitHub MCP tools) with a prompt that is, verbatim, "follow
`.claude/skills/implement-task/SKILL.md`'s procedure for issue #N, as its
implementation sub-agent" plus the issue number and this run's context
(nothing this session doesn't already have from claiming the run above —
there is no separate implementer output yet to withhold at this step).

The sub-agent follows `implement-task/SKILL.md` unchanged except for the two
deltas that skill's own text now states under "As the coordinator's
implementation sub-agent" (§ below, and in that file): it skips the
`automation:ready` → `automation:in-progress` swap (already done by this
skill above) and, once the PR is open, adds `automation:coordinator-owned`
to it as its very last action — before this step returns. That label is
what guards `needs-review-label.yml` (issue #468, already merged) from ever
queuing this PR for standalone R3 on a later push.

If the sub-agent reports it had to stop (ambiguous scope discovered
mid-work, a check suite that stays red) instead of opening a PR, treat it
exactly as `implement-task`'s own row #6 escalation: go to § Escalade below
without starting a review round.

### 2. Review (two isolated sub-agents, disjoint corpora)

The review is split into two sub-agents because their inputs are disjoint,
not because two opinions are better than one (#470) — a **functional**
reviewer judging spec conformance against `doc/functional/`, and a
**technical** reviewer judging architecture/backward-compat/debt against
`doc/technical/architecture.md` and `project-conventions`. Launch both as
**new** `Agent` calls — never `SendMessage` back to the implementation
sub-agent, never to each other, and never paste either one's reply into the
other's prompt.

The **functional** reviewer's prompt contains only:

- the issue number (it reads the spec itself, fresh, via GitHub tools);
- the PR number and the exact HEAD SHA to review (it reads the diff itself
  via `pull_request_read`);
- an instruction to follow `pr-review/SKILL.md`'s procedure §1–§4 "as the
  coordinator's **functional-corpus** review sub-agent".

The **technical** reviewer's prompt contains only:

- the PR number and the exact HEAD SHA to review — **never the issue
  number or the issue's spec**, in any form, including a paraphrase of what
  the issue is about;
- an instruction to follow `pr-review/SKILL.md`'s procedure §1–§4 "as the
  coordinator's **technical-corpus** review sub-agent".

`pr-review/SKILL.md`'s own text (§ "Context isolation (coordinator
sub-agent only)") states the same restrictions from each reviewer's own
side, per corpus — deliberately written in both places, not only enforced
by this skill deciding what to send, so the isolation doesn't leak through
a reviewer that goes looking for more context on its own initiative.

Nothing else reaches either reviewer. In particular: never the
implementation sub-agent's plan, its reasoning, its PR description body,
any comment either sub-agent posted, this session's own commentary about
how the implementation went, or — new to this split — the **other
reviewer's** reply, findings, or PR review. The line is the *provenance* of
context, not its volume (#469) — a summary of the implementer's reasoning
is exactly as disallowed as the raw transcript, and the same now holds
between the two reviewers themselves: reading the other's verdict before
forming your own defeats the reason the corpora were split apart.

Each reviewer runs its own half of the checklist (`pr-review/SKILL.md` § 1,
the corpus tags there), classifies every finding it forms
(`blocking`/`important`/`suggestion`/`uncertain`, each with evidence,
impact, confidence, recommendation, and `corpus: in`/`out` — that file's
own § "Classify every finding"), and submits its own real PR review
(`pull_request_review_write`, `event: COMMENT`, per that skill's own §
"Post the review") — two separate, independent reviews, each a durable
GitHub artifact both a human and the next fix round read from. Neither
claims any label (nothing to claim — this run's issue already holds
`automation:in-progress`) and neither posts a verdict label itself; each
returns its own findings to this skill instead, structured enough to feed
directly into `scripts/review-verdict.mjs` (§ below) — never a prose
summary this skill would have to reinterpret.

If either sub-agent instead reports that the PR's HEAD moved mid-review
(`pr-review/SKILL.md` § 3 — another push landed on this branch, e.g. a
human's, while a round was reading the diff), that is not an escalation:
discard **both** rounds' findings entirely, even the one that didn't report
a moved HEAD — a verdict computed from one reviewer's read of the old HEAD
and the other's read of the new one would be comparing two different
diffs, which defeats the whole point of running them on the same commit.
Fetch the current HEAD SHA (`pull_request_read`) and launch fresh
functional and technical sub-agents together on it, the same way "Claim the
run" first noted the SHA.

If either sub-agent fails outright or returns no usable reply (a tool
error, a truncated run, anything short of a real structured findings
list), do **not** compute a verdict from the reviewer that did answer — see
"A reviewer is missing" under § Escalade below. Concluding on one side
alone is exactly the shortcut the mechanical rule exists to rule out (#470,
"un relecteur échoue ou ne rend rien").

#### The review verdict is mechanical

Never this skill's own judgment call, and never computed by hand: pass both
reviewers' structured findings to `scripts/review-verdict.mjs`'s
`computeReviewVerdict({ functional, technical })` (invoked via `Bash`,
e.g. `node -e '...'` or a small temp script feeding it the two findings
arrays as JSON) and act on its `verdict` field only:

- `needs-human` — either reviewer's `status` wasn't `ok` (missing/failed) —
  go straight to § Escalade below, naming `missingReviewers` in the
  escalation comment. Never reached by findings alone, only by a reviewer
  that didn't answer.
- `needs-fix` — at least one **in-corpus** `blocking`/`important` finding
  (deduplicated across the two reviewers, an out-of-corpus finding excluded
  regardless of its severity) — go to § 3 below.
- `review-pass` — none — go to § 4.

The function already applies the four severity combinations, the dedup of
an identical finding raised by both reviewers, and the out-of-corpus
exclusion (`scripts/review-verdict.test.mjs` covers all of these) — this
skill's only job at this step is to call it with the two reviewers' actual
output and act on what comes back, never to override it or add a round the
result didn't call for. A disagreement between the two reviewers (one
passes, one blocks) is never arbitrated by this skill's own reading of the
two reviews — the `needs-fix` branch above, mechanical, is what decides it.

### 3. Fix (sub-agent, up to 3 rounds)

Only reached when § 2 found at least one `blocking`/`important` finding.
Before launching the fix sub-agent, post `automation:attempt-N` on the PR
(N = 1 on the first round, incrementing each round — read whichever
`automation:attempt-*` is already present the same way
`address-feedback/SKILL.md` § "Attempt counter" does, so this number
survives a crash and resume exactly like R4's own counter does). **Never**
post `automation:needs-fix` on this PR — that label is R4's own live
routine trigger (`pull_request.labeled`, filter `automation:needs-fix`,
`doc/automation/state-machine.md` §3); posting it here would start a
second, independent `address-feedback` session racing this one on the same
branch, exactly the double-fire class `automation-plan.md` §4 already
documents for R2/R3/R4's own labels. `automation:coordinator-owned` guards
`needs-review-label.yml`'s output (#468) but there is no equivalent guard on
a routine's own native trigger — the only safe fix is to never emit the
label that trigger matches on a PR this skill owns.

If `automation:attempt-3` was already present, this would be a 4th round:
**stop, don't launch a fix sub-agent**, go to § Escalade below instead
(cap reached — identical semantics to `address-feedback`'s own cap, applied
here instead of there).

Otherwise, launch an `Agent` sub-agent with full tool access and a prompt
built from: the issue, the PR, and `review-verdict.mjs`'s own `findings`
array from § 2 (`blocking`/`important` only — the same filter
`address-feedback/SKILL.md` step 2 already applies; already deduplicated
across the two reviewers and already excludes anything tagged
`corpus: out`, so this skill passes it through as-is, never re-filtering it
by hand). The `reviewers` attribution on each finding
(`["functional"]`/`["technical"]`/both) is informational only —
`address-feedback` acts on severity alone, unchanged by this split. Follow
that skill's procedure "as the coordinator's fix sub-agent" (unchanged
otherwise: gather/prioritize/fix, never push on red, resolve fixed threads,
publish the synthesis comment).
The delta from a standalone R4 run, stated in `address-feedback/SKILL.md`
itself: no label claim (this skill already posted the attempt label above),
and it reports its outcome (fixed / partially fixed / needs to escalate)
back to this skill instead of posting `automation:attempt-N` or running the
escalation label sequence itself.

- **Escalates** (contradiction, unresolvable ambiguity, a fix needing a
  materially larger change, or a check suite still red after a good-faith
  attempt) → go to § Escalade below, same as the cap case.
- **Fixed and pushed, suite green** → go back to § 2 for a fresh, newly
  isolated review sub-agent on the new HEAD SHA. A round never reuses the
  previous round's review sub-agent or its context.

### 4. Converged

Reached when a review round (§ 2, first pass or after a fix round) finds no
`blocking`/`important` finding.

1. Post `automation:review-pass` on the PR, clearing any
   `automation:attempt-*` present (mirrors `pr-review/SKILL.md` § "Label the
   verdict" exactly — this is the one point in the loop where reusing R3's
   own label is correct and intended: it drives `review-status-sync.yml`,
   the only mechanism available to set the `claude/review` commit status,
   and it also upserts that Action's `pr-review` journal entry for this PR
   for free). This is `review-verdict.mjs`'s `review-pass` outcome for the
   round that converged — the two reviewers' combined, deduplicated,
   in-corpus findings, not either reviewer's alone.
2. Re-check the risk category against the **final** diff (implementation
   plus every fix round), the same whitelist `implement-task/SKILL.md` step
   11 and `automation-plan.md` §5 use: post `automation:enabled` only if it
   still reads Faible end to end — a diff that grew to touch a serialized
   model, a port/adapter, `apps/scoreo/public/`, Vite/TS config, or
   navigation during a fix round loses eligibility even if the original
   plan didn't predict it. Never this skill's own judgment call alone
   (issue #479): confirm with
   `scripts/risk-controls.mjs#requiredControls({ riskLevel, activationMode })`
   before posting — a `riskLevel` of `high` (including the issue's
   `## Catégorie de risque` missing or unreadable, which that same function
   normalizes to `high`) always forbids `automation:enabled`, regardless of
   `activationMode` or how green every round came back. The coordinator
   never poses `automation:enabled` on a PR whose linked issue is Élevé,
   full stop — `risk-controls.yml`'s `risk-controls` job
   (`checkEnabledLabelAllowed`) is the same rule applied in depth, on the
   actual label combination, in case this step is ever skipped or wrong.
3. Remove `automation:coordinator-owned` — this run is done with the PR;
   any future push (a human's) should go through standalone R3 normally.
4. Close the issue's routing dry-run journal opened in § "Routage (dry-run,
   #406)" step 5 (`scripts/automation-log.mjs#upsertAutomationLog`,
   `number` = the issue, routine `coordinator-implement`,
   `onlyIfRunning: true`, `status: 'succeeded'`) — the same `onlyIfRunning`
   mechanism `coordinator-log-sync.yml` already uses to close the PR-side
   `coordinator-fix` journal on this same outcome, called directly by this
   session here instead of by a workflow, because this journal (unlike
   `coordinator-fix`) was opened by the session itself in § "Routage" step
   5, not by a label-triggered Action. Always finds that journal `running`
   on this path (§ "Routage" always reaches its own step 5 before § 1 can
   launch anything), so this is never a no-op here the way it can be in §
   Escalade below. Before this call, re-read `.automation/routing-policy.yml`
   from disk (`scripts/automation-dispatch.mjs#loadRoutingPolicy` —
   deliberately a fresh read, not the `routingPolicy` object § "Routage" step
   2 loaded into memory at run start, so a change made after that load is
   actually caught), read its `rollback` field the same way step 5 above did
   (`false` when absent) as `rollbackClosed`, and call
   `scripts/routing-activation.mjs#detectRollbackDuringRun(rollbackAtOpen,
   rollbackClosed)` (issue #490). When it returns `true`, set
   `activation.rollbackDuringRun = true` on the `activation` object about to
   be re-passed below — on any other outcome (including the reread itself
   throwing: file missing or invalid YAML, unlikely since the same file was
   already validated at this run's own start and by the CI job
   `automation-config`, but not excluded on a long run), leave `activation`
   exactly as § "Routage" step 5 captured it; a reread failure here never
   fails this journal close or the run itself, same tolerance § "Budgets"
   step 4 already gives an unavailable period counter. **Re-pass the same
   `complexity`, `routing`, `taskContextVersion` and `routingApplied` values §
   "Routage" step 5 captured, and this same (possibly now-enriched)
   `activation` object** — still in memory in this session at this point —
   on this call: `upsertAutomationLog` re-renders the whole comment body from
   scratch and never merges it with the previous one, so omitting them here
   would wipe the Complexité/Routage/Configuration/Activation/Modèle
   appliqué lines the `running` journal carried, right as the run reaches
   the steady state an
   operator actually reads. **Also pass `runMetrics`**, built per §
   "Métriques" below from this same information plus the round data § 2/§ 3
   produced along the way — this is the one call in this whole run where
   that record actually gets published.
5. Remove the issue's `automation:in-progress` — last, only after the four
   steps above, so the pipeline's one in-flight slot frees exactly when
   this run is actually finished, not before.
6. Post the coordinator's own synthesis (§ "Sorties obligatoires" below).

### Escalade

See § Escalade below for the full sequence — reached from § 1's stop, § 2's
missing-reviewer verdict, § 3's cap/escalation, or a run that can't
otherwise reach § 4.

## Sorties obligatoires

On a converged run (§ 4):

- One PR, `Closes #N`, structured per `doc/automation/skill-contract.md` §2
  (the implementation sub-agent's own PR description already carries this;
  this skill doesn't rewrite it).
- Two formal PR reviews per round, one from each isolated sub-agent (§ 2,
  functional and technical), each a real `pull_request_review_write`
  submission.
- Zero to three fix commits (§ 3), each behind a green full check suite.
- `automation:review-pass` and, if still eligible, `automation:enabled`
  (§ 4).
- `automation:coordinator-owned` removed, issue's `automation:in-progress`
  removed, in that order (§ 4).
- One synthesis comment on the PR (`add_issue_comment`) — this skill's own
  instance of `doc/automation/skill-contract.md` §2's five fields: Statut
  (converged / escalated), Résumé (rounds run, final verdict), Artefacts
  (PR, commits, review(s)), Validations (which of `implement-task`'s five
  checks passed, on which round), Questions non résolues (any
  `suggestion`/`uncertain` finding left for a human, "aucune" otherwise).
  Includes the metrics named in "Métriques" below and the finding
  attribution named in "Attribution des findings" below.

On an escalated run: no PR review-pass/enabled labels — see § Escalade.

### Attribution des findings

Every review round's findings, functional and technical alike, are already
attributed by construction — each finding a reviewer returns carries only
that reviewer's own name (§ 2), `review-verdict.mjs` never blends the two
into an anonymous pool, and each reviewer's own formal PR review
(`pull_request_review_write`) is itself a durable, separately-authored
GitHub artifact per reviewer. The coordinator's own synthesis comment
(above) is what makes this attribution readable in one place without
opening both reviews: for the round that converged (or, on an escalated
run, the last round actually completed), list every finding with its
severity, which reviewer(s) raised it (a finding raised by both, after
dedup, names both), and whether it was excluded from the verdict as
out-of-corpus — the same shape `scripts/review-verdict.mjs`'s
`findings`/`outOfCorpusFindings` already return, and the same shape
`scripts/automation-log.mjs`'s `findings` field (added by this same
change, alongside the `coordinator-review-functional`/
`coordinator-review-technical` markers) knows how to render. As with
`metrics` above, no `.github/workflows/*.yml` Action calls
`automation-log.mjs` with this field yet — the rendering is exercised only
by its own unit tests today; the synthesis comment is the mechanism this
skill actually has right now to make attribution visible on the PR, and the
two new markers are there for a follow-up that wires a real per-reviewer
journal to them.

### Métriques

Every run — converged or escalated — records in the synthesis comment
(§ above): the number of review/fix rounds actually run (0–3), which
sub-agent step (if any) reported hitting a context-compaction notice during
its own run, and whether this session's own remaining-usage signal (visible
to the session, not inferred) indicated this run was approaching a usage
cutoff at any point. These three are self-reported by the session, not
pulled from an external metrics store — no such store exists yet; this is
the first run any of them are collected for, which is the acceptance
criterion (#469: "collectées dès cette première version"), not a promise
that a dashboard already aggregates them.

These three **are** the metric set #469 defined. #469 originally named a
fourth, tokens per run; it was dropped from the acceptance criteria by an
explicit human call on #473 rather than carried as an open gap: the other
three are discrete events a session can observe about itself and
self-report as a boolean/count, whereas nothing available to a Claude Code
session today exposes a comparable, reliable token count for its own run.
Should such a signal appear (e.g. usage reporting surfaced by the Claude
Agent SDK), it takes a new ticket, not a silent line here.

`scripts/automation-log.mjs`'s optional `metrics` field (added for #469)
still carries exactly these three raw values, and is still **not** fed by
`coordinator-log-sync.yml`: that Action fires off the label events this
skill posts mid-run, and a session has no tool to edit a comment it already
posted (same limitation `pr-review`'s own journal already lives with,
`automation-plan.md` § "R3 idempotent"). That field is unchanged by what
follows; it is not this section's channel.

**`RunMetrics`, a structured record per run (#477).** The three
self-reported values above answer "did anything unusual happen to the
session," never "did the routing decision this run made turn out right" —
the number a run's own `RoutingDecision` (§ "Routage" above) cannot answer
about itself, and the one #476's activation matrix and any future budget
need before either can be calibrated on real data instead of guesses. This
skill builds one at the very end of every run — converged (§ "Converged"
below) or escalated (§ Escalade below) — from what this session already has
in hand at that point: the `routine` name and `entity` from § "Routage"
step 1, `complexity`/`risk`/`routing`/`activation`/`taskContextVersion`
already captured by § "Routage" step 5, the model the § 1–§ 3 `Agent` calls
actually ran with, this run's own start/end time, § 2's final round
`findings` count per reviewer, § 3's `fixIterations` (the attempt number
reached), whether the check suite implement-task/address-feedback reported
was green without a dedicated CI-only fix round, and — only on an escalated
run — the stop reason named in § Escalade's own comment (as `escalation`,
the one free-text field, redacted the same way `buildRunMetrics` always
redacts it). Call `scripts/run-metrics.mjs#buildRunMetrics(input)` with
these; it returns `{ valid: true, metrics }` for anything this session can
legitimately build (missing pieces simply come back named in
`metrics.missingFields` and `metrics.complete: false`, never guessed —
e.g. a run escalated at § 1 before any review round has no `findings`,
`ciGreenFirstPass`, or fix-round data yet, and the record says so rather
than pretending it wasn't collected at all), or `{ valid: false, errors }`
only if this session assembled something that doesn't itself match the
contract (a real bug in this skill's own call, not a data gap) — in that
case, log a warning in the synthesis comment naming the collection failure
rather than passing a malformed `runMetrics` through.

Unlike the three raw `metrics` values above, `RunMetrics` **does** have a
real channel already, because it doesn't need a separate Action at all: it
rides the same `upsertAutomationLog` call this skill already makes on the
issue's `coordinator-implement` journal at § "Converged" step 4 and §
Escalade step 3 (re-passing `complexity`/`routing`/`taskContextVersion`/
`routingApplied`/`activation` there already, per those steps' own text) —
just add the freshly-built `runMetrics` to that same call. No new comment,
no new marker: a relaunch on the same issue updates the same journal entry
`upsertAutomationLog` already keeps idempotent by marker, exactly like every
other field it renders. The synthesis comment (§ "Sorties obligatoires"
above) keeps naming the same three raw values for a human skimming the PR;
`RunMetrics` is the structured, validated counterpart published on the
issue's journal instead, for a consumer (a human, `weekly-report`/R6, or a
future calibration pass — itself out of scope here, per run-metrics.mjs's
own "Hors scope") that needs to read it back as data rather than parse
prose.

## Contrôles

Every check `implement-task/SKILL.md` and `address-feedback/SKILL.md`
already require of their own step stays required here, unchanged, run by
the sub-agent that does that step — this skill adds none of its own beyond
the mechanical verdict rule (§ 2) and the label-boundary sequencing (§ 4).
This skill's own control is that every step boundary above writes real
GitHub labels **before** moving to the next step, not just recorded in this
session's own memory — so a crash between rounds always leaves an
inspectable, resumable-by-a-human state (§ "Claim the run").

## Escalade

Per `doc/automation/skill-contract.md` §3, applied at the same three points
`implement-task`/`address-feedback` already define, run by this skill
instead of by a standalone R2/R4:

1. **§ 1's implementation sub-agent stops** (ambiguous spec, unjustified
   out-of-scope edit, suite that stays red) — same condition as
   `implement-task/SKILL.md` row #6.
2. **§ 2's `review-verdict.mjs` call returns `needs-human`** — one or both
   review sub-agents failed outright or returned no usable structured reply
   (#470, "un relecteur échoue ou ne rend rien"). Never computed from the
   reviewer that did answer; the escalation comment names exactly which
   reviewer(s) are missing (`missingReviewers`).
3. **§ 3's fix loop stops without converging** — same conditions as
   `address-feedback/SKILL.md` rows #19/#20 and § "Escalating to a human",
   named in the escalation comment (step 5 below) as exactly one of three
   distinct motifs (issue #479 — never a generic "fix loop failed"):
   - **Tentatives épuisées** — `automation:attempt-3` was already present
     when this round would have been a 4th, with no scope mismatch or
     still-red suite in play; three genuine fix attempts simply didn't
     converge.
   - **Dérive de périmètre constatée par un relecteur** — either the fix
     sub-agent reports the review's finding(s) need a materially larger or
     differently-shaped change than the review anticipated (the scope
     mismatch of `address-feedback/SKILL.md` step 4), or it reports two
     findings that directly conflict, or a single one too vague to act on
     without guessing the reviewer's intent (the contradiction/ambiguity
     case of `address-feedback/SKILL.md` step 3) — in both cases the drift
     was flagged by a review sub-agent's finding, not discovered by the
     coordinator itself, and both are the same motif per
     `doc/automation/state-machine.md` § "Contradictory feedback" (a
     conflicting/ambiguous item is escalated on the same terms as a scope
     mismatch, not treated as a fourth distinct cause).
   - **Échec de validation après le budget d'itérations** — the full check
     suite (`pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm
     test:e2e`) is still red after a fix round that used up the attempt
     budget (`address-feedback/SKILL.md` step 5), distinct from the other
     two: the code changed, but validation itself never turned green.
4. **A review or fix sub-agent itself reports it cannot proceed** for a
   reason not covered above (e.g. it lost access to a tool mid-run) —
   treated the same as 1/2/3, never silently retried.
5. **§ "Routage (dry-run, #406)" can't produce a decision** — a non-empty
   `missing` from `resolveRoutingDryRun` (no `TaskContext`, or no readable
   `## Catégorie de risque`), or an error it let through from `routeModel`
   (invalid catalog/policy version, no policy for this routine, a missing
   band). Reached before § 1 launches anything, so step 1 of the sequence
   below (removing labels from a PR "if one exists") finds none yet, same as
   condition 1.
6. **§ "Budgets (#478)" throws while loading, or `checkBudget` returns
   `status: 'exceeded'`** for any scope, at any of that section's four
   checkpoints. The run stops right there — no further `Agent` call, no fix
   round started, no fallback to a cheaper model (not even on a `high`-risk
   run, where a budget stop is the only outcome), and no automatic retry: a
   requeued issue (step 2 of the sequence below) waits for the next `automation:ready`
   dispatch like any other escalation, never a relaunch this same session
   triggers itself. Reached either before § 1 launches anything (a load
   failure, or the first sub-agent/period check) — same as condition 5 — or
   mid-run, right before a later `Agent` call or fix round that the crossed
   budget blocks; step 1 of the sequence below finds a PR only in the
   mid-run case.

In every case, this skill performs the full escalation sequence itself
(rather than delegating it to a sub-agent, since only this skill holds the
issue's `automation:in-progress` for the whole run):

1. On the **PR** (if one exists — § 1 escalating has none yet): remove
   `automation:in-progress` if this skill posted the sub-agent's own claim
   equivalent, remove `automation:enabled` if present, add
   `automation:needs-human`. Never add `automation:needs-fix` here either —
   the PR is done with automation, not queued for another R4 round.
2. On the **issue**, in this exact order (`doc/automation/state-machine.md`
   §6 "Escalation frees its slot" — reversing it lets the issue promote
   itself straight back to `automation:ready` in the window between steps):
   add `automation:needs-human`, add `automation:queued`, only then remove
   `automation:in-progress`.
3. Close the issue's routing dry-run journal opened in § "Routage (dry-run,
   #406)" step 5, the same way § "Converged" step 4 does
   (`scripts/automation-log.mjs#upsertAutomationLog`, `onlyIfRunning: true`,
   `number` = the issue, routine `coordinator-implement`,
   `status: 'failed'`). Before this call, apply the exact same
   `rollbackDuringRun` enrichment § "Converged" step 4 applies (issue #490):
   re-read `.automation/routing-policy.yml` from disk, call
   `detectRollbackDuringRun(rollbackAtOpen, rollbackClosed)`, and on `true`
   set `activation.rollbackDuringRun = true` on the `activation` object below
   — with the same tolerance for a reread failure (never blocks this
   escalation; `activation` stays exactly as captured at open). **Re-passing
   the same `complexity`, `routing`, `taskContextVersion` and `routingApplied`
   values § "Routage" step 5 captured, and this same (possibly now-enriched)
   `activation` object**, for the same reason § "Converged" step 4
   does: this call
   re-renders the whole comment body from scratch, so omitting them would
   wipe those lines instead of leaving them showing the run's real outcome.
   **Also pass `runMetrics`**, built per § "Métriques" below with whatever
   this escalated run actually reached (a run stopped at condition 1, before
   any review round, builds one with `findings`/`ciGreenFirstPass` absent
   and named in `missingFields` — never invented) and the stop reason above
   as `escalation`. A no-op when this is condition 5 itself (§ "Routage"
   never reached its
   own step 5, so there is nothing left `running` there to close, and
   nothing was captured to re-pass either) — `onlyIfRunning` already makes
   that safe, same as every other caller of it. **On condition 6, also pass
   `budget`** — the exact `checkBudget` result that returned `status:
   'exceeded'` (or the load error's message, shaped the same way, when §
   "Budgets" failed at step 1) — so the closed journal names the crossed
   limit and the observed value that triggered the stop
   (`scripts/automation-log.mjs` § budget rendering), rather than leaving an
   operator to reconstruct it from this comment's own prose alone.
4. Remove `automation:coordinator-owned` from the PR if present — a human
   taking over should get the normal standalone R3/R4 loop back, not a
   silently orphaned guard label (its own § "Cleared by" already allows
   this: only a dead, non-graceful run leaves it stuck, which is exactly
   what the stale-ownership sweeper, not this skill, then catches).
5. Post one comment naming precisely what's blocking — which step, which
   sub-agent, and its own stop reason verbatim, so a human doesn't have to
   reconstruct it from label history. For condition 3 above (the fix loop
   stopping without converging), lead with exactly one of the three named
   motifs — **Tentatives épuisées**, **Dérive de périmètre constatée par un
   relecteur**, or **Échec de validation après le budget d'itérations** —
   never a generic "escalated after the fix loop", so a human scanning
   several escalations can tell the three apart without opening each one.
   For condition 2 above (a missing
   reviewer), name exactly which corpus/corpora never answered
   (`missingReviewers` from `review-verdict.mjs`), not just "the review
   failed" — a human resuming needs to know whether to re-run one reviewer
   or both. For condition 6 (a budget), name the crossed budget verbatim
   from `checkBudget`'s own `reason` (routine, scope, limit and observed
   value all already in it) — never just "budget exceeded".

## Limites

- Never writes code, reviews a diff, or fixes a finding itself — every one
  of those three jobs is a sub-agent's, running that step's own skill file
  unchanged in substance.
- Never lets either review sub-agent's prompt carry anything from the
  implementation step — no plan, no journal, no PR description narrative,
  no paraphrase of any of those — nor from the *other* reviewer: neither
  ever sees the other's prompt, reply, findings, or PR review (§ 2).
- Never computes the review verdict itself, by reading the two reviews and
  deciding — always `scripts/review-verdict.mjs`'s mechanical rule (§ 2),
  including on a reviewer disagreement (one passes, one blocks) and on a
  missing/failed reviewer (never concluded from the one that answered).
- Never posts `automation:needs-review` or `automation:needs-fix` on a PR
  it owns — both are other routines' live GitHub triggers, and posting
  either would start an independent, uncoordinated second session on the
  same branch (§ 3).
- Never spends a 4th fix round, or lets a sub-agent expand scope beyond
  what a review round actually flagged — same budget `address-feedback`
  already enforces, just checked here instead.
- Never merges its own PR, and never removes `automation:needs-human` —
  same as every other skill in this pipeline.
- Never batches more than one issue per run (`automation-plan.md` §2
  principle 6) — same as `implement-task`.
- Does not itself apply the multi-model routing decision it now computes and
  journals (§ "Routage (dry-run, #406)") — wiring an actual `model` override
  onto an `Agent` call from a resolved `apply` mode is a later tranche of
  #407, not this one (#476 only replaces the mechanism that decides
  `observe`/`apply`, it never consumes the result). Every `Agent` call above
  (§ 1–§ 3) keeps launching without an explicit `model` override for as long
  as `.automation/routing-policy.yml#activation` resolves `observe` for the
  triplet at hand — which every triplet does today, since the matrix this
  skill ships with declares `observe` everywhere (see
  `scripts/routing-activation.mjs`).
- Never launches the classification sub-agent (#403) itself from the
  "Routage (dry-run, #406)" step — that step calls `resolveRoutingDryRun`
  without an `llmResponse`, so the routing decision it journals always rests
  on the heuristic `ComplexityAssessment` alone; wiring an actual classifier
  sub-agent call into this step is a separate, later change.
