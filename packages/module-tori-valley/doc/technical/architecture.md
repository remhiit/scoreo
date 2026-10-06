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

`ToriValleyModuleScreen` writes a draft (`toDraft`/`ToriValleyDraftSchema` in
`domain/model/moduleResult.ts`) on every change to `ScoreDetailScreen`'s state once the Objectif cards
are confirmed — the state lives in that screen's own `useReducer`, and bubbles up through an
`onChange` prop internal to this package (not part of `ScoringModuleScreenProps`) for the module screen
to persist. `readDraft` is the only way back in: it rejects a payload the schema can't parse, one from
an older `DRAFT_VERSION`, or one whose `playerIds` don't match the table exactly — the module scores by
`playerId`, so a mismatched draft would silently hand another game's numbers to today's players.
Reopening a match (`editing`) always wins over a draft for the same players; while `editing` is set,
`onChange` is left `undefined` so a reedit never touches the slot at all — it is already durably saved
on the host's side, and the slot belongs to a new match in progress, not to it (a reedit that wrote or
cleared it could clobber, or later be mistaken for, an abandoned new-match draft for the same players).
Saving clears the draft (`ModuleHostAdapter.saveMatch`, host-side); the screen's own **Cancel** button
clears it too, but only for a new match — same `editing === undefined` guard — the only
explicit way to discard a restored draft — leaving the module any other way keeps it, on purpose.

## Internationalization

`src/i18n/index.ts` owns the module's dictionaries (English + French, bundled under `src/i18n/locales/`) and exposes them as an i18next **namespace**, `tori-valley`: `registerTranslations(i18n)` adds them to whatever instance the host provides, called when the module's chunk loads, so the two sets of strings share one instance without ever colliding. Which language they render in is Scoreo's business — the module has no bootstrap and no storage key of its own, only `src/test/i18n.ts` for the Vitest suite. Components read `useTranslation(TORI_VALLEY_NS)`'s `t()`; `domain/model/errors.ts`'s `ValidationError`/`NotFoundError` carry an optional stable `code` (and `params` for interpolation) that the `ui` layer translates at render/dispatch time — the domain layer itself has no i18n dependency, only a plain string key.

## PWA shell

**None of its own.** The service worker, the manifest and the icons went with the standalone shell
(#330); Scoreo is the installable app, and the module ships inside it as a chunk. Scoreo's own
worker still scopes its cache purge by prefix, because `remhiit.github.io` hosts several PWAs on one
origin — see the workspace's `doc/technical/architecture.md`.

## Styling

The module wears Scoreo's look: its screens compose `@scoreboards/design-system` (`Button`, `Panel`,
`Select`, `NumberField`, `Checkbox`, `Stack`, `Text`…) and write no `className`, `style` or
`lucide-react` import — ESLint enforces it through `MODULES_COMPOSING_DS`. Labels stay translated by
the module's i18n and are passed as props.

What the design system has no equivalent for lives in `src/design/` — `ModuleRoot` (the
`.module-tori-valley` scope), `ToriiBadge` (a Torī colour name on that colour) and `VariantPicker`
(the A/B/C Objectif variant, as native radios). Each piece imports its own CSS, so Vite emits it in
the module's chunk: the module arrives **styled** inside Scoreo, at zero cost until someone opens it.

**Every rule is scoped under `.module-tori-valley`** and **every class is prefixed `tv-`**, so
nothing escapes into the host and the host's generic names (`.card`, `.empty`) never reach the
module (that collision is how every player card once ended up laid out in a row, #349). The CSS reads
semantic tokens only (`--surface-*`, `--text-*`, `--color-success` / `--color-danger` /
`--color-info` / `--color-warning` for four Torī colours, a danger/info blend for purple) and
declares no variable named like a design-system token: the module follows the flavor and accent the
player picked. `scripts/check-module-styles.mjs` fails on a breach,
`apps/scoreo/e2e/module-style-isolation.spec.ts` and `apps/scoreo/tests/visual/` catch what it
cannot see.

Anything that must paint before scripts run belongs to the host: the stylesheet ships inside the JS
chunk, so it arrives too late for a splash.
