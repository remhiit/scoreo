# Torī Valley Scoreboard

A Progressive Web App (PWA) built with React + TypeScript for calculating scores for the board game _[La Vallée des Torī](https://www.origames.fr)_ (Origames).

## Repository structure

- `src/domain`, `src/application`, `src/infrastructure`, `src/services`, `src/ui` — application source code
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

Output lands in `dist/`. Preview it locally:

```bash
pnpm preview
```

### Deployment

The site is automatically deployed on every push to `main`:

- **GitHub Pages** via GitHub Actions (`.github/workflows/deploy.yml`) → `https://remhiit.github.io/toriValleyScoreBoard/`

> GitHub Pages: enable in _Settings → Pages → Source: GitHub Actions_.

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

See [`doc/`](doc/) for detailed documentation — features, architecture, glossary, reference.
