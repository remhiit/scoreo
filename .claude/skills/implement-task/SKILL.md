---
name: implement-task
description: 'Implement one GitHub issue end-to-end for the Scoreo repo — branch, tests first, pnpm lint/typecheck/test/build green, visual check for UI changes, doc updates, PR referencing "Closes #N". Use when told to "développe" / implement a ticket. This is the R2 step in doc/technical/automation-plan.md — one run, one issue, never a batch.'
---

# Implement Task

## Objectif

Executes a single GitHub issue's spec (written by `issue-to-spec`) as one
branch, one commit, one PR. See `project-conventions` for the layering and
backward-compat rules referenced throughout. This skill implements — it
never reviews its own diff (that's `pr-review`/R3) and never merges its own
PR (see Limites).

## Entrées requises

This skill assumes the issue already carries, per `issue-to-spec/SKILL.md`'s
spec format: `## Périmètre` and `## Hors scope`, testable
`## Critères d'acceptation`, `## Fichiers impactés`, a `## Catégorie de
risque`, and a `## Verdict de readiness`. Step 1 below re-checks the verdict
before doing any real work — this skill enforces the gate that `issue-to-spec`
only prepares (`issue-to-spec/SKILL.md` § Determining the readiness verdict).
A `## Dépendances` section, if present, is expected to cite only blockers
already closed (a `blocked` label would mean otherwise — step 1's
defense-in-depth check).

## Préconditions

### Which issue

- **As R2** (fired by the routine's GitHub trigger): the issue is the one
  from your triggering context — the `issues` `labeled` event that started
  this run. Don't search for it; the trigger context already identifies it
  precisely, including when several issues carry `automation:ready` at once
  (each matching event starts its own independent session, one issue each).
  If that issue turns out not to be actionable any more (no longer
  `automation:ready`, already closed, etc.), **stop right there and do
  nothing else** — never search for or pick a different `automation:ready`
  issue instead, even if one exists. Other `automation:ready` issues waiting
  means other R2 sessions are already each working their own (see #149: a
  session whose triggering issue wasn't actionable searched and picked a
  different `automation:ready` issue instead, risking a duplicate PR on an
  issue another R2 session was already handling).
- **Interactive, no issue named**: use an explicit selection algorithm, not
  "first in the listing" — list open issues labeled `automation:ready`,
  group them by priority label (`P0`…`P3`), take the highest-priority
  non-empty group, and within that group break ties by the oldest issue
  (lowest issue number). Don't just take the first result an
  `automation:ready` listing happens to return without checking its
  priority against the other candidates.
- **Interactive, issue named**: use that one.

### Claim the run (R2 only, first action)

Replace `automation:ready` with `automation:in-progress` before starting, in
every case — remove `automation:ready`, add `automation:in-progress`. A
stale `automation:ready` left in place would mislead anyone scanning the
backlog into thinking the issue is still unclaimed.

### Guard against a duplicate branch or PR (R2 only, before claiming)

Before touching labels or code, read the issue (`issue_read` method `get`)
and check `closed_by_pull_requests`. If it lists any **open** PR already
referencing this issue (a previous run created one but the label state
wasn't updated, or another session is already on it), **stop right there
and do nothing else** — same treatment as an issue that's no longer
actionable (see "Which issue" above): never open a second PR for the same
issue. Only a PR that's closed without merging (abandoned) doesn't count —
proceed normally in that case.

This is the guard behind `doc/automation/state-machine.md` row #5: "not
actionable" now explicitly includes "already has an open linked PR", not
just "already claimed, closed".

## Procédure

1. **Read the spec fully** — context, acceptance criteria, impacted files,
   out-of-scope, and any `## Dépendances` section. Also read the
   `## Verdict de readiness` line: if it is anything other than
   `READY_FOR_IMPLEMENTATION` — missing entirely, `NEEDS_CLARIFICATION`, or
   `BLOCKED_BY_DEPENDENCY` — stop; the dispatcher should never have promoted
   such an issue to `automation:ready`, but R2 must not proceed on it if it
   somehow did (same defense-in-depth reasoning as the `blocked`-label check
   below). If the spec is ambiguous, missing acceptance criteria, or its
   definition of done can't be checked against the stated scope, stop and
   ask rather than guessing. As a defense-in-depth check (the dispatcher
   should never promote a `blocked` issue to `automation:ready` in the first
   place), also stop if the issue still carries the `blocked` label — that
   combination means something upstream raced or broke, not that it's safe
   to proceed. Any of these is the same stop condition — release the claim
   per "Escalade" below rather than leaving the issue silently stuck on
   `automation:in-progress` with no PR and no comment. Releasing the claim
   before posing the other two labels would race the hourly requeue sweep
   into re-dispatching the issue before `automation:needs-human` protects it
   (`doc/automation/state-machine.md` §6 "Escalation frees its slot"), which
   is exactly why "Escalade" fixes the order. See `doc/automation/
   state-machine.md` § Incomplete issue.
2. **Branch from the latest default branch**: `feat/<issue-number>-<slug>`
   (slug = a few kebab-case words from the title). If that branch already
   exists remotely (an interrupted earlier run on this same issue, caught by
   the duplicate-PR guard above finding no open PR yet), check it out and
   continue on it instead of creating a second, differently-slugged branch
   for the same issue.
3. **Plan before touching code.** Once the branch is settled, write a short
   plan covering: the files you expect to touch and the approach per file,
   the tests you intend to write (which layer, which behavior each one
   checks), and any risk or likely deviation from the spec you can already
   foresee — in a handful of bullets, before making any change. Keep it;
   it becomes the PR body's plan section in step 10. This isn't a separate
   GitHub write, just the thinking made explicit before implementation
   starts. If, once work is underway, the actual diff diverges materially
   from this plan (different files, a different approach, a much larger
   change), treat it like the scope-mismatch case in "Escalade" below rather
   than silently continuing under a plan that no longer describes the work.
4. **Tests first.** Write the test(s) that encode the acceptance criteria
   before the implementation — colocated `*.test.ts(x)` next to the file
   under test, per repo convention. They should fail before step 5 and pass
   after.
5. **Implement**, respecting layering: Reducer in `ui/*/` (pure), Use Case in
   `application/` (zero framework dependency), Repository interface in
   `domain/port/`, implementation in `infrastructure/`. Before introducing a
   new abstraction (a helper module, a new port, a new shared component),
   search the existing codebase for one that already covers the need
   (`doc/reference.md`'s tables are the fastest index) and extend it instead
   — a new abstraction is justified only once nothing existing fits, and
   that justification belongs in the plan (step 3), not discovered by a
   reviewer later. Stay inside the issue's `## Périmètre`/`## Fichiers
   impactés`: an edit outside that scope (an unrelated rename, a
   restructure the acceptance criteria don't require) needs an explicit
   justification recorded in the plan and the PR body, not a silent
   "while I was in there" — when in doubt, leave it out and note it instead
   under "Questions non résolues" in step 10. Any new field on a
   serialized model gets a zod `.default()`; any removal/rename gets a
   migration entry in `doc/technical/migrations.md`.
6. **Verify green**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build
   && pnpm test:e2e` — all five, not a subset. This mirrors what `ci.yml`
   will run on the PR; catch failures here rather than in CI. Build before
   the e2e run — `playwright.config.ts` starts its server with `pnpm
   preview`, which serves `apps/scoreo/dist/`. In the Claude Code remote environment,
   Chromium is preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) —
   do not run `playwright install`; locally, run `pnpm exec playwright
   install chromium` first if needed. If an e2e test fails in a way that
   looks unrelated to this diff, re-run once before concluding it's flaky —
   don't "fix" a test at random just to make it pass. If the suite still
   can't be made green after a reasonable effort, don't push a PR you know
   will be red: escalate per "Escalade" below instead of leaving the branch
   dangling or opening a PR that misrepresents its own state.
7. **Visual check for UI changes.** If the issue touches a screen
   (`apps/scoreo/src/ui/*/`), start the dev server and exercise the actual flow in a
   browser — golden path and the edge cases named in the acceptance
   criteria. Don't claim a UI change works from tests alone.
8. **Update `doc/`** per `CLAUDE.md`'s Pre-commit Checklist: the matching
   `doc/reference.md` table row, `doc/functional/feature.md` or
   `doc/functional/features/*.md` for user-facing behavior,
   `doc/technical/migrations.md` for schema changes. A diff that adds a
   reducer/use case/model/port/adapter/screen without a matching doc update
   is not done yet.
9. **One commit.** Message = the issue's title (see `CLAUDE.md`'s good/bad
   commit examples — describe the *why*, not "Fix" or "Update").
10. **Push and open a PR** with `Closes #N` in the body, structured per
    `doc/automation/skill-contract.md` §2's five fields:
    - **Statut** — `PR opened` (this step only runs once step 6 is
      actually green; the ambiguous/red-suite escalation path never reaches
      here — see "Escalade" below).
    - **Résumé** — the plan from step 3, one or two sentences on what
      changed and why, not a diff restatement.
    - **Artefacts** — the branch, the commit, and the `doc/` files touched
      (step 8).
    - **Validations** — which of step 6's five checks ran green (name them:
      lint/typecheck/test/build/e2e), plus the visual check outcome if step
      7 applied.
    - **Questions non résolues** — anything noted along the way as
      out-of-scope-but-adjacent (step 5's change-budget rule) or left
      unresolved on purpose; "aucune" if there's nothing to flag.
    Open it non-draft only once step 6 is actually green — R2 never opens
    the PR itself as `automation:needs-review`; that label is posed
    automatically by the deterministic `needs-review-label.yml` action on PR
    open, and it should find a PR whose author-side checks already passed.
11. **Label `automation:enabled`** only if the issue's spec marked risk as
    **Faible** *and* the actual diff still matches that (re-check: did this
    PR end up touching a serialized model, a port/adapter,
    `apps/scoreo/public/`, Vite/TS config, or navigation despite the spec's
    prediction? If so, don't add `automation:enabled` — the diff overrides
    the prediction).
12. Move to the next `automation:ready` issue rather than batching multiple
    issues into one PR.

## Sorties obligatoires

Once a run finishes successfully (never reached on the escalation path
below):

- One branch, `feat/<issue-number>-<slug>` (step 2).
- One commit, message = the issue's title (step 9).
- `doc/` updated per `CLAUDE.md`'s Pre-commit Checklist (step 8).
- One PR, `Closes #N` in the body, structured per the five fields of
  `doc/automation/skill-contract.md` §2 (step 10) — this is this skill's
  instance of that structured output format.
- `automation:enabled` posed only when risk stays Faible end to end
  (step 11).

## Contrôles

Procédure step 6, before any PR is opened: `pnpm lint && pnpm typecheck &&
pnpm test && pnpm build && pnpm test:e2e` — all five, not a subset — plus
the visual check of step 7 for any screen touched. A run that can't get
these green does not open a PR (see Escalade).

## Escalade

Per `doc/automation/skill-contract.md` §3. This skill's own instances of
those conditions:

1. **Ambiguous or incomplete input** — step 1: missing/non-
   `READY_FOR_IMPLEMENTATION` readiness verdict, ambiguous spec, missing
   acceptance criteria, unverifiable definition of done, or a stray `blocked`
   label.
2. **Scope mismatch discovered mid-work** — step 3's plan-divergence check
   and step 5's change-budget rule: the diff turns out to need a
   fundamentally different or much larger change than the spec described, or
   an out-of-scope edit can't be justified.
3. **Validation cannot be made to pass** — step 6: the check suite stays red
   after a good-faith fix attempt.

`skill-contract.md` §3's other two conditions — "Contradictory feedback" and
"Retry cap exhausted" — don't apply to R2: this skill runs a single pass per
issue with no review/fix loop to contradict or cap (that loop is R3/R4's,
on the PR this step opens).

Every one of these follows the same sequence as R2's escalation
(`doc/automation/state-machine.md` row #6, § Incomplete issue): post a
comment on the issue naming exactly what's blocking, then release the claim
in this exact order — add `automation:needs-human`, add `automation:queued`,
only then remove `automation:in-progress`. Never leave the issue silently
parked on `automation:in-progress` with no PR and no comment. The
interactive path (a human runs this skill directly) keeps its original
meaning of "ask" — a person is present to answer.

## Limites

Cross-cutting limits, per `skill-contract.md` §1.9 — each is defined once
elsewhere in this file; this section is the single place a reader checks for
all of them, not a redefinition:

- Never pick a different issue when the triggering one isn't actionable
  (see "Which issue").
- Never batch more than one issue into a single PR (Procédure step 12).
- Don't merge the PR yourself. Merging is deterministic tooling
  (`gh pr merge --auto --squash` once checks are green and `automation:enabled`
  is present), not part of this skill.
