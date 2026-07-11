# CI/CD & Deployment

## Build Configuration Validation

Two validation mechanisms prevent build configuration errors (e.g., missing version catalog entries) before they reach deployment.

### Local: Pre-push Git Hook

**File**: `.githooks/pre-push` (executable)

Every `git push` automatically runs `./gradlew help --quiet`, which validates the Gradle build configuration. This catches version catalog mismatches, missing library definitions, and other script compilation errors before they reach CI.

**Automatic Setup**: `build.gradle.kts` automatically configures git to use the `.githooks/` directory on the first `./gradlew` invocation (outside CI environments). No manual setup required.

```sh
# First Gradle invocation configures the hook
./gradlew help

# Now git push is protected
git push  # pre-push hook validates build config
```

### CI: Build Check Workflow

**File**: `.github/workflows/check.yml`

Runs on every `push` (all branches) and `pull_request`. Executes `gradle help --quiet` to validate the build configuration independently of the deployment workflow.

- **Trigger**: `push` to any branch, `pull_request`
- **Status**: Must pass before deployment jobs can run
- **Runtime**: ~30 seconds

This ensures configuration errors are caught immediately, even if the local hook is bypassed.

---

Two workflows run on every push to `main`, both build the same production artifact.

## Google Drive Sync Setup

To enable cloud backup, you need an OAuth 2.0 Client ID from Google Cloud.

### 1. Create an OAuth Client ID

1. Go to [Google Cloud Console — Credentials](https://console.cloud.google.com/apis/credentials)
2. Create or select a project "Scoreo"
3. Enable the **Google Drive API**
4. Create an **OAuth 2.0 Client ID** — type **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:9191` (local dev)
     - `https://<username>.github.io` (GitHub Pages)
     - `https://<username>.codeberg.page` (Codeberg Pages)
   - Authorized redirect URIs: leave empty (Token Model does not use redirects)
5. Copy the generated **Client ID**

### 2. Inject the Client ID via CI secret

Add a repository secret `GOOGLE_CLIENT_ID` with the value from step 5.

The `build.gradle.kts` `generateOAuthConfig` task reads `System.getenv("GOOGLE_CLIENT_ID")` and generates `OAuthConfig.kt` at build time. If the variable is absent, the sync feature is silently disabled (the Sync menu entry does not appear).

**GitHub Actions** — add to `.github/workflows/deploy.yml` build step:

```yaml
env:
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
```

**Forgejo Actions** — add to `.forgejo/workflows/deploy.yml` build step:

```yaml
env:
  GOOGLE_CLIENT_ID: ${{ secrets.GOOGLE_CLIENT_ID }}
```

### 3. Verify

After deployment, open the app → burger menu → ☁ Sync should appear. If `GOOGLE_CLIENT_ID` is empty, the entry is hidden (backward compatible).

---

## Codeberg Pages — Forgejo Actions

File: `.forgejo/workflows/deploy.yml`

Steps:
1. Build: `./gradlew jsBrowserProductionWebpack` (container `gradle:8.12-jdk21`)
2. Copy all resources (`cp -r src/jsMain/resources/.`) into `build/kotlin-webpack/js/productionExecutable/` — includes HTML, CSS, `manifest.json`, `sw.js`, and icon PNGs
3. Publish via [`git-pages/action@v2`](https://codeberg.org/git-pages/action)

> Note: CSS files are copied as static assets. The browser resolves `@import` directives natively.

URL: `https://<username>.codeberg.page/Scoreo/`

## GitHub Pages — GitHub Actions

File: `.github/workflows/deploy.yml`

### Pre-deployment verification

Steps 1-6 build and verify the artifact:
1. Set up JDK 21 (`actions/setup-java` temurin)
2. Set up Gradle via [`gradle/actions/setup-gradle@v4`](https://github.com/gradle/actions) with `gradle-version: wrapper`
3. Run tests: `gradle jvmTest`
4. Build: `gradle jsBrowserProductionWebpack`
5. Copy all resources (`cp -r src/jsMain/resources/.`) into `build/kotlin-webpack/js/productionExecutable/` — includes HTML, CSS, `manifest.json`, `sw.js`, and icon PNGs
6. Verify `styles.css` exists in the output directory
7. **Verify all resources are in artifact** — cross-check that every file from `src/jsMain/resources/` is present in the output directory. Fails if any file is missing.

> Note: CSS files are copied as static assets. The browser resolves `@import` directives natively.

### Deployment

8. Configure Pages
9. Upload artifact
10. Deploy to GitHub Pages

**Output exposure**: The `deploy` job exposes `${{ steps.deploy.outputs.page_url }}` so dependent jobs can verify the deployed site.

### Post-deployment verification (Smoke Test)

**Job**: `smoke-test` (runs after successful deployment)

Verifies the deployed site is fully functional by making HTTP requests to key URLs:
- Root path (`/Scoreo/`) — confirms `index.html` is served
- `styles.css` — confirms CSS assets are accessible
- `scoreo.js` — confirms JavaScript bundle is accessible

Includes automatic retry logic (up to 5 retries with 15-second delays) to account for GitHub Pages propagation latency.

**Catches**: Missing assets in the deployed artifact, broken asset paths, CDN propagation issues.

URL: `https://<username>.github.io/Scoreo/`

> Enable in *Settings → Pages → Source: GitHub Actions*.

> Note: `gradle-wrapper.jar` is **not** committed to the repository (excluded by `*.jar` in `.gitignore`). GitHub Actions workflows use the `gradle` command installed in PATH by `gradle/actions/setup-gradle@v4`, reading the version from `gradle-wrapper.properties`.

## React/TypeScript rewrite preview (TS-071)

GitHub Pages only serves **one live deployment per repo** through the Actions method — each deploy to the `github-pages` environment replaces the previous one. To validate the React/TypeScript rewrite's deployment before the final cutover (TS-090) without disturbing the Kotlin production site, `deploy.yml`'s `deploy` job builds both apps and publishes them in the **same Pages artifact**:

- Steps 1-7 (unchanged): build and verify the Kotlin production app as described above.
- Additional steps: `pnpm install --frozen-lockfile`, `pnpm build` (with `VITE_GOOGLE_CLIENT_ID` set from the same `secrets.GOOGLE_CLIENT_ID` used for Kotlin's `generateOAuthConfig`), then `dist/` is copied into `build/kotlin-webpack/js/productionExecutable/preview/` before the artifact is uploaded.
- `vite.config.ts`'s `base: './'` (relative asset paths) is what makes this work unmodified: the same build output is valid whether served from the site root or from a `/preview/` subdirectory.

Result: the Kotlin app stays at `https://<username>.github.io/Scoreo/` (untouched), and the React/TypeScript app is live at `https://<username>.github.io/Scoreo/preview/` for manual comparison.

The `smoke-test` job checks `preview/`, `preview/manifest.json`, and `preview/sw.js` in addition to the existing Kotlin paths (the JS bundle itself isn't checked by name since Vite's output is content-hashed, unlike Kotlin's fixed `scoreo.js`).
