# CI/CD & Deployment

## CI: Build Check Workflow

**File**: `.github/workflows/ci.yml`

Runs on every `push` to `main` and every `pull_request`, as five independent jobs. The `push` trigger is scoped to `main` only — without that, a push to a branch with an open PR fires both the `push` and `pull_request: synchronize` events for the same commit, doubling every job for no benefit (10 check runs instead of 5, observed on PRs #64–#68 before this was fixed).

| Job | What it runs | Blocking? |
|---|---|---|
| `lint` | `pnpm lint` | Yes |
| `test` | `pnpm test` | Yes |
| `build` | `pnpm typecheck` then `pnpm build` | Yes |
| `doc-links` | `node scripts/check-doc-links.mjs` — fails on any relative Markdown link under `doc/` pointing to a non-existent file | Yes |
| `design-tokens` | `node scripts/check-design-tokens.mjs` — fails if a raw px/duration/easing value in `public/css/*.css` exactly matches a design token (see `doc/technical/architecture.md` §Design tokens) | Yes |
| `lighthouse` | Builds, then runs Lighthouse CI against `dist/` using `lighthouserc.json` (assertions at `error` level since #183) | Turns the job red on a failing assertion, but not a required status check — no `continue-on-error`, report uploaded as a build artifact |

Each job name (`lint`, `test`, `build`, `doc-links`) is meant to be set as a required status check in branch protection (see `setup-repo.sh`). `lighthouse` is deliberately left out of that required list — its assertions run at `error` level, with `minScore` thresholds (`lighthouserc.json`) recalibrated below the Phase 0 baseline (performance 0.96, accessibility 0.95, best-practices 0.96, SEO 0.90 — the `pwa` category was dropped since Lighthouse 12 no longer computes it by default): accessibility ≥ 0.90, best-practices ≥ 0.90 and SEO ≥ 0.85 (~0.05 below baseline, an anti-noise margin), while `performance` was recalibrated much further down to ≥ 0.60 after direct runner measurements showed 25+ points of CPU-variance noise on GitHub Actions (see `doc/technical/automation-plan.md` §9). A red `lighthouse` run is a visible signal on the PR, not yet a merge blocker.

The `lighthouse` job's "Upload Lighthouse report" step needs `include-hidden-files: true` — `actions/upload-artifact@v4` excludes dotfiles/dotdirs by default, and Lighthouse CI writes its report to `.lighthouseci/` (per `lighthouserc.json`'s `upload.outputDir`). Without that flag the step silently uploads nothing (`No files were found`, a warning, not a failure — R5's 2026-07-14 run caught this after several prior runs had gone unnoticed).

This ensures type errors, lint issues, test failures, dead doc links, or build breakage are caught immediately on every push.

---

## Repo Setup Script

**File**: `setup-repo.sh`

One-time repo configuration for `doc/technical/automation-plan.md` Phase 0: creates the automation labels (`ready`, `needs-fix`, `auto`, `attempt-1/2/3`, …), enables `allow_auto_merge`, sets `main` branch protection (`enforce_admins: true`, 0 required approvals, required status checks `lint`/`test`/`build`/`doc-links`), and can set the `GOOGLE_CLIENT_ID` and `PROJECT_TOKEN` secrets.

Run manually by a repo admin with `gh` authenticated (not by CI or a routine — it changes shared repo configuration):

```bash
GOOGLE_CLIENT_ID=xxx PROJECT_TOKEN=xxx ./setup-repo.sh
```

---

## Project Status Sync

**File**: `.github/workflows/project-sync.yml` + `scripts/sync-project-status.mjs`

Mirrors each issue/PR's labels onto the `Status` field of the [Scoreo GitHub Project](https://github.com/users/remhiit/projects/1) — one-way only, labels are the source of truth (`doc/technical/automation-plan.md` §2.4). Never writes labels back from the board.

A closed item overrides its labels: `state_reason: completed` on an issue, or a merged PR (no native `stateReason`, so `state: MERGED` stands in for the same signal), always sets `Done` — even if `in-progress` was never removed (it isn't, cf. `close-linked-issues.mjs` and issue #195). A `not_planned` close (or a PR closed without merging) imposes no status.

Otherwise, for an open item:

| Label present | `Status` set to |
|---|---|
| `needs-human` | `In progress` |
| `needs-fix` | `In progress` |
| `needs-review` | `In progress` |
| `review-pass` | `In progress` |
| `in-progress` | `In progress` |
| `ready` | `Todo` |
| `blocked` | `Todo` |

First match wins, in that priority order. If none of these labels are present, the item's status is left untouched.

- **Triggers**: `issues`/`pull_request` `labeled`/`unlabeled`/`closed` (immediate, single item), plus a `schedule` cron every 6 hours as a drift-correction fallback that reconciles every open issue/PR plus items closed in the last 30 days (`listClosedNumbers`, bounded window — avoids paginating the entire closed history every run), and `workflow_dispatch` for manual runs.
- **Requires** the `PROJECT_TOKEN` secret — a classic PAT with the `project` scope (fine-grained PATs don't yet cover writes to a user-owned Projects v2 board). Set via `setup-repo.sh`. Until it's set, the job logs a message and exits cleanly (no red check).
- **Status names must match the board's option exactly**, including case — `sync-project-status.mjs` looks up the option by exact string equality, and a mismatch throws rather than silently skipping (caught 2026-07-15: the script had `In Progress`, the board's actual option is `In progress`).

---

## Issue Implementation (R2)

**Files**: a Claude Code Routine (created via [claude.ai/code/routines](https://claude.ai/code/routines))

Automates `.claude/skills/implement-task` for issues that have already been groomed interactively (R1, `issue-to-spec`) and carry the `ready` label.

The Routine's only GitHub trigger is `issues`, action **labeled**, filtered to `Labels is one of ready`. Each matching event starts its own independent session with that specific issue in its triggering context — `implement-task/SKILL.md`'s "Which issue" section covers identifying it, so several issues carrying `ready` at once each get their own session rather than being ambiguous. Follows `implement-task` exactly: branch, tests first, `pnpm lint typecheck test build` green, visual check for UI changes, doc updates, PR referencing `Closes #N`. One run = one issue, never a batch.

The resulting PR flows through the same `needs-review` → R3 → `review-status-sync.yml` pipeline as any other PR — R2 doesn't self-review.

### Creating the Routine (manual, one-time)

Routine at [claude.ai/code/routines](https://claude.ai/code/routines):

1. **Name**: `R2 — Implementation (Scoreo)`.
2. **Prompt**:
   ```
   Implement the GitHub issue from your triggering context by following
   .claude/skills/implement-task/SKILL.md exactly.
   ```
3. **Repository**: `remhiit/scoreo`.
4. **Trigger**:
   - GitHub event → Issue → **labeled**
   - Filter → **Labels is one of `ready`**.
5. **Connectors**: leave at their default (GitHub MCP tools included); no extra network access needed.

---

## PR Review (R3)

**Files**: a Claude Code Routine (created via [claude.ai/code/routines](https://claude.ai/code/routines) — not reachable from any tool in a session) + `.github/workflows/needs-review-label.yml` + `.github/workflows/review-status-sync.yml`

Automates the subjective review pass from `.claude/skills/pr-review`. Split into a queueing step, a judgment step (LLM), and a translation step (deterministic), because (a) a routine's GitHub trigger only accepts one specific action or every action in a category — not a multi-select of a few — so `pull_request.labeled` alone can't be combined with `opened`/`synchronize` on the same trigger, and (b) no Claude Code session — interactive or routine — has a tool that can post a raw commit status; only the usual GitHub MCP tools (issues, PRs, labels) are available.

1. **`needs-review-label.yml`** triggers on `pull_request.opened`/`ready_for_review`/`synchronize` (skipping drafts), **first** removes any stale `review-pass`/`needs-fix` from a prior pass, **then** adds `needs-review` — zero LLM, just queues the PR. Covering `synchronize` means every new push (including a rebase/force-push) re-queues a review; without it, `claude/review` stays stuck on whatever SHA got the last review and blocks merge once the branch moves past it (hit repeatedly on PRs #91/#93 before this was added). Removing the stale verdict label matters too: GitHub only fires `pull_request.labeled` on an actual absent→present transition, so if R3 reaches the same verdict again on the new commit and the label were still there from before, `review-status-sync.yml` would never fire and `claude/review` would stay stuck exactly the same way. **Order matters**: removing the stale labels *before* adding `needs-review` means those removals happen while `needs-review` isn't present yet, so they don't themselves match R3's trigger filter below — doing it the other way round double-fired R3 on PR #94 (the add's `labeled` event, then the removal's `unlabeled` event, both matching while `needs-review` was already present).
2. **The Routine**'s GitHub trigger is `pull_request`, **all actions**, filtered to `Labels is one of needs-review` — this filter is what lets one trigger stand in for the `opened`/`synchronize` combination it can't express directly. `pr-review` removes `needs-review` as its very first action ("claim the run" — see `automation-plan.md` §4), not its last, so no label it posts afterward can itself re-match this filter. Re-adding `needs-review` on the next push (or manually) queues another pass.
3. **`review-status-sync.yml`** triggers on `pull_request.labeled`, checks for `review-pass`/`needs-fix`, and sets the `claude/review` commit status (`success`/`failure`) via `GITHUB_TOKEN` — no LLM involved, pure deterministic translation of a label into a status GitHub can gate on.

### Creating the Routine (manual, one-time)

Routine at [claude.ai/code/routines](https://claude.ai/code/routines):

1. **Name**: `R3 — PR Review (Scoreo)`.
2. **Prompt**:
   ```
   Review the pull request from your triggering context by following
   .claude/skills/pr-review/SKILL.md exactly.
   ```
3. **Repository**: `remhiit/scoreo`.
4. **Trigger**:
   - GitHub event → Pull request → **all actions**
   - Filter → **Labels is one of `needs-review`**.
5. **Connectors**: leave at their default (GitHub MCP tools included); no extra network access needed.

---

## Auto-Fix (R4)

**Files**: a Claude Code Routine (created via [claude.ai/code/routines](https://claude.ai/code/routines)) + `.github/workflows/auto-merge-sync.yml`

Automates `.claude/skills/address-feedback` for PRs R3 sends back with `needs-fix`. The Routine's GitHub trigger is `pull_request`, action **labeled** (not "all actions" — an `unlabeled` event never matches this action, so removing a label can't itself double-fire R4, unlike the Phase 2 incident in `automation-plan.md`), filtered to `Labels is one of needs-fix`.

R4 manages its own `attempt-1`/`attempt-2`/`attempt-3` counter as the first step of `address-feedback/SKILL.md` ("Claim the run") — no separate Action for that, the same way R3 already manages `review-pass`/`needs-fix`/`needs-review` itself. That first step removes `needs-fix` and any existing `attempt-N` right away, before anything else — this is the "claim the run" principle (`automation-plan.md` §4): scoping the trigger to `labeled` isn't enough on its own, since R4 posting its *own* `attempt-N` label while `needs-fix` was still present re-triggered R4 on PR #111 (chained straight through to `needs-human` in about a minute). At `attempt-3`, R4 stops instead of trying a 4th time: removes `in-progress` and `auto`, adds `needs-human` (`needs-fix` is already gone by this point). Otherwise it pushes a fix, which `needs-review-label.yml` (`synchronize`) picks up on its own to re-queue R3 — R4 doesn't need to touch `needs-review` itself.

### Creating the Routine (done — 2026-07-16)

The routine shell (name, prompt, `create_new_session_on_fire: true`) was created by tool (`trig_014VemW9wW5MopAjDHaaiYK7`, poke-only — no schedule, never fires on its own). Tool-created schedule/poke shells can't attach MCP connectors they don't themselves hold, so the trigger and connectors below were finished manually by Rémi through the web UI. R4 is operational: trigger and connectors are both configured, for reference —

1. **R4 — Address Feedback (Scoreo)** at [claude.ai/code/routines](https://claude.ai/code/routines).
2. **Prompt**:
   ```
   Address the pull request feedback from your triggering context by
   following .claude/skills/address-feedback/SKILL.md exactly, starting
   with its attempt-counter step.
   ```
3. **Repository**: `remhiit/scoreo`.
4. **Trigger**:
   - GitHub event → Pull request → **labeled**
   - Filter → **Labels is one of `needs-fix`**.
5. **Connectors**: GitHub MCP connector added (the tool-created shell had none by default).

## Auto-Merge

**Files**: `.github/workflows/auto-merge-sync.yml` + `scripts/close-linked-issues.mjs`

Zero-LLM Action, triggered on `pull_request.labeled`/`unlabeled` filtered to the `auto` label: on add, calls `gh pr merge --auto --squash` to enable GitHub's native auto-merge (waits for required checks — including `claude/review` — then squash-merges on its own); on remove, calls `gh pr merge --disable-auto`. The disable path matters: once native auto-merge is enabled, GitHub doesn't automatically turn it off just because a label changed — R4 escalating to `needs-human` at `attempt-3` removes `auto`, and this Action is what actually stops the pending merge from going through once checks eventually pass.

On the `labeled` (add) path, the job then waits in place (polling `gh pr view --json state`, ~20s interval, ~20 min ceiling) for that auto-merge to actually complete, then closes any issues referenced by closing keywords in the PR's body directly in this same job — invoking `scripts/close-linked-issues.mjs` with `PR_NUMBER` set instead of relying on `GITHUB_EVENT_PATH`. This exists because a merge completed by GitHub's native auto-merge is attributed to the `GITHUB_TOKEN` identity, and GitHub never spawns a new workflow run for an event triggered by the `GITHUB_TOKEN` — so `pull_request.closed` never reaches `close-linked-issues.yml` for these merges (confirmed on #208/#212, see `doc/technical/automation-plan.md` Phase 5). Acting within the same job sidesteps that limit entirely, since no new `workflow_run` is needed. If the poll times out without a merge, the job exits cleanly — nothing to close.

`auto` is applied by R2 (`implement-task`) at PR-open time when the issue's risk was assessed **Faible** and the diff still matches that — never by R1, never predicted before the diff exists.

---

## Close Linked Issues

**Files**: `.github/workflows/close-linked-issues.yml` + `scripts/close-linked-issues.mjs`

Zero-LLM Action, triggered on `pull_request.closed` filtered to `github.event.pull_request.merged == true`. Parses the merged PR's body for closing keywords (`close`/`closes`/`closed`, `fix`/`fixes`/`fixed`, `resolve`/`resolves`/`resolved`, case-insensitive, followed by one or more `#N` references) and explicitly closes each referenced issue in this repo via the REST API (`PATCH /issues/{n}` with `state: closed`, `state_reason: completed`) — using its own `GITHUB_TOKEN`, scoped `issues: write` in this workflow's `permissions:` block. Cross-repo references (`owner/repo#N`) are ignored; issues already closed are skipped.

Exists because GitHub's own "Closes #N" auto-close was observed to silently not fire for PRs merged through `auto-merge-sync.yml`'s native auto-merge — see `doc/technical/automation-plan.md` Phase 5, incidents #128 and #139. This workflow remains the safety net for **manually-merged** PRs (by Rémi, via the UI), which aren't affected by the `GITHUB_TOKEN` recursive-trigger limit described under Auto-Merge above; the bot-merged path is now handled directly inside `auto-merge-sync.yml` itself (#223), since this workflow's own `pull_request.closed` trigger can't fire for those merges either.

The `scripts/close-linked-issues.mjs` module is shared between the two workflows: `resolvePullRequest()` fetches the PR by number from the API when `PR_NUMBER` is set (used by `auto-merge-sync.yml`), and falls back to reading the `pull_request.closed` event payload from `GITHUB_EVENT_PATH` otherwise (used by this workflow).

---

## Weekly Hygiene (R5)

**Files**: a Claude Code Routine (`trig_01Y4gg6E5uMfD9XWFpBBxrt8`, created by tool — a schedule trigger doesn't need the web UI, unlike R2/R3's GitHub triggers)

Runs `.claude/skills/site-quality` on a schedule: dependency updates, dead doc links, Lighthouse regressions, PWA manifest/service-worker validity — one PR per category with something to report, never a combined PR, and nothing opened for a clean category. Every PR it opens flows through the same `needs-review` → R3 → `review-status-sync.yml` pipeline as any other PR — R5 doesn't self-review or apply `needs-review` itself.

### Creating the Routine

1. **Name**: `R5 — Hygiène hebdo (Scoreo)`.
2. **Prompt**: a one-line pointer to `.claude/skills/site-quality/SKILL.md`.
3. **Repository**: `remhiit/scoreo`.
4. **Trigger**: schedule, cron `0 6 * * 1` (every Monday 06:00 UTC).
5. **Connectors**: leave at their default (GitHub MCP tools included); no extra network access needed.

To change the schedule or prompt, use `update_trigger`/`delete_trigger` (MCP `Claude_Code_Remote` server) from any session, or manage it at [claude.ai/code/routines](https://claude.ai/code/routines).

---

## Google Drive Sync Setup

To enable cloud backup, you need an OAuth 2.0 Client ID from Google Cloud.

### 1. Create an OAuth Client ID

1. Go to [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials)
2. Create or select a project "Scoreo"
3. Enable the **Google Drive API**
4. Create an **OAuth 2.0 Client ID** — type **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173` (local dev, `pnpm dev`)
     - `https://<username>.github.io` (GitHub Pages)
   - Authorized redirect URIs: leave empty (Token Model does not use redirects)
5. Copy the generated **Client ID**

### 2. Inject the Client ID via CI secret

Add a repository secret `GOOGLE_CLIENT_ID` with the value from step 5.

`deploy.yml`'s build step passes it to Vite as `VITE_GOOGLE_CLIENT_ID`, read at build time by `src/infrastructure/google/oauthConfig.ts` via `import.meta.env.VITE_GOOGLE_CLIENT_ID`. If the variable is absent, the sync feature is silently disabled (the Sync menu entry does not appear).

```yaml
env:
  VITE_GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
```

### 3. Verify

After deployment, open the app → burger menu → ☁ Sync should appear. If `GOOGLE_CLIENT_ID` is empty, the entry is hidden (backward compatible).

---

## GitHub Pages — GitHub Actions (TS-090)

File: `.github/workflows/deploy.yml`

**Since TS-090, this deploys the React/TypeScript (Vite) build, not the Kotlin/webpack one.** The `/preview/` subpath introduced in TS-071 to validate the rewrite alongside the Kotlin production site is gone — the Vite build *is* production now, served at the site root.

Codeberg Pages deployment (`.forgejo/workflows/deploy.yml`, Kotlin/Gradle-based) was removed as part of this cutover rather than ported, since it couldn't be exercised or verified from this environment (no Forgejo runner/Codeberg account available here) — GitHub Pages is the only deployment target going forward.

### Pre-deployment verification

1. Setup pnpm ([`pnpm/action-setup@v4`](https://github.com/pnpm/action-setup))
2. Setup Node.js 22 (`actions/setup-node`, `cache: pnpm`)
3. Install dependencies: `pnpm install --frozen-lockfile`
4. Build: `pnpm build` (with `VITE_GOOGLE_CLIENT_ID` from `secrets.GOOGLE_CLIENT_ID`)
5. **Verify all `public/` assets are in the artifact** — cross-check that every file/directory in `public/` made it into `dist/`. Fails if anything is missing. (Vite copies `public/` to `dist/` natively, unlike the old webpack pipeline's manual `cp -r`, so this step is mostly a regression guard rather than a required manual step.)

`deploy.yml` no longer runs `pnpm test` itself — `ci.yml`'s `test` job already covers the same push event, so re-running it here was a pure duplicate.

### Deployment

6. Configure Pages
7. Upload artifact (`dist/`)
8. Deploy to GitHub Pages

**Output exposure**: The `deploy` job exposes `${{ steps.deploy.outputs.page_url }}` so dependent jobs can verify the deployed site.

### Post-deployment verification (Smoke Test)

**Job**: `smoke-test` (runs after successful deployment)

Verifies the deployed site is fully functional by making HTTP requests to key URLs:
- Root path (`/Scoreo/`) — confirms `index.html` is served
- `manifest.json` — confirms the PWA manifest is accessible
- `sw.js` — confirms the service worker script is accessible
- `css/styles.css` — confirms CSS assets are accessible

The JS bundle itself isn't checked by name, since Vite's output is content-hashed (unlike Kotlin's fixed `scoreo.js`).

Includes automatic retry logic (up to 5 retries with 15-second delays) to account for GitHub Pages propagation latency.

**Catches**: Missing assets in the deployed artifact, broken asset paths, CDN propagation issues.

URL: `https://<username>.github.io/Scoreo/`

> Enable in *Settings → Pages → Source: GitHub Actions*.
