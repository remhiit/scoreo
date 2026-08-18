# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Torī Valley Scoreboard

PWA React + TypeScript score calculator for the board game _La Vallée des Torī_ (Origames). MVI-style (reducer/action/state per screen, via `useReducer`). Hexagonal architecture (Ports & Adapters). 100% local-first (localStorage), no backend, no cloud sync.

## Commands

```bash
# Dev server (hot reload)
pnpm dev

# Production build (output: dist/)
pnpm build

# Preview a production build
pnpm preview

# All tests (Vitest, jsdom — no real browser needed)
pnpm test

# A single test file
pnpm exec vitest run src/domain/model/torii.test.ts

# Typecheck / lint
pnpm typecheck
pnpm lint
```

No Gradle/JVM dependency: everything goes through `package.json` (pnpm). Unit tests are colocated (`*.test.ts(x)`), running entirely under Vitest/jsdom — no separate suite requiring a real browser.

## Before exploring the code

Read these files in order — all the necessary context is there:

0. `doc/reference.md` — Reference tables (reducers, use cases, models, ports, adapters, navigation, tests)
1. `doc/glossary.md` — Definitions (Reducer, Action, State, Port, Adapter, Use Case, and the game's own terms)
2. `doc/technical/architecture.md` — Stack, patterns, persistence, backward compat
3. `doc/functional/feature.md` — Full user flow, then `doc/functional/features/*.md` for scoring/players/history detail

## The game's rules

The rulebook PDF (`LVDT_Rules-225x225mm_FR.pdf`) is kept in the repo working directory for reference but is **gitignored, never committed** (copyrighted material). If it's missing, ask the user for a copy before touching scoring logic. `doc/functional/features/scoring.md` summarizes the rules that are actually implemented, and flags what isn't (notably: the 16 Objectif cards' exact scoring text hasn't been digitized, so Objectif points are entered manually rather than computed — see that doc for the open item).

## Key directory layout

| Folder                | Content                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `src/domain/`         | `model/` (types + zod schemas + pure scoring logic), `port/` (repository interfaces)              |
| `src/application/`    | Use cases (business operations, zero framework dependency)                                        |
| `src/infrastructure/` | `localStorage/` (adapters), `testing/` (in-memory fakes for tests)                                |
| `src/services/`       | `ServicesContext.tsx` — root DI (`useMemo`), `useServices()` hook                                 |
| `src/ui/*/`           | One folder per screen: `<screen>Reducer.ts` (+ test), `<screen>Types.ts`, `<Screen>.tsx` (+ test) |
| `src/ui/shared/`      | Shared React components (`AppButton`)                                                             |
| `src/ui/navigation/`  | `screen.ts` (`Screen` union), `hash.ts` (`parseHash`/`screenToHash`), `useHashRouter.ts`          |
| `public/`             | `manifest.json`, `sw.js`, PWA icons, `css/`                                                       |

## Workflow

- The backlog lives in **GitHub Issues**, not in a `.task/` folder — two sources of truth would eventually diverge.
- Priority: labels `P0`…`P3` (P0 = most urgent).
- **Plan**: user describes a feature or fix → create an issue (title, acceptance criteria, affected files) with the matching priority label.
- **Develop**: user says to develop → pick the first open, unassigned `P0` issue (fall back to the next available priority), implement it, commit, open a PR referencing `Closes #N`, then move to the next one.
- One commit per issue. Commit message = issue title.

## Rules

- Reducer lives in `ui/*/`. Takes an `Action` → produces a `State`.
- Use Case lives in `application/`. Business operation, zero framework dependency.
- Repository interface in `domain/port/`. Implementation in `infrastructure/`.
- Every serialized model (`Player`, `PlayerResult`/`Match`) must be **backward-compatible**.
- Adding a field? Always give it a `.default()` in the matching zod schema.
- Removing/renaming a field? Add a migration note (create `doc/technical/migrations.md` if it doesn't exist yet) and a backward-compat test.
- Any code change (new use case, reducer, model, screen, port) must update the matching doc under `doc/`.

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
