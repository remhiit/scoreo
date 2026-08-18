# Automation Plan — Torī Valley Scoreboard

Reference document for automating development on `remhiit/toriValleyScoreBoard`
via **Claude Code routines**. Adapted from the same system running on the
user's `scoreo` repo — see that repo's own `doc/technical/automation-plan.md`
for the original design history if useful context.

> **How to use this document.** It's the source of truth for the automation
> architecture. Any Claude Code session working on this topic should read it
> first. It states the current phase and the criterion for moving to the
> next. Don't skip a phase: each gate protects the next one.

**Current phase: 1 — skills written, not yet gated by real interactive use.**

---

## 1. Goal

Automate the *ticket → code → review → merge → deploy* cycle so work can
progress without an interactive session, while guaranteeing no regression
reaches `main`.

## 2. Guiding principles

These explain *why* the architecture is what it is. Challenging them means
redoing the plan.

1. **CI is the only real gate.** Routines have no hindsight on their own
   work. A check that can never say "no" protects nothing. CI must be
   written and proven *before* any autonomy.
2. **Determinism doesn't go through an LLM.** Merging, closing a ticket,
   applying a label: GitHub Actions. Routines only do what needs judgment:
   coding, reviewing.
3. **Push, not pull.** Routine runs are a scarce budget (5/day on Pro, 15 on
   Max). No routine "watches" or "polls" — it's triggered by an event.
4. **Labels are the event bus.** This repo doesn't have a GitHub Project
   (Kanban) board — Issues + labels are the only backlog. If a Project board
   is ever added later, the same rule from scoreo still applies: a column
   change isn't a usable trigger, an issue label is.
5. **All the know-how lives in the repo's skills.** Routines run without
   approval prompts: their prompt stays one line pointing at a versioned
   skill.
6. **One run = one ticket.** Never batch: a giant PR is unreviewable and
   blows up the context.

## 3. Structural constraints (non-negotiable)

- **No self-approval.** GitHub forbids approving your own PR, and every
  routine acts under the same GitHub account. **Consequence:** the approval
  mechanism isn't used. Branch protection requires
  `required_approving_review_count: 0`, and the review verdict goes through a
  **required commit status** (`claude/review`) instead, which the account is
  allowed to post.
- **Available triggers:** schedule, API call (`/fire`), GitHub event (PR,
  release). Nothing else.
- **GitHub events past a routine's hourly cap are dropped, not queued.**
  Filters must stay narrow.
- **Everything carries the user's GitHub identity.** Commits, PRs, comments.

---

## 4. Target architecture

```
Issue created
   │
   ▼
[R1 — GROOMING: interactive session, NOT a routine]
   │  issue-to-spec skill → acceptance criteria, files, risk category
   │  applies the `ready` label
   ▼
Action `issues.labeled: ready` ──POST /fire──► [R2 — IMPLEMENTATION]
                                                 │ implement-task skill
                                                 │ 1 run = 1 issue
                                                 │ branch + code + tests + PR
                                                 │ applies `auto` if low risk
                                                 ▼
                                          PR opened
                                                 │
      GitHub trigger `pull_request.opened|synchronize`
                                                 ▼
                                         [R3 — REVIEW]
                                          │ pr-review skill
                                          │ inline comments
                                          │ commit status claude/review ✅/❌
                                          ▼
                      ┌──────────────────┴──────────────────┐
                   ❌ failure                            ✅ success
                      │ label `needs-fix`                    │
                      ▼                                      │
   Action `pull_request.labeled` ──/fire──► [R4 — FIX]       │
                      │ address-feedback skill                │
                      │ attempt-1 → 2 → 3                    │
                      │ at attempt-3: STOP, `needs-human`    │
                      └──────────► repush ──► R3 (loop)      │
                                                             ▼
                                          All checks green + `auto` label
                                                             │
                                              `gh pr merge --auto --squash`
                                                             ▼
                                                      main → deploy.yml
```

**In parallel, on a schedule:**

- **R5 — Hygiene** (weekly): deps, doc links, Lighthouse, PWA validity. Opens
  one PR per category. Goes through R3 like any other PR.
- **R6 — Report** (weekly): PRs open > 3 days, `needs-human` tickets,
  `claude/review` failure rate, runs consumed. This report is what decides
  whether to widen the `auto` scope.

### Merging is not a routine

