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

# Best-effort: download Node.js/Yarn and install npm packages needed by the
# js(IR) target. As of writing, this fails in Claude Code web sessions
# because Yarn is fetched from github.com/yarnpkg/yarn releases, which this
# session can't reach without adding that repo via add_repo — see the note
# in CLAUDE.md. Don't fail the whole session over it.
"$GRADLE_CMD" kotlinNodeJsSetup kotlinNpmInstall --quiet || \
  echo "session-start: JS dependency warmup failed (see CLAUDE.md note on GitHub repo-scope restriction) — continuing." >&2
