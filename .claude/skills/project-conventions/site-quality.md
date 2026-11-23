# Scoreo overlay — `site-quality`

This file is Scoreo's overlay for the shared skill `dev-workflow:site-quality`
(plugin `dev-workflow` from the `remhiit/skills` marketplace). The shared
skill reads it after `CLAUDE.md` and `project-conventions/SKILL.md`; where the
two disagree, **this file wins**. It holds only what is specific to Scoreo:
its paths and commands, and its automation pipeline (labels, routines R2–R5,
the coordinator and its sub-agents, traceability). Everything generic lives in
the shared skill, so an improvement made there reaches Scoreo unless this
file overrides that point.

Section titles keep the names they had when this skill lived in
`.claude/skills/site-quality/SKILL.md`, so a reference such as
`site-quality/SKILL.md` § "X" elsewhere in the repo now means § "X" of this file.
Step numbers ("step 6") refer to the shared skill's procedure, which keeps the
same numbering.

Runs as routine R5 (weekly cron, `doc/automation/state-machine.md` §3): no
label trigger, so no "which issue/PR" rule and no claim step.

## Procédure — Scoreo values

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


## Traçabilité

Per `doc/automation/skill-contract.md` § "Traçabilité" (#494): every PR this
skill opens (§ Procédure) carries a **Traçabilité** field in its body —
`skill \`site-quality\`` + `modèle \`<id>\`` — alongside whatever else the
PR description already says about the category fixed. This skill always
runs as its own Claude Code Remote session (R5, cron-triggered — never a
coordinator sub-agent), so `<id>` always comes from calling `get_session`
(no `session_id`) and reading `session_context.model`. Normalize that value
the way `skill-contract.md` § "Traçabilité" states it: strip a
context-window suffix (`claude-opus-5[1m]` → `claude-opus-5`), and prefer
`external_metadata.last_served_model` when it is present and differs from
`session_context.model` — a turn-scoped fallback changes what served the run
without changing what the session is set to, and that call can come back
with no usable `session_context.model` at all.
If that call fails, `<id>` is `inconnu` with the reason stated alongside it,
never guessed.


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
