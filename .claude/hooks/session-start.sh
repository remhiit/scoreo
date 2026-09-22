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

  # The image installs exactly one chromium build; take its number.
  local installed_dir
  installed_dir="$(ls -d "$browsers_dir"/chromium-[0-9]* 2>/dev/null | head -1)" || return 0
  [ -n "$installed_dir" ] || return 0
  local installed="${installed_dir##*/chromium-}"
  [ "$wanted" != "$installed" ] || return 0

  # Chrome for Testing keeps its resources beside the binary, so link the whole
  # directory and let chrome resolve its .pak files through it.
  mkdir -p "$browsers_dir/chromium-$wanted"
  ln -sfn "$browsers_dir/chromium-$installed/chrome-linux" \
    "$browsers_dir/chromium-$wanted/chrome-linux64"

  # The headless shell needs entry-by-entry links instead: upstream renamed the
  # binary from headless_shell to chrome-headless-shell, and a directory link
  # cannot rename what is inside it.
  local shell_dir="$browsers_dir/chromium_headless_shell-$wanted/chrome-headless-shell-linux64"
  mkdir -p "$shell_dir"
  local entry
  for entry in "$browsers_dir/chromium_headless_shell-$installed/chrome-linux/"*; do
    ln -sfn "$entry" "$shell_dir/$(basename "$entry")"
  done
  ln -sfn "$browsers_dir/chromium_headless_shell-$installed/chrome-linux/headless_shell" \
    "$shell_dir/chrome-headless-shell"

  # Playwright treats a browser directory without this marker as a failed
  # install and refuses to launch from it.
  touch "$browsers_dir/chromium-$wanted/INSTALLATION_COMPLETE" \
    "$browsers_dir/chromium_headless_shell-$wanted/INSTALLATION_COMPLETE"

  echo "Playwright: chromium build $wanted now points at the image's $installed."
}

link_playwright_browsers || echo "Playwright: browser linking skipped; pnpm test:e2e may not run."