Branch protection + required checks + `gh pr merge --auto --squash`. The PR
merges itself once CI is green and the `auto` label is present. No LLM in
the loop.

---

## 5. Labels (the event bus)

Target set for the full pipeline below. **Currently created in this repo:**
`ready`, `in-progress`, `needs-human`, `blocked`, `auto`, `attempt-1/2/3`,
`P0`…`P3` — these back Phase 1's skills (`issue-to-spec`, `implement-task`,
`address-feedback`), which do run today. **Not created yet:** `needs-review`,
`review-pass`, `needs-fix` — they only mean something once Phase 2's two
GitHub Actions exist (see §7); don't add them speculatively before that.

| Label | Role |
|---|---|
| `ready` | Spec validated → triggers R2 |
| `in-progress` | A routine is working on it |
| `needs-review` | Queued for `pr-review` (R3) — the only GitHub trigger a Routine can use, applied automatically when a PR opens, removed once the review is done |
| `review-pass` | `pr-review` (R3) verdict: conforms → translated into a `claude/review` success commit status |
| `needs-fix` | `pr-review` (R3) verdict: needs changes → translated into a `claude/review` failure commit status, triggers R4 |
| `needs-human` | Escalation: iteration cap hit, or out of scope |
| `blocked` | External dependency |
| `auto` | Allowed to auto-merge once checks are green |
| `attempt-1/2/3` | Anti-loop counter. **At `attempt-3`: stop.** |
| `P0`…`P3` | Priority |

### `auto` whitelist (widen from data, not intuition)

**Allowed initially:** content, documentation, dependencies, local refactors
with no public behavior change.
**Excluded:** serialized models and their migrations, ports/adapters,
`public/` (manifest, `sw.js`), Vite/TS config, navigation.

> Consistent with `CLAUDE.md`'s rules: every serialized model must stay
> backward-compatible, every removal/rename needs a migration note. Not
> ground for an autonomous agent to cover on its own.

---

## 6. Skills (`.claude/skills/`)

