# Architecture

## Stack

React 19 + TypeScript, Vite, Vitest + Testing Library (jsdom, no real browser needed) for behaviour and Playwright + Chromium for visual regression, Zod for schema validation, ESLint (typescript-eslint, react-hooks, react-refresh) + Prettier, pnpm. PWA shell (manifest, service worker) for installability; no backend — 100% local-first via `localStorage`. i18next + react-i18next for internationalization (English/French).

## Layering (hexagonal / ports & adapters)

```
domain/        — model + port. No framework, no I/O.
application/   — use cases. Business logic, depends only on domain ports.
infrastructure/— adapters implementing domain ports (localStorage, in-memory test doubles).
services/      — root DI: createServices() builds concrete adapters once; ServicesContext exposes them.
ui/            — one folder per screen: <Screen>Reducer.ts (+ test), <screen>Types.ts, <Screen>.tsx (+ test).
```

Dependency direction is strictly inward: `ui` → `services`/`application` → `domain` ← `infrastructure`. `domain` never imports from any other layer.

## MVI-style screens

Each screen owns a pure `(state, action) => state` reducer (`useReducer`), colocated under `src/ui/<screen>/`. Side-effecting work (use-case calls) happens in `submit*`/plain event-handler functions in the screen component, which then `dispatch()` the resulting action — the reducer itself never touches a repository or a use case. See [`doc/glossary.md`](../glossary.md) and [`doc/reference.md`](../reference.md) for the exhaustive per-screen tables.

## Testing

Two suites, split by what they can actually observe:

- **Behaviour** — Vitest + Testing Library under jsdom, colocated `*.test.ts(x)`. Fast, and the place for every reducer, use case, adapter and screen interaction. jsdom computes no layout, so it can assert what the DOM says but never what the user sees.
- **Visual regression** — Playwright + Chromium in `tests/visual/`, screenshotting the production build at a phone and a desktop viewport and diffing against committed PNG baselines. This is what catches a broken flex direction, a row that stops truncating, or an unreadable dark-mode token.

The two never overlap: the Playwright specs assert pixels only and contain no behavioural assertions. Baselines are recorded inside the same container image CI uses (`pnpm test:visual:container --update-snapshots`) because font rasterisation differs between distributions — full rules, determinism guarantees and the procedure for updating a baseline are in [`visual-testing.md`](visual-testing.md).

## Backward compatibility

Every domain model that gets persisted (`Player`, `Match`/`PlayerResult`) has a matching `*.schema.ts` (Zod). Repositories parse through the schema on read and fail open (corrupted/unparseable JSON → empty array) rather than throwing. **Rule: adding a field to a persisted model must give it a zod `.default()`** so old localStorage data from a previous app version keeps loading — see the "backward compat" tests in `localStoragePlayerRepository.test.ts` / `localStorageMatchRepository.test.ts` for the pattern to follow.

## Scoring domain

`src/domain/model/torii.ts` and `src/domain/model/match.ts` hold the actual game-rule logic (Torī series scoring, VP totals, winner/tie-break) as pure, framework-free functions — see [`doc/functional/features/scoring.md`](../functional/features/scoring.md) for the rules themselves and what's _not_ modeled yet (Objectif card texts, Sceau effects, solo mode).

## Persistence

`localStorage` only, no cloud sync in this MVP (see keys in [`doc/reference.md`](../reference.md)). If cloud sync is added later, follow scoreo's pattern: an optional `CloudSyncRepository` port, wired into `createServices()` only when configured, so the rest of the app is unaffected when it's absent.

## Internationalization

`src/i18n/index.ts` owns the module's dictionaries (English + French, bundled under `src/i18n/locales/`) and exposes them as an i18next **namespace**, `tori-valley`: `registerTranslations(i18n)` adds them to whatever instance the host provides, so that once Scoreo renders this module the two sets of strings share one instance without ever colliding. `src/i18n/standalone.ts` is the instance for running this app on its own — imported only by `main.tsx` and `src/test/setup.ts`. It mirrors Scoreo's own init: the language comes from `scoreo_lang` in `localStorage`, else from this app's former key `tori_valley_language` (read once, never written, so a language chosen before the merge survives it), else the browser's, else English; manual choices are written back to `scoreo_lang`. Both apps share the `remhiit.github.io` origin, so a language picked in either is the language the other starts in. Components read `useTranslation(TORI_VALLEY_NS)`'s `t()`; `domain/model/errors.ts`'s `ValidationError`/`NotFoundError` carry an optional stable `code` (and `params` for interpolation) that the `ui` layer translates at render/dispatch time — the domain layer itself has no i18n dependency, only a plain string key.

## PWA shell

`public/registerSw.js` registers `public/sw.js` on load (and unregisters any worker on `localhost`, so dev never serves a stale cache). `sw.js` precaches only the non-hashed entry points (`./`, `index.html`) — Vite's content-hashed bundles are unknown at write time and get cached on first fetch instead.

**The Cache Storage API is scoped to the origin, not to the service worker's scope.** `remhiit.github.io` hosts several PWAs (scoreo, this app, 1kSaBord), so they all share one cache namespace: an `activate` handler that deletes every cache other than its own `CACHE_NAME` wipes the _neighbouring apps'_ offline caches. The purge is therefore restricted to names starting with `CACHE_PREFIX` (derived from `CACHE_NAME` by dropping its trailing `-v<n>`), which keeps the version purge intact while leaving `scoreo-*` / `ksabord-*` alone. `src/test/sw.test.ts` guards both halves of that rule.

## Styling

Single `src/styles.css`, imported by both entry points rather than linked from `public/`: the standalone shell pulls it in through `main.tsx`, and the hosted module screen imports it too, so Vite emits it as a CSS chunk loaded alongside the module's JS chunk. That is what makes the module arrive **styled** inside Scoreo, at zero cost until someone opens it. Only the splash keeps a handful of inline rules in `index.html`, since it has to paint before any script runs.

Every colour is resolved against the host's semantic token first, with the module's own palette as the fallback: `--color-bg: var(--surface-app, #fdf6ee)`. Inside Scoreo the tokens are defined, so the module follows the flavor and accent the user picked; on the standalone page nothing defines them and the fallbacks reproduce the palette this app has always shipped, pixel for pixel. That is what the visual baselines verify.

Two things deliberately stay the module's own. **Spacing and radii**: Scoreo's scale reuses the same names for different values (`--space-5` is 20px there, 24px here), so adopting it is a real layout change rather than a rename — the two properties that happened to already sit at an exact Scoreo value (`font-size: 16px`, `border-radius: 999px`) got the same `var(--token, fallback)` treatment as the colors, but the rest of the scale is untouched. **The Torī hues**: a red Torī is red in every flavor, so they map onto the Catppuccin palette (`--ctp-red`) rather than onto a semantic role, and their contrast text is fixed.

Note the aliases are named `--tori-primary` / `--tori-danger`, not `--color-primary` / `--color-danger`: a custom property cannot reference itself, and Scoreo already owns those two names.

`scripts/check-design-tokens.mjs` (workspace root) scans this file too — it fails on any raw px/duration value that exactly equals a Scoreo token, so any future value that happens to land on one needs the same `var(--token, fallback)` treatment rather than a bare literal.
