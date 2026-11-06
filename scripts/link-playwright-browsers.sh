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
# absent or read-only, wanted build really installed); 1 when no installed
# build with a known layout was found, in which case no link is created at all.
#
# Never touches a real install: it only ever removes links, or directories
# holding nothing but links, that a previous run of itself left behind.
set -uo pipefail

browsers_dir="${1:-}"
wanted="${2:-}"

[ -n "$browsers_dir" ] && [ -n "$wanted" ] || exit 1
[ -d "$browsers_dir" ] && [ -w "$browsers_dir" ] || exit 0

# A browser directory this script made only ever holds links: either a link
# itself, or a directory of per-entry links (the older headless shell layout).
# Anything else is a real install.
ours() {
  [ -L "$1" ] && return 0
  [ -d "$1" ] || return 1
  local entry
  for entry in "$1"/* "$1"/.[!.]*; do
    [ -e "$entry" ] || [ -L "$entry" ] || continue
    [ -L "$entry" ] || return 1
  done
  return 0
}

exists() { [ -e "$1" ] || [ -L "$1" ]; }

# A real install of the wanted build is already there: nothing to do, and
# nothing of it may be replaced.
for dir in "$browsers_dir/chromium-$wanted/chrome-linux64" \
  "$browsers_dir/chromium-$wanted/chrome-linux" \
  "$browsers_dir/chromium_headless_shell-$wanted/chrome-headless-shell-linux64" \
  "$browsers_dir/chromium_headless_shell-$wanted/chrome-linux"; do
  if exists "$dir" && ! ours "$dir"; then
    exit 0
  fi
done

# The image installs exactly one chromium build; take the first one whose
# binary directory is real, never a directory of links a previous run left
# for some other wanted build.
real_dir() { [ -d "$1" ] && ! ours "$1"; }
installed=""
for dir in "$browsers_dir"/chromium-[0-9]*; do
  build="${dir##*/chromium-}"
  [ "$build" != "$wanted" ] || continue
  if real_dir "$dir/chrome-linux64" || real_dir "$dir/chrome-linux"; then
    installed="$build"
    break
  fi
done
[ -n "$installed" ] || exit 1

chromium_src="$browsers_dir/chromium-$installed"
shell_src="$browsers_dir/chromium_headless_shell-$installed"
chromium_dst="$browsers_dir/chromium-$wanted"
shell_dst="$browsers_dir/chromium_headless_shell-$wanted"

# Replace whatever a previous run (or a hand-made workaround) left at a path —
# a dangling link, a directory link, a directory of per-entry links — so
# re-running always converges. A link is removed, never followed: writing
# through one would land inside the image's own install and overwrite its
# binaries. Anything that is not ours stops the script instead.
remove_ours() {
  if exists "$1"; then
    ours "$1" || exit 1
    rm -rf "$1"
  fi
}
replace_with_link() {
  remove_ours "$2"
  ln -s "$1" "$2"
}
[ ! -L "$chromium_dst" ] || rm -f "$chromium_dst"
[ ! -L "$shell_dst" ] || rm -f "$shell_dst"

if real_dir "$chromium_src/chrome-linux64" && [ -x "$chromium_src/chrome-linux64/chrome" ] &&
  real_dir "$shell_src/chrome-headless-shell-linux64" &&
  [ -x "$shell_src/chrome-headless-shell-linux64/chrome-headless-shell" ]; then
  # Current Playwright layout: the image's directories already carry the names
  # Playwright looks for, so one directory link each is enough. Chrome keeps
  # its resources beside the binary and resolves its .pak files through it.
  mkdir -p "$chromium_dst" "$shell_dst"
  replace_with_link "$chromium_src/chrome-linux64" "$chromium_dst/chrome-linux64"
  replace_with_link "$shell_src/chrome-headless-shell-linux64" \
    "$shell_dst/chrome-headless-shell-linux64"
elif real_dir "$chromium_src/chrome-linux" && [ -x "$chromium_src/chrome-linux/chrome" ] &&
  real_dir "$shell_src/chrome-linux" && [ -x "$shell_src/chrome-linux/headless_shell" ]; then
  # Older layout: chrome-linux/ for both. Chromium's directory is linked
  # whole; the headless shell needs entry-by-entry links instead, because
  # upstream renamed its binary from headless_shell to chrome-headless-shell
  # and a directory link cannot rename what is inside it.
  mkdir -p "$chromium_dst" "$shell_dst"
  replace_with_link "$chromium_src/chrome-linux" "$chromium_dst/chrome-linux64"
  shell_dir="$shell_dst/chrome-headless-shell-linux64"
  remove_ours "$shell_dir"
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
