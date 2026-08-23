---
name: new-scoring-module
description: Add a new scoring module to Scoreo — the package, the manifest, the screen, the styles, the registration and the guards to extend. Use when a new board game gets its own point counter inside Scoreo, or when reviewing whether an existing module respects the contract. Encodes the traps that cost real bugs in tori-valley and mille-sabords.
---

# Adding a scoring module

A module is a package under `packages/` that owns one game's scoring rules and screen. Scoreo owns
everything around it: players, history, statistics, export, theme, storage.

The contract is `doc/technical/module-contract.md` — **read it, this skill does not restate it.**
What follows is the order of operations, and the traps that are invisible until they bite.

## 1. The package

`packages/module-<game>/`, modelled on the two that exist:

- `package.json` — **no `build` script, no `vite` dependency.** A module builds nothing: Scoreo
  bundles it. Scripts are `test`, `test:watch`, `typecheck`.
- `vitest.config.ts` — declares `@vitejs/plugin-react` itself; there is no `vite.config.ts` to extend.
- A tsconfig. The two existing modules differ — `module-mille-sabords` has a single
  `tsconfig.json`, `module-tori-valley` splits `src` and `vitest.config.ts` into project references —
  and neither is wrong. Copy whichever neighbour you are closest to.
- `src/styles.d.ts` — `declare module '*.css'`. Without `vite/client` types, the stylesheet import
  fails to type-check.

## 2. The entry point — the bundle trap

`src/index.ts` exports **the manifest and the module, nothing else.**

Scoreo's registry imports this file eagerly, so everything reachable from it lands in the host's
main bundle. 1000 Sabords re-exported its domain here, and ~8 kB of scoring rules rode into
`index.js` — the separate chunk changed nothing, because the chunk was never the issue. It was
caught by the grep below, in the PR that introduced it (#345), and never reached `main`.

Verify with a build, not by reading:

```bash
pnpm --filter scoreo build
grep -c "<a string only your module has>" apps/scoreo/dist/assets/index-*.js   # must be 0
```

## 3. The manifest

`src/module.ts` — a plain object importing **nothing but its type**, plus `load` holding a dynamic
import of the screen.

- `gameNames` carries the **exact string** an existing v1.1 export already wrote. Miss it and an
  imported history spawns a second game type beside the module instead of binding to it.
- `minPlayers` is at least 2: Scoreo's home screen cannot start a solo match, and the v1.1 contract
  needs two entries in `ranking`. Advertising 1 offers a game the host can never launch.

## 4. The screen

Conforms to `ScoringModuleScreenProps`, MVI like every Scoreo screen: a pure reducer in
`src/ui/module/`, a component that dispatches.

- Players come from `host.getPlayers()` — store ids, never names.
- **The turn in progress goes through `host.saveDraft`/`loadDraft`.** This is what the trio exists
  for: 1000 Sabords' Kotlin ancestor kept its dice in module-level `var`s and a reload threw away
  the hand a player had just counted out.
- Keep no mutable aggregate in the state. Store the event log and derive the aggregate — an aggregate
  in the state makes the reducer's output depend on who else holds a reference.
- The result goes back through `host.saveMatch`, and must satisfy `assertRoundsSumToRanking`.

## 5. The styles — the leak trap, both ways

Every rule scoped under `.module-<moduleId>`, **and** every class prefixed (`ms-`, `tv-`).

Scoping protects the host from the module. It does **nothing** in the other direction: Scoreo's
`theme.css` styles plain `.card` and `.empty`, and a module reusing those names inherits whatever it
does not itself declare. Torī Valley did exactly that, and every player card was laid out in a row
on the deployed site for 35 hours (#331 → #348) before anything could see it: no static check knew,
and the visual suite was still photographing the module's own standalone shell.

`scripts/check-module-styles.mjs` fails on either breach, and runs in CI.

## 6. Registration

`apps/scoreo/src/modules/registry.ts` — the only file in Scoreo that names a module — plus the
workspace dependency in `apps/scoreo/package.json`, then `pnpm install`.

Until both are done the screen is reachable by no route at all, and every test still passes.

## 7. The guards to extend

A new module is a **row in an existing table**, not a new test:

- `apps/scoreo/e2e/module-style-isolation.spec.ts` — one entry: how to reach the screen, and a
  surface of the module's whose colour must not be the host's.
- `apps/scoreo/tests/visual/` — one spec plus baselines, recorded **in the container**
  (`pnpm --filter scoreo test:visual:container --update-snapshots`), never on your own machine.
  Read `doc/technical/visual-testing.md` first; two traps live there:
  - a fixture match id must be a **real UUID**, or `migrateMatches` rewrites it, the module finds no
    match, and it opens an empty grid that photographs perfectly plausibly;
  - wait on an **exact** restored value before capturing, never a loose `\d+`, for the same reason.

## 8. The documentation

`packages/module-<game>/doc/` — the game's rules, its guide, its resources, its technical notes.
A module carries its own doc; the workspace's `doc/` keeps what belongs to the repository. Then one
row in `doc/reference.md`.

## Done when

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, the e2e suite and the visual suite are
green, the module's domain is absent from the host's main bundle, and the target scenario works end
to end: home → players → new match → the game → score → the match is in Scoreo's history, and
reopening it comes back on the module with its grid restored.
