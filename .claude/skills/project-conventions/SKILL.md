---
name: project-conventions
description: Scoreo's conventions for any code change — stack, pnpm commands, directory layout, hexagonal layering, backward-compat rules, commit style — and Scoreo's overlay for the shared `workflows` plugin (feature, refacto, spike, livrer, bug, maintenance) and the transitional `dev-workflow` skills (issue-to-spec, implement-task, pr-review, address-feedback, change-risk, test-strategy, site-quality). They read this file, then `project-conventions/<workflow-or-skill>.md`, before doing anything. Use when starting any code change here, or when unsure which layer (reducer/use case/port/adapter) a change belongs in.
---

# Project Conventions (Scoreo overlay)

## Objectif

Scoreo's overlay for the shared skills of the `dev-workflow` plugin
(`remhiit/workflows` marketplace). The shared skills are project-agnostic; they
read, in order: `CLAUDE.md`, this file, then `project-conventions/<skill>.md`
for the skill running (`implement-task.md`, `pr-review.md`, …). This file and
the per-skill files win over the shared skill. The overlay contract is
documented in the skills repo, `docs/surcouche-projet.md`.

This file restates nothing from `CLAUDE.md`: it points to it, so the
conventions live in exactly one place. If this file and `CLAUDE.md` ever
disagree, `CLAUDE.md` wins — update this file to match.

The `workflows` plugin (same marketplace) reads this file too, then
`project-conventions/<workflow>.md` (`feature.md`, `refacto.md`, `spike.md`,
`livrer.md`, `bug.md`, `maintenance.md`). Those files are thin: they point to
the per-skill overlays below, which stay the single owner of each Scoreo rule
while the automation pipeline still runs on `dev-workflow`. The workflows with
a human (`feature`, `refacto`, `spike`) frame work and hand ready tickets
either to the pipeline or to `workflows:livrer` (`feature.md` § pipeline);
the pipeline itself is unchanged.

Scoreo-only skills stay in this repo: `new-scoring-module`, and the
automation pipeline (`coordinator`, `arbitrate`, `weekly-report`,
`merge-review-pass`, the agents in `.claude/agents/`). They refer to the
shared skills by their plugin name, `dev-workflow:<skill>`. During the
transition, `.claude/skills/<skill>/SKILL.md` still exists as a short alias
that redirects to the plugin (or, if the plugin is not loaded, to the skill's
file in `remhiit/workflows`), so routine prompts naming the old path keep working.

## Read, in this order

1. `CLAUDE.md` — stack, pnpm commands, directory tree, layering rules,
   backward-compat rules, pre-commit checklist, commit style.
2. `doc/adr/README.md` — the index of the Architecture Decision Records:
   the decisions the code cannot tell (architecture, backward-compat,
   migrations, the module contract, the design workflow). Read the
   `Accepted` ADRs that touch the change.
3. The code itself — `apps/scoreo/src/` (one folder per layer and per
   screen), `packages/` (`shared-domain`, `module-api` and its JSDoc,
   `design-system`, the modules): what exists today is read there, not in a
   reference table.
4. `apps/scoreo/e2e/README.md` — the « Journeys → specs » table: what a
   player can do, and the spec that proves it.

## verifications

- Fast, after each change: `pnpm lint`, `pnpm typecheck`, and the touched
  `*.test.ts(x)` file(s) (`pnpm --filter scoreo exec vitest run <file>`).
- Full, before any push: `pnpm lint && pnpm typecheck && pnpm test && pnpm
  build && pnpm test:e2e` — all five, not a subset; this mirrors `ci.yml`.
  Build before e2e: `playwright.config.ts` serves `apps/scoreo/dist/` with
  `pnpm preview`. In Claude Code on the web, Chromium is preinstalled
  (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`): never run `playwright
  install` there; locally, run `pnpm --filter scoreo exec playwright install
  chromium` first if needed.
- Mechanical checks owned by `ci.yml` (lint, test, build, doc-links): a
  review never re-checks them by eye.

## architecture

- **Layering is not optional.** Reducer in `ui/*/` (pure, no repository
  calls). Use Case in `application/` (business logic, zero framework
  dependency). Repository interface in `domain/port/`, implementation in
  `infrastructure/`. A reducer that needs a repository means the design is
  wrong: route it through a Use Case called from the screen component.
- **UI = composition of the design system** (`CLAUDE.md` § Règles): no
  `className`, `style`, CSS or `lucide-react` import in `apps/scoreo/src/`.
- Before adding an abstraction, search the code (`apps/scoreo/src/`,
  `packages/`) for one that already covers the need, and `doc/adr/` for a
  decision that already settles it.

## compatibilite

Every serialized model field (`Player`/`GameType`/`Match`/`PlayerScore`) is
backward-compatible. A new field needs a zod `.default()` in the matching
`*.schema.ts`. Removing or renaming a field needs
a migration ADR in `doc/adr/` (ADR-0004, ADR-0042) — never silently. An
added field gets its migration ADR too (the precedents: ADR-0037,
ADR-0039).

## docs

Doc updates are part of the change (`CLAUDE.md`'s Pre-commit Checklist): a
behavior a player can see has its e2e in `apps/scoreo/e2e/` and its row in
that README's table, and the matching page of `doc/utilisateur/`; a decision
the code cannot tell has its ADR (`doc/adr/README.md` for the format and
life cycle, index regenerated with `node scripts/check-adr.mjs --write`); a
serialized field added, removed or renamed has its migration ADR. Code
without them is not done.

## ui

A change visible to a player follows `doc/workflows/design-workflow.md`:
mockup first in `apps/catalog/src/mockups/<feature>/`, validated by merging
its PR; the delivered screen matches it; sketches are promoted into
`packages/design-system/` with their catalog story; the mockup folder is
removed. Check the real flow with `pnpm dev` in a browser.

## branche

`feat/<issue-number>-<slug>`.

## commit

One commit per issue, message = the issue's title (see `CLAUDE.md`'s
good/bad examples), plus the trailers of § tracabilite.

## spec

Issues, PRs and commits are written in French. The spec format gains a
mandatory `## Maquette` section (`project-conventions/issue-to-spec.md`).

## risque

`issue-to-spec`'s binary category follows the `automation:enabled`
whitelist in `doc/workflows/automation-plan.md` §5; `change-risk`'s surfaces
are listed in `project-conventions/change-risk.md`.

## pipeline

Scoreo runs an automation pipeline driven by labels (`doc/workflows/
state-machine.md`, `doc/workflows/automation-plan.md`): routines R2–R5, the
`coordinator` and its sub-agents. Each per-skill overlay states that skill's
claim step, labels, escalation sequence and sub-agent deltas. The shared
contract every skill follows is `doc/workflows/skill-contract.md`.

## tracabilite

Per `doc/workflows/skill-contract.md` § "Traçabilité": commits carry
`Skill: <skill>` and `Model: <id>` trailers; PRs, reviews and syntheses carry
a « Traçabilité » line naming the skill and `<id>`. `<id>` is the machine
model id: as a standalone session, `get_session` (strip a `[1m]` suffix,
prefer `external_metadata.last_served_model` when it differs); as a
coordinator sub-agent, the model named in the sub-agent's own system prompt;
otherwise `inconnu` with the reason. The skill name stays the bare name
(`implement-task`), without the `dev-workflow:` prefix.
