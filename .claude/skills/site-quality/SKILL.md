---
name: site-quality
description: Weekly hygiene pass on the Scoreo repo — dependency updates, dead doc links, Lighthouse score regressions, PWA manifest/service-worker validity. One PR per category, never a combined PR. Use for scheduled/weekly maintenance, or when asked to check for outdated deps, broken doc links, or Lighthouse regressions. This is the R5 step in doc/technical/automation-plan.md.
---

# Site Quality

## Objectif

Runs the routine hygiene checks the repo already has tooling for, and opens
**one PR per category** — a combined PR mixing a dependency bump with a doc
fix is harder to review and riskier to revert. Each PR goes through
`ci.yml`/`pr-review` like any other PR; this skill doesn't bypass that. It
only fixes what its four categories below cover — anything else it surfaces
becomes a normal issue via `issue-to-spec` (see "What this skill does not
do").

## Entrées requises

None beyond the repo itself at its current default-branch HEAD — this skill
builds its own worklist each run from live tooling output (`pnpm outdated`,
`check-doc-links.mjs`, recent Lighthouse CI artifacts, the current
`apps/scoreo/public/` contents), not from a triggering issue or PR.

## Préconditions

None GitHub-specific: this skill's trigger is a weekly cron
(`doc/automation/state-machine.md` §3, R5), not a `labeled` event on a
specific issue/PR, so it has neither a "which issue/PR" rule nor a "claim
the run" step (`doc/automation/skill-contract.md` §1.4) — both apply only to
label-triggered routines. Each of the four categories below is independent;
running the same category twice in the same week should find nothing new to
fix if the previous run's PR already merged.

## Procédure

### 1. Dependencies

`pnpm outdated`. **It exits with code 1 whenever it finds any outdated
package** — that's the command reporting results, not an error. Don't treat
a non-zero exit here as a failure to stop on; read the printed table and
keep going. (Contrast with `pnpm lint`/`typecheck`/`test`/`build` elsewhere
in this repo's tooling, where non-zero really does mean broken.)

For each outdated package, weigh:

- Patch/minor bumps with no breaking changes noted in the changelog: safe to
  bump directly.
- Major bumps, or anything touching the build pipeline (`vite`, `vitest`,
  `typescript`, `eslint`): bump one at a time, run the full check suite
  (`pnpm lint && pnpm typecheck && pnpm test && pnpm build`) before deciding
  it's safe — a red `ci.yml` on the resulting PR means don't force it (see
  PR #63 in this repo's history: a Vite 5→8 dependency bump failed CI and
  was correctly never merged).

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
it won't block anything on its own. Check recent Lighthouse CI artifacts
(uploaded per PR) against the measured baseline (performance 0.96,
accessibility 0.95, best-practices 0.96, SEO 0.90 as of the Phase 0 CI
work). A meaningful drop below baseline is worth its own PR investigating
the regression; don't chase single-point noise between runs.

### 4. PWA validity

Check `apps/scoreo/public/manifest.json` and `apps/scoreo/public/sw.js` are still internally
consistent with the app: icon paths in the manifest resolve
(`apps/scoreo/public/icon-192.png`, `apps/scoreo/public/icon-512.png`), `sw.js`'s cached asset list
(if any) matches what `pnpm build` actually emits, and the deploy workflow's
"Verify all apps/scoreo/public/ assets are in the artifact" step (`deploy.yml`) still
passes conceptually — i.e. nothing new was added to `apps/scoreo/public/` without a
corresponding reference.

## Sorties obligatoires

Zero or more PRs, at most one per category actually touched this run — never
a combined PR mixing categories (see Objectif). A category with nothing to
fix (the common case for doc links and PWA validity) produces no PR at all;
this skill has no obligation to open one every run. Each PR opened still
goes through `ci.yml`/`pr-review` like any other PR — this skill's own
"Contrôles" below is what it runs before opening one, not a substitute for
that downstream review.

## Contrôles

Category-specific, per §1 above: a major/build-pipeline dependency bump
requires the full check suite green (`pnpm lint && pnpm typecheck && pnpm
test && pnpm build`) before it's judged safe to open as a PR; a doc-link fix
or PWA-validity fix is verified by re-running the same tool that found the
problem (`check-doc-links.mjs`, a manifest/service-worker re-check). A
Lighthouse regression PR has no gate of its own beyond `ci.yml`'s own
`warn`-mode job — the point of that PR is to investigate the regression, not
to already have fixed it before opening.

## Escalade

Sans objet — this skill's categories are additive hygiene work, not a
review/fix loop with a retry cap, and it has no triggering issue/PR to judge
as ambiguous. When a category surfaces something outside its own scope (see
"What this skill does not do" below), the response is to open a normal
issue via `issue-to-spec`, not to escalate to `automation:needs-human` —
there is no run to protect a backlog slot for (`doc/automation/
skill-contract.md` §3 is about a routine that owns an in-flight claim; this
skill never claims one).

## Limites — what this skill does not do

It does not touch `apps/scoreo/public/`, `apps/scoreo/src/domain/model/`, ports/adapters, or
navigation as part of a "quick fix" — those are the same categories excluded
from the `automation:enabled` whitelist in `automation-plan.md` §5 for a reason. If a
hygiene pass surfaces something in those areas, open a normal issue via
`issue-to-spec` instead of folding it into a hygiene PR.
