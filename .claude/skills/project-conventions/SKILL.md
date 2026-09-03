---
name: project-conventions
description: Shared conventions for any code change in the Scoreo repo — stack, pnpm commands, directory layout, hexagonal architecture layering, backward-compat rules, commit style. Other scoreo skills (issue-to-spec, implement-task, pr-review, address-feedback, site-quality) reference this instead of repeating it. Use when starting any code change here, or when unsure which layer (reducer/use case/port/adapter) a change belongs in.
---

# Project Conventions

## Objectif

This skill has no content of its own — it delegates entirely to `CLAUDE.md`
and `doc/`, so the conventions live in exactly one place instead of being
restated (and drifting) across skill files. It invokes no routine of its
own; other skills (`issue-to-spec`, `implement-task`, `pr-review`,
`address-feedback`, `site-quality`) reference it as shared context instead
of repeating these rules.

## Entrées requises

None of its own — a calling skill is expected to already know what kind of
change it's making (code vs. doc, which screen or layer) before consulting
the reading order below.

## Préconditions

None. This skill is not GitHub-triggered and claims no label, so it has
neither a "which issue/PR" rule nor a "claim the run" step
(`doc/automation/skill-contract.md` §1.4) — both apply only to
label-triggered routines.

## Procédure

### Read, in this order

1. `CLAUDE.md` — stack, pnpm commands, directory tree, layering rules,
   backward-compat rules, pre-commit checklist, commit style.
2. `doc/reference.md` — exhaustive tables: which reducer/use case/model/port/
   adapter exists today, per screen.
3. `doc/glossary.md` — precise definitions of Reducer/Action/State/Use
   Case/Port/Adapter if any of those words are ambiguous.
4. `doc/technical/architecture.md` — stack, patterns, persistence,
   backward-compat rationale.

### The rules that matter most for automation

These are the ones a skill is most likely to violate if it skips `CLAUDE.md`:

- **Layering is not optional.** Reducer in `ui/*/` (pure, no repository
  calls). Use Case in `application/` (business logic, zero framework
  dependency). Repository interface in `domain/port/`, implementation in
  `infrastructure/`. If a change needs to reach a repository from inside a
  reducer, the design is wrong — route it through a Use Case called from the
  screen component instead.
- **Every serialized model field is backward-compatible.** Adding a field to
  `Player`/`GameType`/`Match`/`PlayerScore`? It needs a zod `.default()` in
  the matching `*.schema.ts`. Removing or renaming a field needs a migration
  entry in `doc/technical/migrations.md` — never do this silently.
- **Doc updates are part of the change, not an afterthought.** Any new
  reducer/use case/model/port/adapter/screen requires updating the matching
  file in `doc/` (see `CLAUDE.md`'s Pre-commit Checklist). A PR that adds
  code without touching `doc/` is incomplete, not done.
- **One commit per issue**, message = the issue's title (not "Fix" or
  "Update" — see `CLAUDE.md`'s good/bad commit examples).

## Sorties obligatoires

None of its own — this skill produces no artifact; it only informs what the
calling skill's own "Sorties obligatoires" must include (e.g. `doc/`
updated, a backward-compat `.default()` added).

## Contrôles

None beyond what the calling skill already runs — see `CLAUDE.md`'s
Commandes section (`pnpm lint && pnpm typecheck && pnpm test && pnpm build
&& pnpm test:e2e`), referenced via step 1 of the reading order above.

## Escalade

Not applicable — this skill never runs as a standalone step with its own
success/failure outcome, so it has no escalation path of its own. See
`doc/automation/skill-contract.md` §3 for the shared conditions the calling
skill escalates under.

## Limites

If this skill and `CLAUDE.md` ever disagree, `CLAUDE.md` wins — update this
file to match, not the other way around. This file must never restate a
`CLAUDE.md` rule in a way that could drift from it; it points to the source
instead.
