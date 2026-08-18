# Architecture

## Stack

React 18 + TypeScript, Vite, Vitest + Testing Library (jsdom, no real browser needed), Zod for schema validation, ESLint (typescript-eslint, react-hooks, react-refresh) + Prettier, pnpm. PWA shell (manifest, service worker) for installability; no backend — 100% local-first via `localStorage`.

## Layering (hexagonal / ports & adapters)

```
domain/        — model + port. No framework, no I/O.
application/   — use cases. Business logic, depends only on domain ports.
infrastructure/— adapters implementing domain ports (localStorage, in-memory test doubles).
services/      — root DI: createServices() builds concrete adapters once; ServicesContext exposes them.
ui/            — one folder per screen: <Screen>Reducer.ts (+ test), <screen>Types.ts, <Screen>.tsx (+ test).
```

Dependency direction is strictly inward: `ui` → `services`/`application` → `domain` ← `infrastructure`. `domain` never imports from any other layer.

## MVI-style screens

Each screen owns a pure `(state, action) => state` reducer (`useReducer`), colocated under `src/ui/<screen>/`. Side-effecting work (use-case calls) happens in `submit*`/plain event-handler functions in the screen component, which then `dispatch()` the resulting action — the reducer itself never touches a repository or a use case. See [`doc/glossary.md`](../glossary.md) and [`doc/reference.md`](../reference.md) for the exhaustive per-screen tables.

## Backward compatibility

Every domain model that gets persisted (`Player`, `Match`/`PlayerResult`) has a matching `*.schema.ts` (Zod). Repositories parse through the schema on read and fail open (corrupted/unparseable JSON → empty array) rather than throwing. **Rule: adding a field to a persisted model must give it a zod `.default()`** so old localStorage data from a previous app version keeps loading — see the "backward compat" tests in `localStoragePlayerRepository.test.ts` / `localStorageMatchRepository.test.ts` for the pattern to follow.

## Scoring domain

`src/domain/model/torii.ts` and `src/domain/model/match.ts` hold the actual game-rule logic (Torī series scoring, VP totals, winner/tie-break) as pure, framework-free functions — see [`doc/functional/features/scoring.md`](../functional/features/scoring.md) for the rules themselves and what's _not_ modeled yet (Objectif card texts, Sceau effects, solo mode).

## Persistence

`localStorage` only, no cloud sync in this MVP (see keys in [`doc/reference.md`](../reference.md)). If cloud sync is added later, follow scoreo's pattern: an optional `CloudSyncRepository` port, wired into `createServices()` only when configured, so the rest of the app is unaffected when it's absent.

## Styling

Single `public/css/styles.css`: CSS custom properties for light/dark (`prefers-color-scheme`), no theme picker (unlike scoreo) — kept simple for this MVP; a full flavor/accent picker could be added later following scoreo's `tokens/*.css` pattern if wanted.
