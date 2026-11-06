# Design catalog

The catalog (`apps/catalog/`) is the **living reference of the design system**: one page per
atomic layer, every component of [`@scoreboards/design-system`](../../packages/design-system/README.md)
rendered by its real code with example data, in any of the four Catppuccin flavors and fourteen
accents. Nothing in it is redrawn, so it cannot drift from what Scoreo ships — unlike the Claude
Design export in `ds_temp/scoreo-design/`, a hand-made copy frozen on 2026-09-30, which it replaces
as the visual reference.

It is tooling, never deployed with Scoreo (`deploy.yml` builds `apps/scoreo` only).

## Running it

```bash
pnpm catalog                                          # dev server, hot reload
pnpm --filter @scoreboards/catalog build              # typecheck + vite build → apps/catalog/dist/
pnpm --filter @scoreboards/catalog build:preview      # + dist/catalog.html, one self-contained page
pnpm --filter @scoreboards/catalog test               # coverage and render guards (also in `pnpm test`)
```

`dist/catalog.html` inlines the CSS and JS into a single page with no `<html>`/`<head>`/`<body>`
of its own (`scripts/single-file.mjs`), the shape a preview host such as a Claude Artifact expects:
that is how a version of the catalog is published for review without deploying anything.

## Layout

| Path | Content |
|---|---|
| `src/shell/` | The catalog's own chrome: navigation, theme bar, `Specimen` frame, token specimens. The only place that writes classes (`cat-` prefix, `src/catalog.css`) and inline styles |
| `src/shell/parseTokens.ts` | Reads the token declarations straight out of `packages/design-system/src/tokens/*.css` (exposed as `@scoreboards/design-system/tokens/*`), so the Tokens page shows what the CSS says |
| `src/stories/<layer>.tsx` | The stories of one layer: data only (`Story[]`) |
| `src/stories/<layer>.demos.tsx` | The small stateful demos those stories render (a controlled field, an open sheet): components only |
| `src/catalog.test.tsx` | The guards below |

A **story** names the exports it shows (`covers`), states its usage rule in one or two sentences,
and lists its variants. A variant is framed `inline` (laid on the page) or `phone` (a 390 × 640
screen). The phone frame carries `transform: translateZ(0)`, which makes it the containing block of
anything `position: fixed` inside it — so `AppHeader`, `ActionBar`, `Dialog`, `Sheet` and `SideMenu`
render inside their frame instead of over the catalog.

## Guards

`src/catalog.test.tsx` runs in `pnpm test` (and so in CI):

- **Every component exported by the design system is covered by a story.** A new component cannot
  land without its specimen; the failure lists the missing names.
- Every name a story `covers` is a real export, every story id is unique, every layer known.
- Every variant renders without throwing.
- **Stories compose the design system only**: no `className=`, no `style={…}`, no `lucide-react`
  import in `src/stories/**` — the same rule `eslint.config.js` holds the app to. Only `src/shell/`
  styles itself.

## Adding to it

- **A new design-system component**: add a story to the layer's file (and a demo if it needs
  state). The coverage test fails until you do.
- **A new token file**: add its specimen to `src/shell/Tokens.tsx` and a story in
  `src/stories/tokens.tsx`.
- Example data is realistic and in French (player names, game names, scores), never lorem ipsum.
