---
name: project-conventions
description: Shared conventions for any code change in the Torī Valley Scoreboard repo — stack, pnpm commands, directory layout, hexagonal architecture layering, backward-compat rules, commit style. Other skills (issue-to-spec, implement-task, pr-review, address-feedback, site-quality) reference this instead of repeating it. Use when starting any code change here, or when unsure which layer (reducer/use case/port/adapter) a change belongs in.
---

# Project Conventions

This skill has no content of its own — it delegates entirely to `CLAUDE.md` and
`doc/`, so the conventions live in exactly one place instead of being restated
(and drifting) across six skill files.

## Read, in this order

1. `CLAUDE.md` — stack, pnpm commands, directory tree, layering rules,
   backward-compat rules, pre-commit checklist, commit style.
2. `doc/reference.md` — exhaustive tables: which reducer/use case/model/port/
   adapter exists today, per screen.
3. `doc/glossary.md` — precise definitions of Reducer/Action/State/Use
   Case/Port/Adapter, and the game's own terms, if any of those words are
   ambiguous.
4. `doc/technical/architecture.md` — stack, patterns, persistence,
   backward-compat rationale.

## The rules that matter most for automation

These are the ones a skill is most likely to violate if it skips `CLAUDE.md`:

- **Layering is not optional.** Reducer in `ui/*/` (pure, no repository
  calls). Use Case in `application/` (business logic, zero framework
  dependency). Repository interface in `domain/port/`, implementation in
  `infrastructure/`. If a change needs to reach a repository from inside a
  reducer, the design is wrong — route it through a Use Case called from the
  screen component instead.
- **Every serialized model field is backward-compatible.** Adding a field to
  `Player` or `Match`/`PlayerResult`? It needs a zod `.default()` in the
  matching `*.schema.ts`. Removing or renaming a field needs a migration note
  (create `doc/technical/migrations.md` if it doesn't exist yet) — never do
  this silently.
- **Doc updates are part of the change, not an afterthought.** Any new
  reducer/use case/model/port/adapter/screen requires updating the matching
  file in `doc/` (see `CLAUDE.md`'s Pre-commit Checklist). A PR that adds
  code without touching `doc/` is incomplete, not done.
- **One commit per issue**, message = the issue's title (not "Fix" or
  "Update" — see `CLAUDE.md`'s good/bad commit examples).

If this skill and `CLAUDE.md` ever disagree, `CLAUDE.md` wins — update this
file to match, not the other way around.
