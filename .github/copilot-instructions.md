# Copilot Instructions — Scoreo

## Project

PWA for tracking game/match results between friends, built with React + TypeScript.

## Repository structure

- `src/domain` — models, schemas (zod), ports (repository interfaces)
- `src/application` — use cases (business logic, framework-agnostic)
- `src/infrastructure` — localStorage adapters, Google Drive sync, migrations
- `src/services` — root DI context (`ServicesContext`)
- `src/ui` — screens, per-screen `useReducer` (MVI-style), shared components, navigation, theme
- `doc/adr/` — Architecture Decision Records: the decisions the code cannot tell (architecture, migrations, module contract)
- `apps/scoreo/e2e/` — end-to-end specs, the reference for what a player can do
- `doc/utilisateur/` — the user guide, in French

## Stack

- **Platform:** Progressive Web App (PWA)
- **Language:** TypeScript (`strict: true`)
- **UI framework:** React 18
- **Build system:** Vite
- **Test runner:** Vitest + Testing Library (`jsdom`)
- **Validation/persistence:** zod schemas with `.default()` per field
- **UI pattern:** MVI-style — `useReducer` per screen (Handler/Intent/State equivalent)
- **Application architecture:** Hexagonal (Ports & Adapters)
- **Styling:** `packages/design-system/` — the app composes its components (no className/style of its own); Catppuccin tokens live there
- **Storage:** localStorage via `LocalStorage*Repository` (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)

See [`doc/adr/README.md`](../doc/adr/README.md) for the architecture decisions; what exists today (reducers, use cases, models, ports, adapters) is read in the code.

## Backward Compatibility

Any change to a serialized domain model (`Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`) must be backward compatible with at least the previous version.

- **Adding a field**: provide a `.default()` in the zod schema so old localStorage data deserializes without error.
- **Adding, renaming or removing a field**: record it in a migration ADR under `doc/adr/` (and write the migration step for a rename or removal).
- **Never change the type of an existing field** without a migration.

## Documentation maintenance

When implementing a visible feature, add or extend its e2e spec in `apps/scoreo/e2e/` (and its row in that README's table) and update `doc/utilisateur/`.
When making a decision the code cannot tell (architecture, library choice, data model, etc.), record it as an ADR in `doc/adr/` (see `doc/adr/README.md`).
When adding a new reducer or use case, add a corresponding colocated `*.test.ts(x)` file.

## Build Commands

```bash
# Dev server (hot reload)
pnpm dev

# Production build
pnpm build

# Preview a production build locally
pnpm preview

# Run all tests
pnpm test

# Typecheck / lint
pnpm typecheck
pnpm lint
```
