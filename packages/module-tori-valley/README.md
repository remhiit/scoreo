# Torī Valley Scoreboard

> Absorbed from the standalone `remhiit/toriValleyScoreBoard` repository into the Scoreo workspace,
> where it is now a **scoring module Scoreo loads on demand**. It no longer runs on its own: the
> standalone shell — `index.html`, the Vite config, the service worker — is gone, and Scoreo is the
> only deployed app. The commands below run as written from this directory
> (`packages/module-tori-valley`); from the workspace root, prefix them with
> `pnpm --filter @scoreboards/module-tori-valley`. `pnpm install` is workspace-wide and belongs at
> the root.

React + TypeScript scoring module for the board game _[La Vallée des Torī](https://www.origames.fr)_
(Origames), played inside [Scoreo](../../apps/scoreo).

## Repository structure

- `src/domain`, `src/ui`, `src/i18n` — the module's source: the game's rules, its two screens, its strings
- `doc/functional/` — functional documentation (features, user flows)
- `doc/technical/` — technical documentation (architecture, design decisions)

## Running locally

### Prerequisites

- Node.js 22+
- pnpm (version pinned in `package.json`'s `packageManager` field — activate via `corepack prepare --activate`)

### Development

The module has no dev server of its own. Run the host from the workspace root and
open a match on it:

```bash
pnpm install
pnpm dev
```

### Deployment

Nothing here is deployed on its own: the module ships inside Scoreo, as a chunk
loaded the first time someone opens it.

### Run tests

```bash
pnpm test
```

### Run visual regression tests

They live in the host now, and photograph this module on Scoreo's own route —
the package has no shell of its own to screenshot any more:

```bash
pnpm --filter scoreo test:visual:container
```

Baselines are recorded in the same container image CI uses, never on your own
machine. See the workspace's `doc/technical/visual-testing.md`.

### Typecheck / lint

```bash
pnpm typecheck
pnpm lint
```

## Documentation

See [`doc/`](doc/) for detailed documentation — features, architecture, glossary, reference.
