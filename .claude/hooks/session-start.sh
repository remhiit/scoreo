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

# Make `pnpm test:e2e` runnable on the web.
#
# The web image ships its own Chromium under /opt/pw-browsers and forbids
# `playwright install` (PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1), but it is pinned to
# whatever build that image was baked with — not the one @playwright/test wants.
# Playwright resolves browsers by exact build number, so the moment the two
# differ every e2e test dies before its first assertion with "Executable doesn't
# exist at .../chromium_headless_shell-<n>/...".
#
# So point the build number Playwright looks for at the build the image has.
# The binaries stay the image's; only the paths are ours. Best-effort by
# design: a failure here must not cost the session its warm node_modules, and
# pnpm test/typecheck/lint/build need no browser at all.
link_playwright_browsers() {
  local browsers_dir=/opt/pw-browsers
  [ -d "$browsers_dir" ] && [ -w "$browsers_dir" ] || return 0

  # Ask Playwright itself rather than hardcoding a build number, so a
  # @playwright/test bump keeps working without touching this hook.
  local wanted
  wanted="$(pnpm --filter scoreo exec playwright install --dry-run 2>/dev/null |
    grep -oE 'playwright chromium v[0-9]+' | grep -oE '[0-9]+$' | head -1)" || return 0
  [ -n "$wanted" ] || return 0

  # The linking itself lives in a script of its own so its tests can run it
  # against a fake browsers directory; it handles both layouts the image has
  # shipped (chrome-linux64/ and the older chrome-linux/), and exits non-zero
  # without creating any link when it finds neither.
  bash "$CLAUDE_PROJECT_DIR/scripts/link-playwright-browsers.sh" "$browsers_dir" "$wanted"
}

link_playwright_browsers || echo "Playwright: browser linking skipped; pnpm test:e2e may not run."
