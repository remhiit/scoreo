# Copilot Instructions — Scoreo

## Project

PWA for tracking game/match results between friends, built with React + TypeScript.

## Repository structure

- `src/domain` — models, schemas (zod), ports (repository interfaces)
- `src/application` — use cases (business logic, framework-agnostic)
- `src/infrastructure` — localStorage adapters, Google Drive sync, migrations
- `src/services` — root DI context (`ServicesContext`)
- `src/ui` — screens, per-screen `useReducer` (MVI-style), shared components, navigation, theme
- `doc/functional/` — functional documentation (features, user flows)
- `doc/technical/` — technical documentation (architecture, design decisions)

## Stack

- **Platform:** Progressive Web App (PWA)
- **Language:** TypeScript (`strict: true`)
- **UI framework:** React 18
- **Build system:** Vite
- **Test runner:** Vitest + Testing Library (`jsdom`)
- **Validation/persistence:** zod schemas with `.default()` per field
- **UI pattern:** MVI-style — `useReducer` per screen (Handler/Intent/State equivalent)
- **Application architecture:** Hexagonal (Ports & Adapters)
- **Styling:** `public/css/` — CSS custom properties (Catppuccin tokens), fixed top header
- **Storage:** localStorage via `LocalStorage*Repository` (`scoreo_players`, `scoreo_gametypes`, `scoreo_matches` keys)

See [`doc/technical/architecture.md`](../doc/technical/architecture.md) for the full architecture description.
See [`doc/reference.md`](../doc/reference.md) for the full reducer/use-case/model/port/adapter reference.

## Backward Compatibility

Any change to a serialized domain model (`Player`, `GameType`, `Match`, `PlayerScore`, `WinCondition`) must be backward compatible with at least the previous version.

- **Adding a field**: provide a `.default()` in the zod schema so old localStorage data deserializes without error.
- **Renaming or removing a field**: write a migration step and document it in `doc/technical/migrations.md`.
- **Never change the type of an existing field** without a migration.

## Documentation maintenance

When implementing a new feature, update `doc/functional/` with the relevant user-facing behavior.
When making a technical decision (architecture, library choice, data model, etc.), document it in `doc/technical/`.
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
