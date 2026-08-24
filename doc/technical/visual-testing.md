# Visual regression testing

The repo has **three test suites**, and they answer different questions.

| Suite                        | Runner                          | Asks                                    | Command                        |
| ---------------------------- | ------------------------------- | --------------------------------------- | ------------------------------ |
| Behaviour (unit + component) | Vitest + Testing Library, jsdom | "Does the right thing happen?"          | `pnpm test`                    |
| End to end                   | Playwright + Chromium           | "Does the flow still work?"             | `pnpm --filter scoreo test:e2e` |
| Visual regression            | Playwright + Chromium           | "Does it still *look* right?"           | `pnpm --filter scoreo test:visual` |

jsdom computes no layout and paints no pixels, so a broken flex direction, a
player row that stops truncating, or a dark-mode token that turns unreadable all
pass the behaviour suite untouched. This is a phone-first PWA used at the table,
so those are exactly the regressions that matter. The visual suite renders the
**production build** in a real browser at fixed viewports and compares the result
against committed PNG baselines.

## What it covers, and why that is the module

The suite lives in the host, `apps/scoreo/tests/visual/`, and photographs a
**scoring module inside Scoreo** — on the host's own `#/module/…` route, with the
host's chrome around it. That is what a player actually sees.

It is the only guard of its kind, and it exists because a module's screen is the
one part of the app whose look nothing else checks: the e2e specs assert
behaviour, and a module keeps a stylesheet of its own that the host knows nothing
about. **Every registered module belongs here** — Torī Valley and 1000 Sabords
each have their spec. Scoping protects the host from the module — never the module from the
host, whose generic rules (`.card`, `.empty`…) land on the module's markup like
any other. This suite is where that shows up.

## Layout

```
apps/scoreo/
  playwright.visual.config.ts        Projects (phone / desktop), determinism settings, preview server
  scripts/visual-in-container.sh     Runs the suite in the same image CI uses
  tests/visual/
    support/app.ts                   openApp() seeding helper, expectScreenshot(), route builders
    support/fixtures.ts              Fixed players, game type and match, typed against Scoreo's models
    *.visual.spec.ts                 One file per module
    *-snapshots/                     The committed baselines (one PNG per test per project)
```

## Running

```bash
pnpm --filter scoreo build                        # the suite screenshots dist/, so build first
pnpm --filter scoreo test:visual                  # verify against the baselines
pnpm --filter scoreo test:visual:update           # re-record them
pnpm --filter scoreo test:visual:container        # verify inside the CI container image (see below)
```

`test:visual` starts `vite preview` itself; you do not need a server running.

The first run on a fresh checkout needs the browser binary once:

```bash
pnpm --filter scoreo exec playwright install chromium
```

## The one rule about baselines

**Baselines are recorded in a container, never on your own machine.**

Font hinting and rasterisation differ between distributions. A PNG recorded on
Fedora, or on macOS, differs from the same page rendered on CI's Ubuntu by
thousands of subpixels — enough to fail every comparison forever. So:

```bash
pnpm --filter scoreo build
pnpm --filter scoreo test:visual:container --update-snapshots   # record
pnpm --filter scoreo test:visual:container                      # verify exactly as CI will
```

`apps/scoreo/scripts/visual-in-container.sh` runs
`mcr.microsoft.com/playwright:v<version>-noble` under podman or docker, deriving
`<version>` from the `@playwright/test` entry in `apps/scoreo/package.json` so the
image can never drift from the library. CI runs its job in that same image.

Running `test:visual` directly on your machine is still useful — it catches "the
screen doesn't render at all" instantly — but the diffs it reports against
container-recorded baselines are meaningless. Do not commit what it records.

## Reading a failure

A failed comparison writes three PNGs to `apps/scoreo/test-results/<test>/`:
`*-expected.png` (the baseline), `*-actual.png` (what rendered now), and
`*-diff.png` (the disagreeing pixels in magenta). CI uploads the HTML report as
the `playwright-report` artifact on failure; open `index.html` from it to page
through them side by side.

Then decide which of two things happened:

- **A regression** — fix the code; the baseline was right.
- **An intended change** — re-record with `test:visual:container --update-snapshots`
  and commit the new PNGs *in the same commit as the change that caused them*, so
  the diff shows cause and effect together.

A PR that only updates baselines, with no explanation of the visual change, is a
review flag.

## What keeps the screenshots deterministic

Pixel comparison is unforgiving, so every source of run-to-run variance is pinned:

| Source of drift              | How it is pinned                                                              |
| ---------------------------- | ----------------------------------------------------------------------------- |
| Font rendering               | Baselines recorded in the CI container image (above)                          |
| Locale-formatted dates       | `locale: 'en-GB'` and `timezoneId: 'UTC'` in `playwright.visual.config.ts`     |
| Match dates                  | `fixtures.ts` hardcodes `date` — nothing derives from `Date.now()`            |
| Translated labels            | `openApp()` seeds `scoreo_lang`, defaulting to `en`                           |
| The host's own theme         | `openApp()` seeds `scoreo_flavor`/`scoreo_accent`, which would otherwise follow the machine's colour scheme |
| Ids                          | Fixtures use fixed ids, never the app's id generator                          |
| CSS animations, text caret   | `animations: 'disabled'`, `caret: 'hide'` in the `expect` defaults             |
| Colour scheme                | `colorScheme: 'light'` by default; dark is its own opt-in describe block       |
| Leftover state between tests | Each test seeds `localStorage` from scratch via `page.addInitScript`           |

Three consequences worth knowing:

- **Screens are reached by hash route, not by clicking through the app.** A
  broken Home screen fails one baseline instead of cascading through the suite.
  The route builder in `support/app.ts` mirrors `src/ui/navigation/hash.ts`.
- **A match id must be a real UUID.** `migrateMatches` rewrites any other id on
  the first read, and a renamed match is one the module route can no longer find
  — the module then opens an empty grid that looks perfectly plausible. Specs
  wait on the *exact* restored total for the same reason.
- **The viewports are tall on purpose.** Scoreo scrolls its content inside the
  shell rather than the document, so a full-page capture at a real device height
  would hold nothing but the first screenful. Each project keeps its target's
  width — which is what drives every breakpoint — and takes whatever height the
  tallest screen needs.

`maxDiffPixelRatio` is `0.001` — a few hundred pixels on a phone screenshot.
Enough to absorb a stray antialiased edge, far too little to hide a layout shift.

## Adding a module

1. Add `tests/visual/<module>.visual.spec.ts`, seeding only the state it needs:
   the players, a `GameType` carrying the module's `moduleId`, and — for the
   reopen case — a match whose `moduleData` the module can read back.
2. Wait on a screen-specific locator via `expectScreenshot(page, locator, name)` —
   never screenshot on a bare `goto`, or you race the first render.
3. Record the baselines in the container, and commit the PNGs with the spec.
4. Add the module to the visual-tests entry in [`../reference.md`](../reference.md).

## Scope

Chromium only, two viewport widths (phone 412, desktop 1280). More browsers would
multiply the committed PNGs for little signal on a phone-first PWA. These specs
assert **pixels only** — behaviour, reducers and use cases stay in the Vitest and
e2e suites. See [`architecture.md`](architecture.md) for how the layers fit
together.
