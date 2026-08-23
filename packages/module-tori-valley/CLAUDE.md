# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this package.

This package was absorbed from the standalone `remhiit/toriValleyScoreBoard` repository and is
becoming a **scoring module** loaded by Scoreo. The workspace root's `CLAUDE.md` governs the repo as
a whole (language, backlog, commit conventions, skills); this file covers what is specific to the
module. The commands below run as written **from this directory** — from the workspace root, prefix
them with `pnpm --filter @scoreboards/module-tori-valley`.

# Torī Valley Scoreboard

Scoring module for the board game _La Vallée des Torī_ (Origames), loaded by Scoreo. MVI-style (reducer/action/state per screen, via `useReducer`). Hexagonal architecture (Ports & Adapters). 100% local-first (localStorage), no backend, no cloud sync.

## Commands

```bash
# All tests (Vitest, jsdom — no real browser needed)
pnpm test

# A single test file
pnpm exec vitest run src/domain/model/torii.test.ts

# Typecheck
pnpm typecheck
```

The package no longer runs on its own: it has no `index.html`, no Vite config and
no dev server. To see it, run Scoreo (`pnpm dev` from the workspace root) and open
a match on the module. Its visual regression suite moved to the host with the
shell — `pnpm --filter scoreo test:visual:container`, see the workspace's
`doc/technical/visual-testing.md`.

Linting and formatting are workspace-wide: run `pnpm lint` / `pnpm format` from the repository root.

Unit tests are colocated (`*.test.ts(x)`), running entirely under Vitest/jsdom — no separate suite requiring a real browser.

## Before exploring the code

Read these files in order — all the necessary context is there:

0. `doc/reference.md` — Reference tables (reducers, use cases, models, ports, adapters, navigation, tests)
1. `doc/glossary.md` — Definitions (Reducer, Action, State, Port, Adapter, Use Case, and the game's own terms)
2. `doc/technical/architecture.md` — Stack, patterns, persistence, backward compat
3. `doc/functional/feature.md` — Full user flow, then `doc/functional/features/*.md` for scoring/players/history detail

## The game's rules

The rulebook PDF and cropped photos of all 16 Objectif cards live in `doc/resources/` and are committed: the monorepo is meant to hold everything needed to work on the game, without reaching for the archived satellite repository. Read them before touching scoring logic. `doc/functional/features/scoring.md` summarizes the rules that are actually implemented, and flags what isn't (notably: the 16 Objectif cards' exact scoring text hasn't been digitized, so Objectif points are entered manually rather than computed — see that doc for the open item).

## Key directory layout

| Folder            | Content                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `src/domain/`     | `model/` — types, zod schemas and the pure scoring logic. All that is left of the hexagon: the module owns no port and no adapter, because it owns no storage |
| `src/ui/*/`       | One folder per screen: `<screen>Reducer.ts` (+ test), `<screen>Types.ts`, `<Screen>.tsx` (+ test). Two screens — `matchsetup/` and `scoredetail/` — plus `module/`, which strings them together for the host |
| `src/ui/shared/`  | Shared React components (`AppButton`)                                                             |
| `src/i18n/`       | The `tori-valley` namespace and its dictionaries, added to the host's i18next instance            |
| `src/module.ts`   | The manifest and the lazily-loaded module, the only things Scoreo imports                         |
| `src/styles.css`  | The module's own look. Every rule scoped under `.module-tori-valley`, every class prefixed `tv-`  |
| `src/test/`       | Vitest harness: `setup.ts` and the i18next instance the component tests render against            |

## Workflow

The backlog, the priority labels, the one-commit-per-issue rule and the automation skills are the
workspace's, not this package's: see the workspace root's `CLAUDE.md` and its
`doc/technical/automation-plan.md`, which is now the only copy — this package's own stale one was
deleted when the documentation was consolidated.
Issues that belong to this module carry the `module:tori-valley` label.

## Rules

- Reducer lives in `ui/*/`. Takes an `Action` → produces a `State`.
- No storage, no port, no adapter: everything persisted goes through `ModuleHost`. See the
  workspace's `doc/technical/module-contract.md`.
- Every serialized model must be **backward-compatible**: `PlayerResult`/`Match` are what the module's `moduleData` payload is made of, and Scoreo hands that blob back untouched however old it is.
- Adding a field? Always give it a `.default()` in the matching zod schema.
- Removing/renaming a field? Add a migration note (create `doc/technical/migrations.md` if it doesn't exist yet) and a backward-compat test.
- Any code change (new reducer, model, screen) must update the matching doc under `doc/`.

## Pre-commit Checklist

Before committing a Reducer/Action/State/UseCase/Model/Port change:

- [ ] Matching `.md` file updated (`doc/reference.md`, `doc/functional/feature.md`, `doc/functional/features/*.md`, or `doc/technical/*.md`)
- [ ] If a new optional serialized field was added: covered by a backward-compat test
- [ ] Tests added/updated for any behavior change
- [ ] Commit message clearly describes the change (not a vague "Fix", "Update")

**Good commit example:**

```
Add rename-player action to Home screen

- Add startRename/updateRenameInput/renameSucceeded/renameFailed/cancelRename actions
- Add renamingPlayerId/renameInput to HomeState
- Inline rename UI in HomeScreen's player list rows
- Updated doc/functional/features/players.md with the rename flow
- RenamePlayerUseCase call path tested via homeReducer.test.ts
```

**Bad commit example:**

```
Update home screen
```
