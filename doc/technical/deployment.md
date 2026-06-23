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

Runs on every `push` (all branches) and `pull_request`. Executes `./gradlew help --quiet` to validate the build configuration independently of the deployment workflow.

- **Trigger**: `push` to any branch, `pull_request`
- **Status**: Must pass before deployment jobs can run
- **Runtime**: ~30 seconds

This ensures configuration errors are caught immediately, even if the local hook is bypassed.

---

Two workflows run on every push to `main`, both build the same production artifact.

## Codeberg Pages — Forgejo Actions

File: `.forgejo/workflows/deploy.yml`

Steps:
1. Build: `./gradlew jsBrowserProductionWebpack` (container `gradle:8.12-jdk21`)
2. Copy `index.html` and all `.css` files into `build/kotlin-webpack/js/productionExecutable/`
3. Publish via [`git-pages/action@v2`](https://codeberg.org/git-pages/action)

> Note: CSS files are copied as static assets. The browser resolves `@import` directives natively.

URL: `https://<username>.codeberg.page/Scoreo/`

## GitHub Pages — GitHub Actions

File: `.github/workflows/deploy.yml`

### Pre-deployment verification

Steps 1-6 build and verify the artifact:
1. Set up JDK 21 (`actions/setup-java` temurin)
2. Set up Gradle via [`gradle/actions/setup-gradle@v4`](https://github.com/gradle/actions) with `gradle-version: wrapper`
3. Run tests: `./gradlew jvmTest`
4. Build: `./gradlew jsBrowserProductionWebpack`
5. Copy `index.html` and all `.css` files into `build/kotlin-webpack/js/productionExecutable/`
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

> Note: `gradle-wrapper.jar` is **not** committed to the repository. CI tools bootstrap Gradle directly from `gradle-wrapper.properties`.
