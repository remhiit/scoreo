# CI/CD & Deployment

## CI: Build Check Workflow

**File**: `.github/workflows/ci.yml`

Runs on every `push` (all branches) and `pull_request`, as five independent jobs:

| Job | What it runs | Blocking? |
|---|---|---|
| `lint` | `pnpm lint` | Yes |
| `test` | `pnpm test` | Yes |
| `build` | `pnpm typecheck` then `pnpm build` | Yes |
| `doc-links` | `node scripts/check-doc-links.mjs` — fails on any relative Markdown link under `doc/` pointing to a non-existent file | Yes |
| `lighthouse` | Builds, then runs Lighthouse CI against `dist/` using `lighthouserc.json` (assertions in `warn` mode) | No — `continue-on-error: true`, report uploaded as a build artifact |

Each job name (`lint`, `test`, `build`, `doc-links`) is meant to be set as a required status check in branch protection (see `setup-repo.sh`). `lighthouse` stays non-blocking while the score baseline is measured (currently: performance 0.96, accessibility 0.95, best-practices 0.96, SEO 0.90 — the `pwa` category was dropped from the assertions since Lighthouse 12 no longer computes it by default).

This ensures type errors, lint issues, test failures, dead doc links, or build breakage are caught immediately on every push.

---

## Repo Setup Script

**File**: `setup-repo.sh`

One-time repo configuration for `doc/technical/automation-plan.md` Phase 0: creates the automation labels (`ready`, `needs-fix`, `auto`, `attempt-1/2/3`, …), enables `allow_auto_merge`, sets `main` branch protection (`enforce_admins: true`, 0 required approvals, required status checks `lint`/`test`/`build`/`doc-links`), and can set the `GOOGLE_CLIENT_ID` secret.

Run manually by a repo admin with `gh` authenticated (not by CI or a routine — it changes shared repo configuration):

```bash
GOOGLE_CLIENT_ID=xxx ./setup-repo.sh
```

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
