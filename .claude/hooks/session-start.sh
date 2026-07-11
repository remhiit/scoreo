#!/bin/bash
set -euo pipefail

# Only warm up dependencies for Claude Code on the web; local CLI sessions
# already have a warm pnpm cache on the developer's machine.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Activate the pnpm version pinned in package.json's "packageManager" field
# via Corepack (registry.npmjs.org is allowlisted) and warm node_modules so
# pnpm test/typecheck/lint/build are fast on the first real command.
corepack prepare --activate
pnpm install --frozen-lockfile
