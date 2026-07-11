#!/bin/bash
set -euo pipefail

# Only warm up dependencies for Claude Code on the web; local CLI sessions
# already have a warm Gradle/Node cache on the developer's machine.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# gradle-wrapper.jar is intentionally not committed to the repo (no binaries
# in version control), and the pinned Gradle distribution is hosted on
# GitHub Releases, which this session can't reach unless that repo is added
# via add_repo (see CLAUDE.md). Use the Gradle already provisioned in the
# session image instead of bootstrapping ./gradlew.
if [ -f gradle/wrapper/gradle-wrapper.jar ]; then
  GRADLE_CMD="./gradlew"
else
  GRADLE_CMD="gradle"
fi

# Resolve/compile the JVM target (commonMain + commonTest + jvmMain) so
# jvmTest is fast on the first real command.
"$GRADLE_CMD" jvmTestClasses --quiet

# Kotlin/JS's Yarn plugin normally downloads its own copy of Yarn from
# github.com/yarnpkg/yarn releases, which this session can't reach. Activate
# Yarn Classic via Corepack instead (build.gradle.kts disables the plugin's
# own download when $CLAUDE_CODE_REMOTE is set) — the Kotlin Gradle plugin
# expects Yarn Classic's CLI (e.g. --ignore-scripts), not Yarn Berry.
corepack enable
corepack prepare yarn@1.22.22 --activate

# Download Node.js and install npm packages needed by the js(IR) target.
"$GRADLE_CMD" kotlinNodeJsSetup kotlinNpmInstall --quiet

# React/TypeScript rewrite (src/domain, application, infrastructure, ui — see
# CLAUDE.md): activate the pnpm version pinned in package.json's
# "packageManager" field via Corepack (registry.npmjs.org is allowlisted,
# unlike the GitHub Releases downloads above) and warm node_modules so
# pnpm test/typecheck/lint/build are fast on the first real command.
corepack prepare --activate
pnpm install --frozen-lockfile
