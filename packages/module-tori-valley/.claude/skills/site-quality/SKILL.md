---
name: site-quality
description: Weekly hygiene pass on the Torī Valley Scoreboard repo — dependency updates, dead doc links, Lighthouse score regressions, PWA manifest/service-worker validity. One PR per category, never a combined PR. Use for scheduled/weekly maintenance, or when asked to check for outdated deps, broken doc links, or Lighthouse regressions. This is the R5 step in doc/technical/automation-plan.md.
---

# Site Quality

Runs the routine hygiene checks the repo already has tooling for, and opens
**one PR per category** — a combined PR mixing a dependency bump with a doc
fix is harder to review and riskier to revert. Each PR goes through
`ci.yml`/`pr-review` like any other PR; this skill doesn't bypass that.

## Categories

### 1. Dependencies

Dependabot already opens PRs for outdated dependencies (`.github/dependabot.yml`,
weekly, npm + github-actions ecosystems) — check those first rather than
duplicating `pnpm outdated` by hand. For anything Dependabot doesn't cover:

- Patch/minor bumps with no breaking changes noted in the changelog: safe to
  bump directly.
- Major bumps, or anything touching the build pipeline (`vite`, `vitest`,
  `typescript`, `eslint`): bump one at a time, run the full check suite
  (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) before deciding
  it's safe — a red `ci.yml` on the resulting PR means don't force it.

Group related bumps (e.g. all `@vitejs/*` packages together) into one PR;
unrelated packages get separate PRs.

### 2. Dead doc links

Run `node scripts/check-doc-links.mjs`. It only catches relative links under
`doc/` pointing to files that don't exist — if it reports a broken link,
either fix the target path or fix/remove the link. This category is usually
either "nothing to do" or a one-line fix; open a PR only if there's actually
something broken.

### 3. Lighthouse regressions

`lighthouserc.json` runs in `warn` mode (see `ci.yml`'s `lighthouse` job) —
it won't block anything on its own. **No baseline has been measured yet for
this repo** (the thresholds currently in `lighthouserc.json` are generic
starter defaults, not a measured baseline) — the first time this category
runs, record the actual scores from a green `ci.yml` run here instead of
assuming scoreo's numbers apply. After that, check recent Lighthouse CI
artifacts (uploaded per PR) against the recorded baseline; a meaningful drop
is worth its own PR investigating the regression, don't chase single-point
noise between runs.

### 4. PWA validity

Check `public/manifest.json` and `public/sw.js` are still internally
consistent with the app: icon paths in the manifest resolve
(`public/icon-192.png`, `public/icon-512.png`), `sw.js`'s cached asset list
(if any) matches what `pnpm build` actually emits, and the deploy workflow's
"verify all public/ assets are in the artifact" step (`deploy.yml`) still
passes conceptually — i.e. nothing new was added to `public/` without a
corresponding reference.

## What this skill does not do

It does not touch `public/`, `src/domain/model/`, ports/adapters, or
navigation as part of a "quick fix" — those are the same categories excluded
from the `auto` whitelist in `automation-plan.md` §5 for a reason. If a
hygiene pass surfaces something in those areas, open a normal issue via
`issue-to-spec` instead of folding it into a hygiene PR.
