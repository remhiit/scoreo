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
2. Copy `index.html` into `build/kotlin-webpack/js/productionExecutable/`
3. Publish via [`git-pages/action@v2`](https://codeberg.org/git-pages/action)

> Note: `styles.css` is **not** copied — webpack bundles all CSS imports into a single file in the output directory.

URL: `https://<username>.codeberg.page/Scoreo/`

## GitHub Pages — GitHub Actions

File: `.github/workflows/deploy.yml`

Steps:
1. Set up JDK 21 (`actions/setup-java` temurin)
2. Set up Gradle via [`gradle/actions/setup-gradle@v4`](https://github.com/gradle/actions) with `gradle-version: wrapper`
3. Run tests: `./gradlew jvmTest`
4. Build: `./gradlew jsBrowserProductionWebpack`
5. Verify `styles.css` is bundled correctly — fails if `@import` is found (would indicate source file leaked into output)
6. Copy `index.html` into `build/kotlin-webpack/js/productionExecutable/`
7. Publish via `actions/upload-pages-artifact` + `actions/deploy-pages`

> Note: `styles.css` is **not** copied — webpack bundles all CSS imports into a single file in the output directory. The verification step prevents regression.

URL: `https://<username>.github.io/Scoreo/`

> Enable in *Settings → Pages → Source: GitHub Actions*.

> Note: `gradle-wrapper.jar` is **not** committed to the repository. CI tools bootstrap Gradle directly from `gradle-wrapper.properties`.
