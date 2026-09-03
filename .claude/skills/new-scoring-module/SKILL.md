---
name: new-scoring-module
description: Add a new scoring module to Scoreo — the package, the manifest, the screen, the styles, the registration and the guards to extend. Use when a new board game gets its own point counter inside Scoreo, or when reviewing whether an existing module respects the contract. Encodes the traps that cost real bugs in tori-valley and mille-sabords.
---

# Adding a scoring module

## Objectif

A module is a package under `packages/` that owns one game's scoring rules
and screen. Scoreo owns everything around it: players, history, statistics,
export, theme, storage. This skill does not restate the contract — the
contract is `doc/technical/module-contract.md`, **read it first.** What
follows is the order of operations, and the traps that are invisible until
they bite. It invokes no autonomous routine — it runs in-session, whenever a
new game gets its own point counter, or when reviewing whether an existing
module respects the contract.

## Entrées requises

Which game is being added (or which existing module is under review), and
`doc/technical/module-contract.md` already read. There is no triggering
issue/PR assumed — this is an in-session skill invoked directly, not a
routine.

## Préconditions

None beyond having read the contract above. This skill is not
GitHub-triggered, so it has neither a "which issue/PR" rule nor a "claim the
run" step (`doc/automation/skill-contract.md` §1.4).

## Procédure

### 1. The package

`packages/module-<game>/`, modelled on the two that exist:

- `package.json` — **no `build` script, no `vite` dependency.** A module builds nothing: Scoreo
  bundles it. Scripts are `test`, `test:watch`, `typecheck`.
- `vitest.config.ts` — declares `@vitejs/plugin-react` itself; there is no `vite.config.ts` to extend.
- A tsconfig. The two existing modules differ — `module-mille-sabords` has a single
  `tsconfig.json`, `module-tori-valley` splits `src` and `vitest.config.ts` into project references —
  and neither is wrong. Copy whichever neighbour you are closest to.
- `src/styles.d.ts` — `declare module '*.css'`. Without `vite/client` types, the stylesheet import
  fails to type-check.

### 2. The entry point — the bundle trap

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

### 3. The manifest

`src/module.ts` — a plain object importing **nothing but its type**, plus `load` holding a dynamic
import of the screen.

- `gameNames` carries the **exact string** an existing v1.1 export already wrote. Miss it and an
  imported history spawns a second game type beside the module instead of binding to it.
- `minPlayers` is at least 2: Scoreo's home screen cannot start a solo match, and the v1.1 contract
  needs two entries in `ranking`. Advertising 1 offers a game the host can never launch.

### 4. The screen

Conforms to `ScoringModuleScreenProps`, MVI like every Scoreo screen: a pure reducer in
`src/ui/module/`, a component that dispatches.

- Players come from `host.getPlayers()` — store ids, never names.
- **The turn in progress goes through `host.saveDraft`/`loadDraft`.** This is what the trio exists
  for: 1000 Sabords' Kotlin ancestor kept its dice in module-level `var`s and a reload threw away
  the hand a player had just counted out.
- Keep no mutable aggregate in the state. Store the event log and derive the aggregate — an aggregate
  in the state makes the reducer's output depend on who else holds a reference.
- The result goes back through `host.saveMatch`, and must satisfy `assertRoundsSumToRanking`.

### 5. The styles — the leak trap, both ways

Every rule scoped under `.module-<moduleId>`, **and** every class prefixed (`ms-`, `tv-`).

Scoping protects the host from the module. It does **nothing** in the other direction: Scoreo's
`theme.css` styles plain `.card` and `.empty`, and a module reusing those names inherits whatever it
does not itself declare. Torī Valley did exactly that, and every player card was laid out in a row
on the deployed site for 35 hours (#331 → #348) before anything could see it: no static check knew,
and the visual suite was still photographing the module's own standalone shell.

`scripts/check-module-styles.mjs` fails on either breach, and runs in CI.

### 6. Registration

`apps/scoreo/src/modules/registry.ts` — the only file in Scoreo that names a module — plus the
workspace dependency in `apps/scoreo/package.json`, then `pnpm install`.

Until both are done the screen is reachable by no route at all, and every test still passes.

### 7. The guards to extend

A new module is a **row in an existing table**, not a new test:

- `apps/scoreo/e2e/module-style-isolation.spec.ts` — one entry: how to reach the screen, and a
  surface of the module's whose colour must not be the host's.
- `apps/scoreo/tests/visual/` — one spec plus baselines, recorded **in the container**
  (`pnpm --filter scoreo test:visual:container --update-snapshots`), never on your own machine.
  Read `doc/technical/visual-testing.md` first; two traps live there:
  - a fixture match id must be a **real UUID**, or `migrateMatches` rewrites it, the module finds no
    match, and it opens an empty grid that photographs perfectly plausibly;
  - wait on an **exact** restored value before capturing, never a loose `\d+`, for the same reason.

### 8. The documentation

`packages/module-<game>/doc/` — the game's rules, its guide, its resources, its technical notes.
A module carries its own doc; the workspace's `doc/` keeps what belongs to the repository. Then one
row in `doc/reference.md`.

## Sorties obligatoires

- `packages/module-<game>/` created per steps 1–2 (`package.json` without a
  `build` script or `vite` dependency, `vitest.config.ts`, a tsconfig,
  `src/styles.d.ts`, `src/index.ts` exporting only the manifest and module).
- `src/module.ts` manifest and a `src/ui/module/` reducer + screen conforming
  to `ScoringModuleScreenProps` (step 3–4).
- Styles scoped under `.module-<moduleId>` with prefixed classes (step 5).
- The module registered in `apps/scoreo/src/modules/registry.ts` and the
  workspace dependency added to `apps/scoreo/package.json` (step 6).
- `apps/scoreo/e2e/module-style-isolation.spec.ts` and
  `apps/scoreo/tests/visual/` each carry a new entry/spec with baselines
  recorded in the container (step 7).
- `packages/module-<game>/doc/` populated and one row added to
  `doc/reference.md` (step 8).

## Contrôles

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, the e2e suite and
the visual suite are all green; the module's domain is absent from the
host's main bundle, verified with the build-and-grep of step 2 (not by
reading); `scripts/check-module-styles.mjs` passes; and the target scenario
works end to end: home → players → new match → the game → score → the match
is in Scoreo's history, and reopening it comes back on the module with its
grid restored.

## Escalade

Per `doc/automation/skill-contract.md` §3 — in particular, a scope mismatch
discovered mid-work (e.g. the target game doesn't fit the two-tsconfig
precedents, or the contract in `doc/technical/module-contract.md` doesn't
cover a case this game needs) is grounds to stop and ask rather than
improvising a new pattern silently.

## Limites

- `src/index.ts` exports only the manifest and the module, nothing else
  (step 2's bundle trap).
- Every style rule is scoped under `.module-<moduleId>` and every class is
  prefixed — never reuses a host class name like `.card`/`.empty` (step 5's
  leak trap).
- `apps/scoreo/src/modules/registry.ts` is the only file in Scoreo allowed
  to name a module.
- Never skips recording visual baselines in the container in favor of a
  local run (step 7).
