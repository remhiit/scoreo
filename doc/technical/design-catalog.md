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
| `src/mockups/<feature>/` | The mockup of a feature not coded yet: `index.tsx` (the `Mockup`), `screens.tsx`, `sketches/` for the components the design system lacks. Shown on the catalog's **Maquettes** page. See [`design-workflow.md`](design-workflow.md) |
| `src/screens/` | The **Écrans** page: every screen of the app as it ships. `index.tsx` lists each `Screen['type']` with its states, `fixtures.ts` seeds the example data, `LiveApp.tsx` runs the app in a frame |
| `src/catalog.test.tsx` | The guards below |

A **story** names the exports it shows (`covers`), states its usage rule in one or two sentences,
and lists its variants. A variant is framed `inline` (laid on the page) or `phone` (a 390 × 640
screen). The phone frame carries `transform: translateZ(0)`, which makes it the containing block of
anything `position: fixed` inside it — so `ActionBar`, `Dialog`, `Sheet` and `SideMenu`
render inside their frame instead of over the catalog.

## Écrans: the app's screens, run for real

Where the layers show the parts, the **Écrans** page shows what they build: each screen of Scoreo,
module screens included, in the states worth keeping a trace of (a usual evening, a first launch,
a game to resume…). Nothing is composed for the page. `LiveApp` runs the app's own `AppShell`
(through the `scoreo/catalog` export, `apps/scoreo/src/catalog.ts`) inside a phone frame:

- over **in-memory repositories** seeded by `src/screens/fixtures.ts` (a group of friends, a month
  of Friday nights, a fixed "now"), a fresh copy per frame, so what a viewer does in one frame
  never reaches another and nothing touches `localStorage`. These repositories are the unit tests'
  fakes (`apps/scoreo/src/infrastructure/testing/`), so a change to their API must keep the
  catalog's tests green too;
- routed **in memory** (`useMemoryRouter`): each frame navigates on its own, the URL stays the
  catalog's;
- in **French**, with the app's theme context bound to the catalog's theme bar: the app's own
  theme dialog and the bar drive the same flavor and accent.

Each frame is interactive: a viewer can open the menu, enter rounds, save a match. The entries are
keyed by `Screen['type']` (`Record<Screen['type'], …>`), so a screen added to the router does not
compile until it has its entry here. A module's states bind its game the way the app does
(`BindModuleUseCase`), then open the module's screen; its chunk is inlined in the catalog build
(`codeSplitting: false`), so the one-page preview still runs it.

A frame is 390 px wide whatever the viewer's window: `Columns` switches on a container query (the
width of its `WideLayout`), not on the window, so a module laid in two columns on a wide screen
shows its phone layout in the frame.

A shipped feature adds its states here when it removes its mockup
([`design-workflow.md`](design-workflow.md), step 4).

## Guards

`src/catalog.test.tsx` runs in `pnpm test` (and so in CI):

- **Every component exported by the design system is covered by a story.** A new component cannot
  land without its specimen; the failure lists the missing names.
- Every name a story `covers` is a real export, every story id is unique, every layer known.
- Every variant renders without throwing, and so does every mockup screen.
- Every app screen has a unique type and at least one state, and each state runs: the real screen
  mounts (a module's lazily) and shows its controls.
- **Stories compose the design system only**: no `className=`, no `style={…}`, no `lucide-react`
  import in `src/stories/**`, `src/screens/**` nor in a mockup's screens — the same rule
  `eslint.config.js` holds the app to. Only `src/shell/` and a mockup's `sketches/` write classes;
  sketches write no inline style, import no icon and read semantic tokens only.

## Adding to it

- **A feature that changes what a player sees**: its mockup comes first, under `src/mockups/`
  — see [`design-workflow.md`](design-workflow.md).

- **A new design-system component**: add a story to the layer's file (and a demo if it needs
  state). The coverage test fails until you do.
- **A new screen, or a new state of one**: add it to `src/screens/index.tsx`, with the data it
  needs in `src/screens/fixtures.ts`. A new `Screen` type does not compile until it has its entry.
- **A new token file**: add its specimen to `src/shell/Tokens.tsx` and a story in
  `src/stories/tokens.tsx`.
- Example data is realistic and in French (player names, game names, scores), never lorem ipsum.
