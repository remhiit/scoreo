---
name: project-conventions
description: Scoreo's conventions for any code change — stack, pnpm commands, directory layout, hexagonal layering, backward-compat rules, commit style — and Scoreo's overlay for the shared `dev-workflow` skills (issue-to-spec, implement-task, pr-review, address-feedback, change-risk, test-strategy, site-quality). Those skills read this file, then `project-conventions/<skill>.md`, before doing anything. Use when starting any code change here, or when unsure which layer (reducer/use case/port/adapter) a change belongs in.
---

# Project Conventions (Scoreo overlay)

## Objectif

Scoreo's overlay for the shared skills of the `dev-workflow` plugin
(`remhiit/skills` marketplace). The shared skills are project-agnostic; they
read, in order: `CLAUDE.md`, this file, then `project-conventions/<skill>.md`
for the skill running (`implement-task.md`, `pr-review.md`, …). This file and
the per-skill files win over the shared skill. The overlay contract is
documented in the skills repo, `docs/surcouche-projet.md`.

This file restates nothing from `CLAUDE.md`: it points to it, so the
conventions live in exactly one place. If this file and `CLAUDE.md` ever
disagree, `CLAUDE.md` wins — update this file to match.

Scoreo-only skills stay in this repo: `new-scoring-module`, and the
automation pipeline (`coordinator`, `arbitrate`, `weekly-report`,
`merge-review-pass`, the agents in `.claude/agents/`). They refer to the
shared skills by their plugin name, `dev-workflow:<skill>`.

## Read, in this order

1. `CLAUDE.md` — stack, pnpm commands, directory tree, layering rules,
   backward-compat rules, pre-commit checklist, commit style.
2. `doc/reference.md` — which reducer/use case/model/port/adapter exists
   today, per screen.
3. `doc/glossary.md` — Reducer/Action/State/Use Case/Port/Adapter.
4. `doc/technical/architecture.md` — stack, patterns, persistence,
   backward-compat rationale.

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
- Before adding an abstraction, search `doc/reference.md`'s tables for one
  that already covers the need.

## compatibilite

Every serialized model field (`Player`/`GameType`/`Match`/`PlayerScore`) is
backward-compatible. A new field needs a zod `.default()` in the matching
`*.schema.ts`. Removing or renaming a field needs a migration entry in
`doc/technical/migrations.md` — never silently.

## docs

Doc updates are part of the change (`CLAUDE.md`'s Pre-commit Checklist): a
new reducer/use case/model/port/adapter/screen updates `doc/reference.md`,
user-facing behavior updates `doc/functional/feature.md` or
`doc/functional/features/*.md`, a schema change updates
`doc/technical/migrations.md`. Code without its `doc/` update is not done.

## ui

A change visible to a player follows `doc/technical/design-workflow.md`:
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
whitelist in `doc/technical/automation-plan.md` §5; `change-risk`'s surfaces
are listed in `project-conventions/change-risk.md`.

## pipeline

Scoreo runs an automation pipeline driven by labels (`doc/automation/
state-machine.md`, `doc/technical/automation-plan.md`): routines R2–R5, the
`coordinator` and its sub-agents. Each per-skill overlay states that skill's
claim step, labels, escalation sequence and sub-agent deltas. The shared
contract every skill follows is `doc/automation/skill-contract.md`.

## tracabilite

Per `doc/automation/skill-contract.md` § "Traçabilité": commits carry
`Skill: <skill>` and `Model: <id>` trailers; PRs, reviews and syntheses carry
a « Traçabilité » line naming the skill and `<id>`. `<id>` is the machine
model id: as a standalone session, `get_session` (strip a `[1m]` suffix,
prefer `external_metadata.last_served_model` when it differs); as a
coordinator sub-agent, the model named in the sub-agent's own system prompt;
otherwise `inconnu` with the reason. The skill name stays the bare name
(`implement-task`), without the `dev-workflow:` prefix.
