# Architecture

## Stack

React 19 + TypeScript, Vitest + Testing Library (jsdom, no real browser needed) for behaviour, Zod for schema validation, i18next + react-i18next for internationalization (English/French). Linting, formatting, the build and the visual regression suite are the workspace's and the host's — this package builds nothing of its own.

## Layering (hexagonal / ports & adapters)

```
domain/model/  — types, zod schemas, the game's scoring rules. No framework, no I/O.
ui/            — one folder per screen: <Screen>Reducer.ts (+ test), <screen>Types.ts, <Screen>.tsx (+ test).
ui/module/     — the screen the host renders, which strings the two others together.
```

Dependency direction is strictly inward: `ui` → `domain`, and `domain` imports from nothing else.

The ports, adapters, use cases and DI container this package used to carry went with the standalone
shell (#330, #350): a module owns no storage, so it has nothing to abstract. What it needs from the
outside arrives through `ModuleHost` — see the workspace's
[`doc/technical/module-contract.md`](../../../../doc/technical/module-contract.md).

## MVI-style screens

Each screen owns a pure `(state, action) => state` reducer (`useReducer`), colocated under `src/ui/<screen>/`. Side-effecting work happens in plain event-handler functions in the screen component, which then `dispatch()` the resulting action — the reducer itself never touches the host. See [`doc/glossary.md`](../glossary.md) and [`doc/reference.md`](../reference.md) for the exhaustive per-screen tables.

## Testing

Two suites, split by what they can actually observe:

- **Behaviour** — Vitest + Testing Library under jsdom, colocated `*.test.ts(x)`. Fast, and the place for every reducer, use case, adapter and screen interaction. jsdom computes no layout, so it can assert what the DOM says but never what the user sees.
- **Visual regression** — Playwright + Chromium, screenshotting the production build at a phone and a desktop viewport and diffing against committed PNG baselines. This is what catches a broken flex direction, a row that stops truncating, or an unreadable dark-mode token. It lives **in the host** now (`apps/scoreo/tests/visual/`) and photographs this module on Scoreo's own route: that is where players meet it, and the module's shell is gone. See the workspace's `doc/technical/visual-testing.md`.

The two never overlap: the Playwright specs assert pixels only and contain no behavioural assertions.

## Backward compatibility

Every domain model that gets persisted (`Player`, `Match`/`PlayerResult`) has a matching `*.schema.ts` (Zod). Repositories parse through the schema on read and fail open (corrupted/unparseable JSON → empty array) rather than throwing. **Rule: adding a field to a persisted model must give it a zod `.default()`** so old localStorage data from a previous app version keeps loading — see the "backward compat" tests in `localStoragePlayerRepository.test.ts` / `localStorageMatchRepository.test.ts` for the pattern to follow.

## Scoring domain

`src/domain/model/torii.ts` and `src/domain/model/match.ts` hold the actual game-rule logic (Torī series scoring, VP totals, winner/tie-break) as pure, framework-free functions — see [`doc/functional/features/scoring.md`](../functional/features/scoring.md) for the rules themselves and what's _not_ modeled yet (Objectif card texts, Sceau effects, solo mode).

## Persistence

**None.** The module reaches storage only through `ModuleHost`: `host.saveMatch()` for a finished
match, `host.saveDraft()`/`loadDraft()` for a game in progress, both stored by Scoreo under its own
keys. The `tori_valley_*` keys the standalone app used are read by nothing since #350.

## Internationalization

`src/i18n/index.ts` owns the module's dictionaries (English + French, bundled under `src/i18n/locales/`) and exposes them as an i18next **namespace**, `tori-valley`: `registerTranslations(i18n)` adds them to whatever instance the host provides, called when the module's chunk loads, so the two sets of strings share one instance without ever colliding. Which language they render in is Scoreo's business — the module has no bootstrap and no storage key of its own, only `src/test/i18n.ts` for the Vitest suite. Components read `useTranslation(TORI_VALLEY_NS)`'s `t()`; `domain/model/errors.ts`'s `ValidationError`/`NotFoundError` carry an optional stable `code` (and `params` for interpolation) that the `ui` layer translates at render/dispatch time — the domain layer itself has no i18n dependency, only a plain string key.

## PWA shell

**None of its own.** The service worker, the manifest and the icons went with the standalone shell
(#330); Scoreo is the installable app, and the module ships inside it as a chunk. Scoreo's own
worker still scopes its cache purge by prefix, because `remhiit.github.io` hosts several PWAs on one
origin — see the workspace's `doc/technical/architecture.md`.

## Styling

Single `src/styles.css`, imported by the module's screen rather than linked from a shell: Vite emits
it as a CSS chunk loaded alongside the module's JS chunk. That is what makes the module arrive
**styled** inside Scoreo, at zero cost until someone opens it.

**Every rule is scoped under `.module-tori-valley`**, carried by the wrapper the screen renders, and
**every class is prefixed `tv-`**. The module keeps the identity of the game it counts (Torī Valley's
warm washi palette, its own spacing and radii), and none of it escapes into the host.

That scoping is not cosmetic. The two stylesheets name tokens alike with different values —
`--color-primary` (Torī red vs Catppuccin mauve), `--space-5` (24px vs 20px), `--radius-lg` (16px vs
14px), plus `--color-danger`, `--shadow-sm`, `--shadow-md` — and element selectors like `input`,
`select` and `label` would have restyled the whole app. A stylesheet is not unloaded on navigation,
so an unscoped rule would have followed the player for the rest of the session.

The prefix guards the other direction, which scoping cannot: Scoreo's `theme.css` styles plain
`.card` and `.empty`, and this module shipped for a while with every player card laid out in a row
because it reused the name (#349). `scripts/check-module-styles.mjs` fails on either breach,
`apps/scoreo/e2e/module-style-isolation.spec.ts` and `apps/scoreo/tests/visual/` catch what it
cannot see.

Anything that must paint before scripts run belongs to the host: the stylesheet ships inside the JS
chunk, so it arrives too late for a splash.

It still defines its own colour custom properties for light/dark (`prefers-color-scheme`) rather than Scoreo's Catppuccin tokens — moving onto them is tracked separately, and needs the tokens to become a package first.
