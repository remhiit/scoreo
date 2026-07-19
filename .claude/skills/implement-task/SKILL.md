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
  precisely, including when several issues carry `ready` at once (each
  matching event starts its own independent session, one issue each).
- **Interactive, no issue named**: take the first open issue labeled `ready`
  and not assigned, highest priority first (`P0` > `P1` > `P2` > `P3`).
- **Interactive, issue named**: use that one.

Replace `ready` with `in-progress` before starting, in every case — remove
`ready`, add `in-progress`. A stale `ready` left in place would mislead
anyone scanning the backlog into thinking the issue is still unclaimed.

## Workflow

1. **Read the spec fully** — context, acceptance criteria, impacted files,
   out-of-scope. If the spec is ambiguous or missing acceptance criteria,
   stop and ask rather than guessing scope.
2. **Branch from the latest default branch**: `feat/<issue-number>-<slug>`
   (slug = a few kebab-case words from the title).
3. **Tests first.** Write the test(s) that encode the acceptance criteria
   before the implementation — colocated `*.test.ts(x)` next to the file
   under test, per repo convention. They should fail before step 4 and pass
   after.
4. **Implement**, respecting layering: Reducer in `ui/*/` (pure), Use Case in
   `application/` (zero framework dependency), Repository interface in
   `domain/port/`, implementation in `infrastructure/`. Any new field on a
   serialized model gets a zod `.default()`; any removal/rename gets a
   migration entry in `doc/technical/migrations.md`.
5. **Verify green**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build
   && pnpm test:e2e` — all five, not a subset. This mirrors what `ci.yml`
   will run on the PR; catch failures here rather than in CI. Build before
   the e2e run — `playwright.config.ts` starts its server with `pnpm
   preview`, which serves `dist/`. In the Claude Code remote environment,
   Chromium is preinstalled (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) —
   do not run `playwright install`; locally, run `pnpm exec playwright
   install chromium` first if needed. If an e2e test fails in a way that
   looks unrelated to this diff, re-run once before concluding it's flaky —
   don't "fix" a test at random just to make it pass.
6. **Visual check for UI changes.** If the issue touches a screen
   (`src/ui/*/`), start the dev server and exercise the actual flow in a
   browser — golden path and the edge cases named in the acceptance
   criteria. Don't claim a UI change works from tests alone.
7. **Update `doc/`** per `CLAUDE.md`'s Pre-commit Checklist: the matching
   `doc/reference.md` table row, `doc/functional/feature.md` or
   `doc/functional/features/*.md` for user-facing behavior,
   `doc/technical/migrations.md` for schema changes. A diff that adds a
   reducer/use case/model/port/adapter/screen without a matching doc update
   is not done yet.
8. **One commit.** Message = the issue's title (see `CLAUDE.md`'s good/bad
   commit examples — describe the *why*, not "Fix" or "Update").
9. **Push and open a PR** with `Closes #N` in the body, so the issue closes
   automatically on merge.
10. **Label `auto`** only if the issue's spec marked risk as **Faible**
    *and* the actual diff still matches that (re-check: did this PR end up
    touching a serialized model, a port/adapter, `public/`, Vite/TS config,
    or navigation despite the spec's prediction? If so, don't add `auto` —
    the diff overrides the prediction).
11. Move to the next `ready` issue rather than batching multiple issues into
    one PR.

## Guardrails

- If mid-implementation the change turns out to need more files than the
  spec listed, that's fine — but if it turns out to be a fundamentally
  different or much larger change than the spec described, stop and flag it
  rather than silently expanding scope.
- Don't merge the PR yourself. Merging is deterministic tooling
  (`gh pr merge --auto --squash` once checks are green and `auto` is
  present), not part of this skill.
