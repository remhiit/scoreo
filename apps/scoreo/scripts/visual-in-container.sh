#!/usr/bin/env bash
#
# Runs the visual suite inside the same container image CI uses.
#
# Screenshot baselines are environment-sensitive: font hinting and rasterisation
# differ between distributions, so a baseline recorded on a developer's own
# machine would fail on CI forever. Both recording and local verification must
# therefore go through this script.
#
#   scripts/visual-in-container.sh                      # verify against the baselines
#   scripts/visual-in-container.sh --update-snapshots   # re-record them
#
# Requires podman or docker, and a `dist/` built by `pnpm --filter scoreo build`.
set -euo pipefail

PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# pnpm links this package's node_modules into the workspace store at the root,
# so the container has to see the whole workspace, not just this package.
WORKSPACE_ROOT="$(cd "${PACKAGE_ROOT}/../.." && pwd)"
PACKAGE_REL="${PACKAGE_ROOT#"${WORKSPACE_ROOT}/"}"

RUNTIME=""
for candidate in podman docker; do
  if command -v "$candidate" >/dev/null 2>&1; then
    RUNTIME="$candidate"
    break
  fi
done

if [ -z "$RUNTIME" ]; then
  echo "visual-in-container: needs podman or docker on PATH." >&2
  echo "  Without one, run 'pnpm test:visual' directly — but do not commit the" >&2
  echo "  baselines it produces: they will not match CI." >&2
  exit 1
fi

# Derived from the installed package so the image can never drift from the
# @playwright/test version that records the baselines.
VERSION="$(node -p "require('${PACKAGE_ROOT}/package.json').devDependencies['@playwright/test'].replace(/^\D*/, '')")"
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"

RUN_ARGS=(--rm -v "${WORKSPACE_ROOT}:/work:z" -w "/work/${PACKAGE_REL}" -e CI=1 -e HOME=/tmp)

# Rootless podman already maps the container root to the invoking user, so the
# recorded PNGs come out owned by them. Rootful docker does not.
if [ "$RUNTIME" = "docker" ]; then
  RUN_ARGS+=(--user "$(id -u):$(id -g)")
fi

echo "visual-in-container: ${RUNTIME} → ${IMAGE}"
exec "$RUNTIME" run "${RUN_ARGS[@]}" "$IMAGE" \
  node_modules/.bin/playwright test --config playwright.visual.config.ts "$@"
