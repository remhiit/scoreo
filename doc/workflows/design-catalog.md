# Design catalog

The catalog (`apps/catalog/`) is the **living reference of the design system**: one page per
atomic layer, every component of [`@scoreboards/design-system`](../../packages/design-system/README.md)
rendered by its real code with example data, in any of the four Catppuccin flavors and fourteen
accents; then the app's screens, the modules' game pieces and the screen × components index. Nothing
in it is redrawn, so it cannot drift from what Scoreo ships — unlike the Claude Design export in
`ds_temp/scoreo-design/`, a hand-made copy frozen on 2026-09-30, which it replaces as the visual
reference.

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
| `src/mockups/<feature>/` | The mockup of a feature not coded yet: `index.tsx` (the `Mockup`), `screens.tsx`, `sketches/` for the components the design system lacks. Shown on the catalog's **Maquettes** page. See [`doc/workflows/design-workflow.md`](design-workflow.md) |
| `src/screens/` | The **Écrans** page: every screen of the app as it ships. `index.tsx` lists each `Screen['type']` with its states, `fixtures.ts` seeds the example data, `LiveApp.tsx` runs the app in a frame |
| `src/pieces/` | The **Pièces de jeu** page: one file per module with game pieces (`PieceModule`: the module's `ModuleRoot` and its pieces), `demos.tsx` for the stateful ones. Imports each module's `src/design/` by relative path |
| `src/usage/extract.ts` | The **Écran × composants** index, pure: finds the screens in a list of paths, reads their design-system imports, follows their relative imports, inverts the result |
| `usagePlugin.ts` | The Vite plugin behind `virtual:screen-usage`: reads the sources at build time (and at each dev start or test run) and hands them to `src/usage/extract.ts`. The page embeds the index, not the sources |
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

A frame is 390 px wide, but media queries still answer to the viewer's window: on a wide screen, a
layout that switches at a breakpoint (1000 Sabords' two columns) shows its wide form in the frame.
Open the preview on a phone to see the narrow one.

A shipped feature adds its states here when it removes its mockup
([`doc/workflows/design-workflow.md`](design-workflow.md), step 4).

## Pièces de jeu: the modules' own components

What the design system has no component for and one game alone draws (1000 Sabords' dice counter and
score grid, Skyjo's round table and winner banner, Torī Valley's colour badge and variant picker)
lives in that module's `src/design/` ([ADR-0036](../adr/0036-modules-wear-scoreo-look.md), game pieces in
`src/design/`). The **Pièces de jeu** page shows each of them on its own, grouped by module, with
its variants (tones, colours, an empty grid). Every variant renders inside the module's `ModuleRoot`,
the element carrying `.module-<moduleId>`: the pieces' CSS is scoped under that class and would not
apply anywhere else.

The catalog reads the pieces straight from `packages/module-*/src/design/` by relative path: no module
gains an export or a dependency for it, and the dependency runs one way only — the catalog depends
on the modules and on Scoreo, never the reverse. A module whose `src/design/index.ts` exports only its
`ModuleRoot` (Flip 7), or that has no `src/design/`, has no entry and no error.

## Écran × composants: the index, computed from the code

The **Écran × composants** page answers two questions: which design-system components a screen uses,
and which screens use a component (and so what a change to it reaches). It is never written by hand.
`usagePlugin.ts` reads the sources at build time and `src/usage/extract.ts` computes:

- the **screens**: the shell (`apps/scoreo/src/App.tsx`, around every screen), each
  `apps/scoreo/src/ui/<folder>/` that holds a `*Screen.tsx`, and each module's `src/ui/`. Folders
  with no screen (`shared/`, `theme/`, `navigation/`) are not rows: they count toward the screens
  that import them;
- for each, the names its files import from `@scoreboards/design-system` (type imports aside), then
  those of every file it reaches by relative import — a shared composition, a module's game pieces —
  but never another screen's folder, so the shell does not inherit every screen;
- the **inverse index**: each design-system component with the screens that import it, including
  the components no screen imports.

A screen that imports no component keeps its row, with an empty list. The page filters the names
against the design system's real component exports, so a constant such as `HUES` does not show.

## Guards

`src/catalog.test.tsx` runs in `pnpm test` (and so in CI):

- **Every component exported by the design system is covered by a story.** A new component cannot
  land without its specimen; the failure lists the missing names.
- Every name a story `covers` is a real export, every story id is unique, every layer known.
- Every variant renders without throwing, and so does every mockup screen.
- Every app screen has a unique type and at least one state, and each state runs: the real screen
  mounts (a module's lazily) and shows its controls.
- **Every game piece a module exports is covered.** The test globs every
  `packages/module-*/src/design/index.ts` and fails, listing `module: Piece`, when an export other
  than `ModuleRoot` has no entry in `src/pieces/`; an entry's `Root` must be that module's own
  `ModuleRoot`, and each variant renders inside it (the `.module-<moduleId>` scope is in the DOM).
- The index lists the shell, every screen folder of the app and every module; the extraction itself
  is unit-tested on sample sources (`src/usage/extract.test.ts`).
- **Stories compose the design system only**: no `className=`, no `style={…}`, no `lucide-react`
  import in `src/stories/**`, `src/screens/**`, `src/pieces/**` nor in a mockup's screens — the same rule
  `eslint.config.js` holds the app to. Only `src/shell/` and a mockup's `sketches/` write classes;
  sketches write no inline style, import no icon and read semantic tokens only.

## Adding to it

- **A feature that changes what a player sees**: its mockup comes first, under `src/mockups/`
  — see [`doc/workflows/design-workflow.md`](design-workflow.md).

- **A new design-system component**: add a story to the layer's file (and a demo if it needs
  state). The coverage test fails until you do.
- **A new game piece in a module's `src/design/`**: add its entry to the module's file in
  `src/pieces/` (a new file, listed in `src/pieces/index.ts`, for a module's first piece). The
  coverage test fails until you do. The index needs nothing: it follows the code.
- **A new screen, or a new state of one**: add it to `src/screens/index.tsx`, with the data it
  needs in `src/screens/fixtures.ts`. A new `Screen` type does not compile until it has its entry.
- **A new token file**: add its specimen to `src/shell/Tokens.tsx` and a story in
  `src/stories/tokens.tsx`.
- Example data is realistic and in French (player names, game names, scores), never lorem ipsum.
