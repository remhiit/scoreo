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
| `lighthouse` | Builds, then runs Lighthouse CI against `dist/` using `lighthouserc.json` (assertions in `warn` mode) | No — `continue-on-error: true`, report uploaded as a build artifact |

Each job name (`lint`, `test`, `build`, `doc-links`) is meant to be set as a required status check in branch protection (see `setup-repo.sh`). `lighthouse` stays non-blocking while the score baseline is measured (currently: performance 0.96, accessibility 0.95, best-practices 0.96, SEO 0.90 — the `pwa` category was dropped from the assertions since Lighthouse 12 no longer computes it by default).

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

| Label present | `Status` set to |
|---|---|
| `needs-human` | `In Progress` |
| `needs-fix` | `In Progress` |
| `in-progress` | `In Progress` |
| `ready` | `Todo` |

First match wins, in that priority order. If none of these labels are present, the item's status is left untouched (e.g. `Done`, set by the Project's own built-in "item closed" workflow).

- **Triggers**: `issues`/`pull_request` `labeled`/`unlabeled` (immediate, single item), plus a `schedule` cron every 6 hours as a drift-correction fallback that reconciles every open issue and PR, and `workflow_dispatch` for manual runs.
- **Requires** the `PROJECT_TOKEN` secret — a classic PAT with the `project` scope (fine-grained PATs don't yet cover writes to a user-owned Projects v2 board). Set via `setup-repo.sh`. Until it's set, the job logs a message and exits cleanly (no red check).

---

## Issue Implementation (R2)

**Files**: a Claude Code Routine (created via [claude.ai/code/routines](https://claude.ai/code/routines) — not reachable from any tool in a session) + `.github/workflows/dispatch-ready.yml`

Automates `.claude/skills/implement-task` for issues that have already been groomed interactively (R1, `issue-to-spec`) and carry the `ready` label. Split into a dispatch step (deterministic) and the implementation itself (LLM), same separation of concerns as R3.

1. **`dispatch-ready.yml`** triggers on `issues.labeled`, filters for the `ready` label, and POSTs to the routine's `/fire` API endpoint with the issue number in the `text` field — zero LLM, just wakes the routine with the right context.
2. **The Routine** has its only trigger set to **API** (not GitHub — the dispatch already happened in the Action). It reads the issue number from the fired `text`, then follows `implement-task` exactly: branch, tests first, `pnpm lint typecheck test build` green, visual check for UI changes, doc updates, PR referencing `Closes #N`. One run = one issue, never a batch.
3. The resulting PR flows through the same `needs-review` → R3 → `review-status-sync.yml` pipeline as any other PR — R2 doesn't self-review.

### Creating the Routine (manual, one-time)

API triggers on a Routine can only be configured from the web UI — no MCP tool or API reaches that config. At [claude.ai/code/routines](https://claude.ai/code/routines):

1. **New routine** → name it (e.g. `R2 — Implementation (Scoreo)`).
2. **Prompt**:
   ```
   You were fired via the API with a run-specific text payload naming a
   GitHub issue on remhiit/scoreo (e.g. "Implémente l'issue #42 en suivant
   .claude/skills/implement-task"). Read and follow
   .claude/skills/implement-task/SKILL.md exactly for that issue: branch,
   tests first, pnpm lint/typecheck/test/build green, visual check for UI
   changes, doc updates per the CLAUDE.md pre-commit checklist, and open a
   PR referencing "Closes #N". One run, one issue — never batch multiple
   issues even if several carry the ready label.
   ```
3. **Repository**: `remhiit/scoreo`.
4. **Trigger**: **Add another trigger** → **API** → **Generate token** (shown once — copy both the routine ID and the token immediately).
5. Set the `ROUTINE_ID`/`ROUTINE_TOKEN` repo secrets from that token via `setup-repo.sh` (`ROUTINE_ID=xxx ROUTINE_TOKEN=xxx ./setup-repo.sh`) so `dispatch-ready.yml` can fire it.
6. Leave connectors at their default (GitHub MCP tools included); no extra network access needed.

**Gate before widening the `auto` allow-list** (`doc/technical/automation-plan.md` Phase 4): 5 easy tickets handled, PRs readable, merge still manual. Only after that does Phase 5 (R4 + auto-merge) become relevant.

---

## PR Review (R3)

**Files**: a Claude Code Routine (created via [claude.ai/code/routines](https://claude.ai/code/routines) — not reachable from any tool in a session) + `.github/workflows/needs-review-label.yml` + `.github/workflows/review-status-sync.yml`

Automates the subjective review pass from `.claude/skills/pr-review`. Split into a queueing step, a judgment step (LLM), and a translation step (deterministic), because (a) a Routine only accepts **one** GitHub trigger, not a multi-select of PR actions, and (b) no Claude Code session — interactive or routine — has a tool that can post a raw commit status; only the usual GitHub MCP tools (issues, PRs, labels) are available.

1. **`needs-review-label.yml`** triggers on `pull_request.opened`/`ready_for_review` (skipping drafts) and adds the `needs-review` label — zero LLM, just queues the PR.
2. **The Routine**'s only GitHub trigger is `pull_request`, **all actions**, filtered to `Labels is one of needs-review`. Since the filter only matches while the label is present, this behaves as an edge-triggered queue rather than firing on every PR action: it reviews once when `needs-review` lands, and stays silent afterward because `pr-review`'s last step removes that label. Re-adding `needs-review` later (e.g. once R4 exists and pushes a fix) queues another pass.
3. **`review-status-sync.yml`** triggers on `pull_request.labeled`, checks for `review-pass`/`needs-fix`, and sets the `claude/review` commit status (`success`/`failure`) via `GITHUB_TOKEN` — no LLM involved, pure deterministic translation of a label into a status GitHub can gate on.

A Routine's GitHub trigger only accepts one specific action *or* every action in the category — not a multi-select of a few, and a routine only allows one GitHub trigger at all (tested live: adding a second is not possible). Using "all actions" with no filter would fire on every `assigned`/`edited`/`closed`/… on top of `labeled` (including R3's own verdict labels) — the `needs-review` label filter is what keeps this bounded to one pass per queueing.

### Creating the Routine (manual, one-time)

GitHub triggers and API triggers on a Routine can only be configured from the web UI — no MCP tool or API reaches that config. At [claude.ai/code/routines](https://claude.ai/code/routines):

1. **New routine** → name it (e.g. `R3 — PR Review (Scoreo)`).
2. **Prompt**:
   ```
   You were triggered because a PR on remhiit/scoreo was labeled
   needs-review. Identify which PR currently carries that label (there
   should be exactly one — the one that just triggered this run). Read and
   follow .claude/skills/pr-review/SKILL.md exactly to review it, including
   its final "Label the verdict (R3 only)" step — apply exactly one of
   review-pass or needs-fix, remove needs-review and the other verdict
   label, and post a PR comment only if there are blocking issues to
   explain.
   ```
3. **Repository**: `remhiit/scoreo`.
4. **Trigger**: GitHub event → Pull request → **all actions** → filter **Labels is one of `needs-review`**.
5. Leave connectors at their default (GitHub MCP tools included); no extra network access needed.

**Gate crossed** (`doc/technical/automation-plan.md` Phase 2): PR #90 was the first correct `needs-fix` — R3 blocked an unverifiable factual claim in a doc update without crying wolf on the rest of the entry. `claude/review` has been added to `setup-repo.sh`'s required checks; a repo admin needs to re-run the script for it to take effect on branch protection.

---

## Weekly Hygiene (R5)

**Routine**: `trig_01Y4gg6E5uMfD9XWFpBBxrt8` — `R5 — Hygiène hebdo (Scoreo)`

Unlike R3, a scheduled (cron) trigger can be created directly by tool — no claude.ai/code/routines web step needed. Runs every Monday 06:00 UTC (`0 6 * * 1`), as a fresh session each time, following `.claude/skills/site-quality`: dependency updates, dead doc links, Lighthouse regressions, PWA manifest/service-worker validity — one PR per category with something to report, never a combined PR, and nothing opened for a clean category.

Every PR it opens flows through the same `needs-review` → R3 → `review-status-sync.yml` pipeline as any other PR (see "PR Review (R3)" above) — R5 doesn't self-review or apply `needs-review` itself.

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
