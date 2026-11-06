#!/bin/bash
# Point the Chromium build Playwright wants at the build the web image ships.
#
# Usage: link-playwright-browsers.sh <browsers-dir> <wanted-build>
#
# Called by .claude/hooks/session-start.sh, which finds <wanted-build> by
# asking Playwright itself; kept separate so scripts/link-playwright-browsers
# .test.mjs can run it against a fake browsers directory.
#
# Exit status: 0 when the links are in place or nothing needs doing (directory
# absent or read-only, build already installed); 1 when no installed build
# with a known layout was found, in which case no link is created at all.
set -uo pipefail

browsers_dir="${1:-}"
wanted="${2:-}"

[ -n "$browsers_dir" ] && [ -n "$wanted" ] || exit 1
[ -d "$browsers_dir" ] && [ -w "$browsers_dir" ] || exit 0

# The image installs exactly one chromium build; take its number. Skip the
# directory a previous run of this script created for the wanted build, which
# would otherwise be mistaken for the installed one when it sorts first.
installed=""
for dir in "$browsers_dir"/chromium-[0-9]*; do
  [ -d "$dir" ] || continue
  build="${dir##*/chromium-}"
  [ "$build" != "$wanted" ] || continue
  installed="$build"
  break
done
if [ -z "$installed" ]; then
  # Only the wanted build is there (or nothing): either it is the real
  # install, and there is nothing to do, or there is nothing to link to.
  [ -d "$browsers_dir/chromium-$wanted" ] && [ ! -L "$browsers_dir/chromium-$wanted/chrome-linux64" ] && exit 0
  exit 1
fi

chromium_src="$browsers_dir/chromium-$installed"
shell_src="$browsers_dir/chromium_headless_shell-$installed"
chromium_dst="$browsers_dir/chromium-$wanted"
shell_dst="$browsers_dir/chromium_headless_shell-$wanted"

# Replace whatever a previous run (or a hand-made workaround) left at a path —
# a dangling link, a directory link, a directory of per-entry links — so
# re-running always converges. A link is removed, never followed: writing
# through one would land inside the image's own install and overwrite its
# binaries.
[ ! -L "$chromium_dst" ] || rm -f "$chromium_dst"
[ ! -L "$shell_dst" ] || rm -f "$shell_dst"
replace_with_link() {
  rm -rf "$2"
  ln -s "$1" "$2"
}

if [ -x "$chromium_src/chrome-linux64/chrome" ] &&
  [ -x "$shell_src/chrome-headless-shell-linux64/chrome-headless-shell" ]; then
  # Current Playwright layout: the image's directories already carry the names
  # Playwright looks for, so one directory link each is enough. Chrome keeps
  # its resources beside the binary and resolves its .pak files through it.
  mkdir -p "$chromium_dst" "$shell_dst"
  replace_with_link "$chromium_src/chrome-linux64" "$chromium_dst/chrome-linux64"
  replace_with_link "$shell_src/chrome-headless-shell-linux64" \
    "$shell_dst/chrome-headless-shell-linux64"
elif [ -x "$chromium_src/chrome-linux/chrome" ] &&
  [ -x "$shell_src/chrome-linux/headless_shell" ]; then
  # Older layout: chrome-linux/ for both. Chromium's directory is linked
  # whole; the headless shell needs entry-by-entry links instead, because
  # upstream renamed its binary from headless_shell to chrome-headless-shell
  # and a directory link cannot rename what is inside it.
  mkdir -p "$chromium_dst" "$shell_dst"
  replace_with_link "$chromium_src/chrome-linux" "$chromium_dst/chrome-linux64"
  shell_dir="$shell_dst/chrome-headless-shell-linux64"
  rm -rf "$shell_dir"
  mkdir -p "$shell_dir"
  for entry in "$shell_src/chrome-linux/"*; do
    ln -s "$entry" "$shell_dir/$(basename "$entry")"
  done
  ln -sfn "$shell_src/chrome-linux/headless_shell" "$shell_dir/chrome-headless-shell"
else
  exit 1
fi

# Never announce links that lead nowhere.
[ -x "$chromium_dst/chrome-linux64/chrome" ] &&
  [ -x "$shell_dst/chrome-headless-shell-linux64/chrome-headless-shell" ] || exit 1

# Playwright treats a browser directory without this marker as a failed
# install and refuses to launch from it.
touch "$chromium_dst/INSTALLATION_COMPLETE" "$shell_dst/INSTALLATION_COMPLETE"

echo "Playwright: chromium build $wanted now points at the image's $installed."
