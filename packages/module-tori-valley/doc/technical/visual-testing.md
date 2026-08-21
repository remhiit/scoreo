# Visual regression testing

The repo has **two test suites**, and they answer different questions.

| Suite                         | Runner                       | Asks                                              | Command            |
| ----------------------------- | ---------------------------- | ------------------------------------------------- | ------------------ |
| Behaviour (unit + component)  | Vitest + Testing Library, jsdom | "Does the right thing happen?"                    | `pnpm test`        |
| Visual regression             | Playwright + Chromium        | "Does it still *look* right?"                     | `pnpm test:visual` |

jsdom computes no layout and paints no pixels, so a broken flex direction, a
player row that stops truncating, or a dark-mode token that turns unreadable all
pass the behaviour suite untouched. This is a phone-first PWA used at the table,
so those are exactly the regressions that matter. The visual suite renders the
**production build** in a real browser at fixed viewports and compares the result
against committed PNG baselines.

## Layout

```
playwright.config.ts             Projects (phone / desktop), determinism settings, preview server
tests/visual/
  support/app.ts                 openApp() seeding helper, expectScreenshot(), route builders
  support/fixtures.ts            Fixed players and matches, typed against the domain models
  *.visual.spec.ts               One file per screen, plus darkMode.visual.spec.ts
  *-snapshots/                   The committed baselines (one PNG per test per project)
scripts/visual-in-container.sh   Runs the suite in the same image CI uses
```

## Running

```bash
pnpm build                       # the suite screenshots dist/, so build first
pnpm test:visual                 # verify against the baselines
pnpm test:visual:update          # re-record them
pnpm test:visual:container       # verify inside the CI container image (see below)
```

`pnpm test:visual` starts `vite preview` itself; you do not need a server running.

The first run on a fresh checkout needs the browser binary once:

```bash
pnpm exec playwright install chromium
```

## The one rule about baselines

**Baselines are recorded in a container, never on your own machine.**

Font hinting and rasterisation differ between distributions. A PNG recorded on
Fedora, or on macOS, differs from the same page rendered on CI's Ubuntu by
thousands of subpixels — enough to fail every comparison forever. So:

```bash
pnpm build
pnpm test:visual:container --update-snapshots   # record
pnpm test:visual:container                      # verify exactly as CI will
```

`scripts/visual-in-container.sh` runs `mcr.microsoft.com/playwright:v<version>-noble`
under podman or docker, deriving `<version>` from the `@playwright/test` entry in
`package.json` so the image can never drift from the library. CI runs its job in
that same image.

Running `pnpm test:visual` directly on your machine is still useful — it catches
"the screen doesn't render at all" instantly — but the diffs it reports against
container-recorded baselines are meaningless. Do not commit what it records.

## Reading a failure

A failed comparison writes three PNGs to `test-results/<test>/`:
`*-expected.png` (the baseline), `*-actual.png` (what rendered now), and
`*-diff.png` (the disagreeing pixels in magenta). CI uploads the HTML report as
the `playwright-report` artifact on failure; open `index.html` from it to page
through them side by side.

Then decide which of two things happened:

- **A regression** — fix the code; the baseline was right.
- **An intended change** — re-record with `pnpm test:visual:container --update-snapshots`
  and commit the new PNGs *in the same commit as the change that caused them*, so
  the diff shows cause and effect together.

A PR that only updates baselines, with no explanation of the visual change, is a
review flag.

## What keeps the screenshots deterministic

Pixel comparison is unforgiving, so every source of run-to-run variance is pinned:

| Source of drift               | How it is pinned                                                          |
| ----------------------------- | ------------------------------------------------------------------------- |
| Font rendering                | Baselines recorded in the CI container image (above)                      |
| Locale-formatted dates        | `locale: 'en-GB'` and `timezoneId: 'UTC'` in `playwright.config.ts`       |
| Match dates                   | `fixtures.ts` hardcodes `playedAt` — nothing derives from `Date.now()`    |
| Translated labels             | `openApp()` seeds `tori_valley_language`, defaulting to `en`              |
| Ids                           | Fixtures use fixed ids (`player-akira`), never the app's id generator     |
| CSS animations, text caret    | `animations: 'disabled'`, `caret: 'hide'` in the `expect` defaults        |
| Colour scheme                 | `colorScheme: 'light'` by default; dark is its own opt-in spec            |
| Leftover state between tests  | Each test seeds `localStorage` from scratch via `page.addInitScript`      |

Two consequences worth knowing:

- **Screens are reached by hash route, not by clicking through the app.** A
  broken Home screen fails one baseline instead of cascading through the suite.
  Route builders live in `support/app.ts` and mirror `src/ui/navigation/hash.ts`.
- **Fixtures are typed against the domain models.** Give a persisted model a new
  required field and `pnpm typecheck` fails in `fixtures.ts`, rather than the
  screenshots quietly drifting.

`maxDiffPixelRatio` is `0.001` — about 370 pixels on a phone screenshot. Enough
to absorb a stray antialiased edge, far too little to hide a layout shift.

## Adding a screen

1. Add a route builder to `routes` in `support/app.ts` if the screen has a new hash shape.
2. Add `tests/visual/<screen>.visual.spec.ts`, seeding only the state that screen needs.
3. Wait on a screen-specific locator via `expectScreenshot(page, locator, name)` —
   never screenshot on a bare `goto`, or you race the first render.
4. Record the baselines in the container, and commit the PNGs with the spec.
5. Add the screen to the visual-tests table in [`../reference.md`](../reference.md).

## Scope

Chromium only, two viewports (phone 412×839, desktop 1280×800). More browsers
would multiply the committed PNGs for little signal on a phone-first PWA. These
specs assert **pixels only** — behaviour, reducers and use cases stay in the
Vitest suite. See [`architecture.md`](architecture.md) for how the layers fit
together.
