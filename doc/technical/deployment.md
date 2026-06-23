# CI/CD & Deployment

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
