# Torī Valley

The score-entry grid and scoring rules of _[La Vallée des Torī](https://www.origames.fr)_
(Origames), one of [Scoreo](../../apps/scoreo)'s games. Scoreo loads this module the first time
someone plays the game; the match it scores is an ordinary Scoreo `Match`, in Scoreo's history and
statistics like any other. What a module is, and what it may do, is the workspace's
contract: the types of [`packages/module-api`](../module-api) and the module ADRs indexed in
[`doc/adr/README.md`](../../doc/adr/README.md).

## Structure

- `src/domain/` — the game's models, zod schemas and pure scoring rules
- `src/ui/` — one folder per screen (`matchsetup/`, `scoredetail/`), plus `module/`, which strings
  them together into the grid Scoreo renders
- `src/design/` — the game pieces the design system has no component for, scoped under
  `.module-tori-valley`, classes prefixed `tv-`
- `src/i18n/` — the `tori-valley` namespace, added to Scoreo's i18next instance
- `src/module.ts` — the manifest and the lazily-loaded module, the only things Scoreo imports
- `doc/` — the game's rules, the rulebook PDF and the Objectif card photos, and the module's
  technical notes

## Commands

From the workspace root (`pnpm install` is workspace-wide):

```bash
pnpm --filter @scoreboards/module-tori-valley test        # Vitest, jsdom
pnpm --filter @scoreboards/module-tori-valley typecheck
pnpm lint                                                 # workspace-wide
pnpm dev                                                  # run Scoreo, then start a match of the game
```

Its visual regression baselines live with Scoreo's (`pnpm --filter scoreo test:visual:container`,
see the workspace's `doc/workflows/visual-testing.md`).

## Documentation

See [`doc/`](doc/) — the rules, the Objectif cards, the glossary and the reference tables.
