# Scoreo

Scoreo is a Progressive Web App (PWA) built with React + TypeScript for tracking game results between friends.

## Repository structure

The repository is a pnpm workspace (`apps/*`, `packages/*`). Every command below runs from its root.

- `apps/scoreo/` — the host PWA, and the only project deployed
- `packages/` — the score-counting modules Scoreo loads on demand (none yet)
- `apps/scoreo/src/domain`, `apps/scoreo/src/application`, `apps/scoreo/src/infrastructure`, `apps/scoreo/src/services`, `apps/scoreo/src/ui` — application source code
- `doc/functional/` — functional documentation (features, user flows)
- `doc/technical/` — technical documentation (architecture, design decisions)

## Running locally

### Prerequisites

- Node.js 22+
- pnpm (version pinned in `package.json`'s `packageManager` field — activate via `corepack prepare --activate`)

### Development build

```bash
pnpm install
pnpm dev
```

Opens a dev server with hot reload.

### Production build

```bash
pnpm build
```

Output lands in `apps/scoreo/dist/`. Preview it locally:

```bash
pnpm preview
```

### Deployment

The site is automatically deployed on every push to `main`:

- **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`) → `https://<username>.github.io/Scoreo/`

> GitHub Pages: enable in *Settings → Pages → Source: GitHub Actions*.

### Run tests

```bash
pnpm test
```

### Typecheck / lint

```bash
pnpm typecheck
pnpm lint
```

## Documentation

See [`doc/`](doc/) for detailed documentation — features, architecture, deployment, glossary.
