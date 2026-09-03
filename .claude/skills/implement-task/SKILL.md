---
name: implement-task
description: 'Implement one GitHub issue end-to-end for the Scoreo repo — branch, tests first, pnpm lint/typecheck/test/build green, visual check for UI changes, doc updates, PR referencing "Closes #N". Use when told to "développe" / implement a ticket. This is the R2 step in doc/technical/automation-plan.md — one run, one issue, never a batch.'
---

# Implement Task

Executes a single GitHub issue's spec (written by `issue-to-spec`) as one
branch, one commit, one PR. See `project-conventions` for the layering and
backward-compat rules referenced throughout.

## Which issue

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

Replace `automation:ready` with `automation:in-progress` before starting, in
every case — remove `automation:ready`, add `automation:in-progress`. A
stale `automation:ready` left in place would mislead anyone scanning the
backlog into thinking the issue is still unclaimed.

## Guard against a duplicate branch or PR (R2 only, before claiming)

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

## Workflow

1. **Read the spec fully** — context, acceptance criteria, impacted files,
   out-of-scope, and any `## Dépendances` section. If the spec is ambiguous,
   missing acceptance criteria, or its definition of done can't be checked
   against the stated scope, stop and ask rather than guessing. As a
   defense-in-depth check (the dispatcher should never promote a `blocked`
   issue to `automation:ready` in the first place), also stop if the issue
   still carries the `blocked` label — that combination means something
   upstream raced or broke, not that it's safe to proceed. **As R2**, "ask"
   means posting a comment on the issue naming exactly what's missing, then
   releasing the claim in this exact order: add `automation:needs-human`,
   add `automation:queued`, and only then remove `automation:in-progress`
   (already claimed above) — never leave the issue silently stuck on
   `automation:in-progress` with no PR and no comment, and never remove
   `automation:in-progress` before the other two are posed (reversing the
   order would race the hourly requeue sweep into re-dispatching the issue
   before `automation:needs-human` protects it — see
   `doc/automation/state-machine.md` §6 "Escalation frees its slot"). See
   `doc/automation/state-machine.md` § Incomplete issue.
2. **Branch from the latest default branch**: `feat/<issue-number>-<slug>`
   (slug = a few kebab-case words from the title). If that branch already
   exists remotely (an interrupted earlier run on this same issue, caught by
   the duplicate-PR guard above finding no open PR yet), check it out and
   continue on it instead of creating a second, differently-slugged branch
   for the same issue.
3. **Plan before touching code.** Once the branch is settled, write a short
   plan — the files you expect to touch and the approach per file, in a
   handful of bullets — before making any change. Keep it; it becomes the
   PR body's plan section in step 10. This isn't a separate GitHub write, just
   the thinking made explicit before implementation starts.
4. **Tests first.** Write the test(s) that encode the acceptance criteria
   before the implementation — colocated `*.test.ts(x)` next to the file
   under test, per repo convention. They should fail before step 5 and pass
   after.
5. **Implement**, respecting layering: Reducer in `ui/*/` (pure), Use Case in
   `application/` (zero framework dependency), Repository interface in
   `domain/port/`, implementation in `infrastructure/`. Any new field on a
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
   will be red: escalate exactly like step 1's ambiguous-spec case (comment
   naming what's failing, then release the claim in the same order:
   `automation:needs-human`, `automation:queued`, only then remove
   `automation:in-progress`) instead of leaving the branch dangling or
   opening a PR that misrepresents its own state.
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
10. **Push and open a PR** with `Closes #N` in the body, plus two short
    sections: the plan from step 3 (what changed and why, not a diff
    restatement) and the validation results (which of step 6's five checks
    ran green, plus the visual check outcome if step 7 applied). Open it
    non-draft only once step 6 is actually green — R2 never opens the PR
    itself as `automation:needs-review`; that label is posed automatically
    by the deterministic `needs-review-label.yml` action on PR open, and it
    should find a PR whose author-side checks already passed.
11. **Label `automation:enabled`** only if the issue's spec marked risk as
    **Faible** *and* the actual diff still matches that (re-check: did this
    PR end up touching a serialized model, a port/adapter,
    `apps/scoreo/public/`, Vite/TS config, or navigation despite the spec's
    prediction? If so, don't add `automation:enabled` — the diff overrides
    the prediction).
12. Move to the next `automation:ready` issue rather than batching multiple
    issues into one PR.

## Guardrails

- If mid-implementation the change turns out to need more files than the
  spec listed, that's fine — but if it turns out to be a fundamentally
  different or much larger change than the spec described, stop and flag it
  rather than silently expanding scope.
- Don't merge the PR yourself. Merging is deterministic tooling
  (`gh pr merge --auto --squash` once checks are green and `automation:enabled`
  is present), not part of this skill.