| Skill | Content |
|---|---|
| `project-conventions` | Delegates to `CLAUDE.md`: stack, pnpm commands, tree, hexagonal architecture, commit conventions |
| `issue-to-spec` | Spec format: context, testable acceptance criteria, impacted files, out-of-scope, **risk category** (determines the `auto` label) |
| `implement-task` | Branch `feat/<issue>-<slug>`, tests first, `pnpm lint typecheck test build` green, visual check, PR with `Closes #N`, `doc/` updates (CLAUDE.md's pre-commit checklist) |
| `pr-review` | **Subjective-only** checklist: spec conformance, hexagonal architecture, zod backward-compat, doc freshness, debt introduced. The mechanical part is already in CI |
| `address-feedback` | Fix exactly the flagged scope. No refactor |
| `site-quality` | Deps, doc links, Lighthouse, PWA. Used by R5 |

**Rule:** a skill not proven interactively doesn't graduate to autonomous.

---

## 7. Phases and gates

### Phase 0 — CI foundations ✅ done

- [x] `.github/workflows/ci.yml` — `lint`, `test`, `build`+`typecheck`,
      `doc-links` jobs, plus a non-blocking `lighthouse` job
- [x] `.github/workflows/deploy.yml` — build + GitHub Pages deploy + smoke
      test, separate from CI (runs after merge, not on every PR)
- [x] No secrets needed for the build (no cloud sync in this app, unlike
      scoreo's `GOOGLE_CLIENT_ID`)
- [ ] Branch protection (`enforce_admins`, 0 approvals, required checks:
      `lint`/`test`/`build`/`doc-links`) — **not yet configured.** This
      modifies shared repo config and needs a `gh` session authenticated as
      admin, out of reach of a Claude Code session here (same limitation
      scoreo hit).

### Phase 0 bis — GitHub Project board

**Not planned.** Unlike scoreo, this repo intentionally has no GitHub
Project (Kanban) board — Issues + labels are the sole backlog (see
principle 4). If one is added later, a `project-sync.yml`-style Action can
mirror labels onto its Status field the same way scoreo's does; nothing
here depends on it existing.

### Phase 1 — The skills (interactive only) ⬅️ *current*

Write the 6 skills. **Gate:** 2–3 real tickets closed interactively using
*only* the skills, without patching them on the fly in chat.

- [x] The 6 skills are written in `.claude/skills/`: `project-conventions`,
      `issue-to-spec`, `implement-task`, `pr-review`, `address-feedback`,
      `site-quality`
- [ ] **Gate not yet passed** — no ticket has been closed through
      `issue-to-spec` + `implement-task` yet on this repo.

### Phase 2 — R3, review (first autonomy)

**Not started.** scoreo splits the judgment (subjective, LLM) from its
translation into a machine verdict (deterministic) into three steps,
consistent with "determinism doesn't go through an LLM" — the design below
is scoreo's actual mechanism, kept here as the reference to build from, not
as a description of anything running in this repo:

1. **`.github/workflows/needs-review-label.yml`** (zero LLM, triggered on
   `pull_request.opened`/`ready_for_review`) applies the `needs-review`
   label — the queue that works around the "one trigger only" Routine
   limitation.
2. **The R3 routine** has `pull_request` as its only GitHub trigger, all
   actions, filtered on `Labels is one of needs-review`. The filter only
   matches while the label is present, so it behaves like a one-shot
   trigger rather than a true "all actions" one: a review happens when
   `needs-review` appears, then nothing until it's reapplied (the last step
   of `pr-review` removes it). Reapplying the label later (once R4 exists)
   re-triggers a review — same mechanism doubles as the Phase 5 re-review
   loop.
3. **`.github/workflows/review-status-sync.yml`** (zero LLM, triggered on
   `pull_request.labeled`) translates `review-pass`/`needs-fix` into the
   `claude/review` commit status (success/failure) via `GITHUB_TOKEN`.

- [ ] `needs-review`/`review-pass`/`needs-fix` labels
- [ ] `needs-review-label.yml` and `review-status-sync.yml`
- [ ] The Routine itself, created manually at https://claude.ai/code/routines
      — a Routine's GitHub/API triggers are only configurable from that web
      UI, no tool available here can do it.

Until this phase is built, `pr-review` runs interactively only (see that
skill's "Posting the verdict" section) — post the verdict as a PR comment or
directly to the user, no labels.

Once built: let ~10 PRs run **without** `claude/review` being required.
**Gate:** the check says "no" at least once, correctly, and doesn't cry
wolf. Only then add it to required checks.

### Phase 3 — R5, weekly hygiene

Scheduled routine → `site-quality` → one PR per category. Zero risk, and it
exercises the *routine → PR → R3* path before feeding it generated code.

### Phase 4 — R2, implementation

API token on the routine, `ROUTINE_ID`/`ROUTINE_TOKEN` secrets, an Action
dispatching on `issues.labeled == ready` (see scoreo's automation-plan.md for
the exact `curl`/`/fire` payload shape — same mechanism applies here
unchanged).

**Gate:** 5 easy tickets handled, readable PRs, **merge still manual**.

### Phase 5 — R4 and auto-merge

R3 failure → `needs-fix` label → Action → `/fire` R4. R4 increments
`attempt-N`. **At `attempt-3`: stop, remove `auto`, apply `needs-human`.**
Without this cap, a single PR burns the daily quota in one night.

Auto-merge conditioned on the `auto` label alone.

**Gate:** 2 weeks, zero merge that would have been rejected by a human.

### Phase 6 — Observability

Weekly R6. This report drives widening the `auto` whitelist.

---

## 8. Identified risks

| Risk | Mitigation |
|---|---|
| R3 ↔ R4 infinite loop | `attempt-3` cap, then `needs-human` |
| Run quota exhausted by one PR | Same cap + CI `concurrency` |
| Review with no teeth (the model re-reads its own work) | The mechanical part leaves the review and becomes a CI job. `claude/review` only judges the subjective part |
| Lighthouse budget disabled at the first red PR | Measure the baseline before making it blocking |
| Backward-compat regression on zod schemas | Outside the `auto` whitelist: manual merge required |
| `pull_request_target` exposes secrets | Never run PR code under it |

## 9. Open decisions

- **Distinct identity for routines.** A GitHub App opening PRs in R2's place
  would restore a legitimate approver. Not justified while the required
  commit status does the job. Reconsider if the repo opens to external
  contributions.
- **Final Lighthouse thresholds** — to be pinned after measuring a real
  baseline (`lighthouserc.json` currently uses generic starter thresholds,
  not a measured one — see `site-quality`'s skill for the note to record it
  the first time this category runs).
