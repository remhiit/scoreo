# Module contract

A **module** is the score-entry grid and the rules of one Scoreo game. The game is an ordinary
`GameType`, the matches it scores are ordinary `Match`es — in the history, the statistics, the Hall
of Fame, the export and the Drive sync like any other — and the module reads and writes them in
Scoreo's own models. What a module adds is what a generic grid cannot know: how this game counts,
breaks ties, and lays out a turn.

Three rules sum it up:

1. **The rules of the game are the manifest's.** A game bound to a module takes its win condition,
   tie-break and player range from the module's manifest, nowhere else (§ _The rules come from the
   manifest_).
2. **A module speaks `shared-domain`.** It reads `Player`s and the `GameType`, and hands back the
   fields of a `Match` (§ _What a module hands back_).
3. **One grid per game.** A game bound to a module is scored on the module's grid, never on the
   generic one (§ _One grid per game_).

Two packages hold the types:

| Package                                                  | Role                                                                                                                                                                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`packages/shared-domain`](../../packages/shared-domain) | Scoreo's models, one definition for the whole workspace: `Player`, `GameType`, `Match`, `PlayerScore` (types, pure functions and zod schemas), the enums, `newId()`, `isUuid()`, `Result`. |
| [`packages/module-api`](../../packages/module-api)       | What a module declares (`ScoringModuleManifest`), what its screen receives (`ScoringModuleScreenProps`, `ModuleHost`) and what it hands back (`ModuleMatch`). Types only, no runtime code. |

`shared-domain` depends on `zod` only. The repository ports, the use cases and `MatchDraft` stay in
the app: a module never needs them, since everything it writes goes through the five calls of
`ModuleHost`.

## What a module declares — `ScoringModuleManifest`

```ts
interface ScoringModuleManifest {
  moduleId: string // stable forever, never derived from a name
  displayName: string
  gameNames: readonly string[] // names of the game, matched once at first binding
  winCondition: 'HIGHEST_SCORE' | 'LOWEST_SCORE' | 'MANUAL'
  minPlayers: number
  maxPlayers: number
  dataVersion: number // version of the moduleData payload
}
```

The manifest is loaded eagerly — a few hundred bytes, enough for Scoreo to list the game — while the
screen behind `ScoringModule.load()` is a thunk, so a module nobody opens costs zero bytes.

`moduleId` is what a `GameType` gets stamped with once bound. `gameNames` only serves the _first_
binding, typically against a game a v1.1 import already created; renaming the game afterwards
changes nothing.

`winCondition`, `minPlayers` and `maxPlayers` are the game's rules, and `registry.test.ts` freezes
them for every module with hard-coded values: changing a manifest rewrites retroactively how the
whole history of that game is read, so it must be a deliberate edit of that test too.

## What the screen receives — `ScoringModuleScreenProps` and `ModuleHost`

```ts
interface ScoringModuleScreenProps {
  host: ModuleHost
  playerIds: readonly string[] // new game: picking order; reopening: ranking order
  editing?: { matchId: string; version: number; data: unknown }
  onExit: () => void
}

interface ModuleHost {
  getPlayers(): readonly Player[] // every player, retired ones included
  readonly gameType: GameType // the game this match is scored for, with the manifest's rules
  saveMatch(match: ModuleMatch): string // returns the match id; throws if the invariant refuses it
  loadDraft(): unknown | undefined // the draft slot, if it holds this module's game
  saveDraft(state: unknown): void
  clearDraft(): void
}
```

`ModuleHost` is the grid's whole access to Scoreo's data: the players, the game, saving the match and
the draft. A module has no repository and no storage key of its own.

`editing` carries back the `moduleData` of a match being reopened; passing its `matchId` back as
`ModuleMatch.id` into `saveMatch` updates that match instead of duplicating it. `onExit` returns to
Scoreo, whether or not anything was saved.

On a new game, `playerIds` arrives in the order the players were picked — the order a draft was
written with. On a reopened match it does **not** carry the seating: it is the `Match.playerScores`
ids, in the order the module's own `ModuleMatch.playerScores` stored them — sorted by rank in every
module today. A module that keeps the seating in its `moduleData` must compare the **set** of players
when reading `editing.data` and restore its own order from the payload; an order-sensitive check
would discard the match whenever its winner was not seated first. Skyjo and 1000 Sabords do this;
Torī Valley reads `editing.data` without comparing players at all.

## What a module hands back — `ModuleMatch`

```ts
interface ModuleMatch {
  id?: string // set to update, absent to create
  date?: number // epoch ms; absent: the existing match's date, else now()
  playerScores: PlayerScore[] // { playerId, score } — the final scores, in the order stored
  rounds: PlayerScore[][] // one entry per round; [] for a game without round detail
  manualWinners: string[] // the module's own winners; several on a tie at the first place
  moduleData: { version: number; data: unknown } | null // opaque, stored and handed back verbatim
}
```

These are the fields of a `Match` only the module can fill in. Scoreo sets the rest itself: `id`
(new when absent), `date`, `gameTypeId`, `secondaryPlayerScores: []` and `moduleData.moduleId`. The
stored shape of `Match` is the same as for any other game.

The winners are the module's own: it knows its game's tie-breaks (Torī Valley settles a tie on the
Torī count, then the Pinceau), so they are stored as handed back, not recomputed from the scores.
That is why a module-bound game's tie-break rule is `MANUAL_SELECTION` (§ _The rules come from the
manifest_).

`moduleData` is what makes a match re-openable on the module's grid. It is stored next to the match
without ever being read outside the module; `version` belongs to the module, which is the only side
able to migrate the payload. The `moduleId` stamped on it means a payload is never handed to the
wrong module: reopening a match scored by another one starts a fresh grid.

### The invariant — `assertMatchConsistent`

A match that contradicts itself or its game's rules is a scoring bug, and storing it would leave a
history that disagrees with its own total. `assertMatchConsistent(match, gameType)`
(`packages/shared-domain/src/matchConsistency.ts`) throws on:

- a player listed twice in `playerScores`, or twice in one round;
- a round scoring a player who is not in `playerScores` — otherwise that score would vanish silently;
- a `manualWinners` entry who is not in `playerScores`;
- round detail whose `roundDetailStatus` is `inconsistent` under the game's rules, then — stricter —
  `playerScores` that are not what the game's scoring mode derives from the rounds
  (`scoresFromRounds`: the points sum, or the count of rounds won in `ROUNDS_WON`).

A match with `rounds: []` is accepted: round detail is optional and totals on their own contradict
nothing.

This is the executable form of the rule `ImportMatchesUseCase` already applies to a v1.1 file before
accepting a game. `saveMatch` runs it **before** writing — on a refusal it throws, nothing is
written and the draft is kept — and a module's own tests run it on what the module builds.

## The draft — one slot for every game

A game in progress lives in Scoreo's single draft slot, `scoreo_match_draft`, shared with the generic
grid: starting any game replaces the draft of another (#610). A module's turn state goes into
`MatchDraft.moduleState`, an opaque `{ moduleId, state }` that Scoreo stores without reading — the
generic grid's `rounds` of typed strings could not hold 1000 Sabords' dice, events and current turn,
which must survive a page reload.

- `loadDraft()` returns the state only when the slot belongs to this module and this game type, and
  `undefined` otherwise.
- `clearDraft()` and a successful `saveMatch` clear the slot if it is this module's.
- While `editing` is set, a module neither writes nor clears the draft: the match is already saved,
  and the slot belongs to the new game that may be in progress.
- The Home "Resume match" banner reopens the module's grid for such a draft while the module is
  registered.

The per-module `scoreo_module_draft_<moduleId>` keys of earlier versions are erased at startup (#611).

## The rules come from the manifest

The manifest is the **only source** of the rules of a game bound to a registered module (`moduleId`
found by `findManifest`). They are resolved at read time, without rewriting any stored data. The
resolution itself is pure domain: `applyModuleRules(gameType, manifest)`
(`apps/scoreo/src/domain/model/gameType.ts`) returns the game type with the manifest's
`winCondition`, `minPlayers` and `maxPlayers`, `scoringMode: 'POINTS'` (every module counts points)
and `tieBreakRule: 'MANUAL_SELECTION'` — the module's `manualWinners`, which `getWinners` returns on
a tie for the lead. A game without `moduleId`, or whose module is no longer registered (`manifest`
undefined), is returned as is (same reference) and is an ordinary game again.
`withModuleRules(gameType, manifest?)` (`apps/scoreo/src/modules/withModuleRules.ts`) is the host's
wrapper: it defaults `manifest` to the registry's `findManifest` and delegates to `applyModuleRules`.

`ModuleRulesGameTypeRepository` decorates `GameTypeRepository` with it (`getAll`, `findById`). Its
writes keep the rules the game had stored: re-saving a game bound to a registered module (renaming,
archiving, merging into it, binding a homonym) writes its other fields but leaves its stored
`winCondition`, `scoringMode`, `tieBreakRule`, `minPlayers` and `maxPlayers` untouched, so the
user's original rules come back if the module is ever unregistered, and Drive never propagates an
overwrite. A game not stored yet (created by `BindModuleUseCase`) is written as is.
`createServices` hands the decorator to every use case **except `SyncUseCase`**, which keeps the raw
repository so what Drive compares and uploads does not change.

The rules therefore cannot diverge:

- `UpdateGameTypeUseCase` throws a `ValidationError` (nothing written) when `winCondition`,
  `scoringMode`, `tieBreakRule`, `minPlayers` or `maxPlayers` of such a game differ from the
  manifest's; name and archiving stay editable. That use case lives in `application/`, which never
  imports `src/modules/` (an ESLint `no-restricted-imports` rule enforces it, tests included): it
  receives the lookup at construction, `findManifest: (moduleId) => ScoringModuleManifest | undefined`
  — `App.tsx` passes the registry's, tests pass a manifest of their own — and calls it only for a
  game with a `moduleId`, then compares with `applyModuleRules`. A lookup returning `undefined`
  (module removed from the registry) leaves the game editable.
- The **Games** screen shows those rules read-only, with no **Edit** (`isModuleGame`, the same
  condition as `withModuleRules`; see `doc/functional/features/games.md`).
- Merging game types (`MergeGameTypesUseCase`) refuses with a `ValidationError`, before writing
  anything, to fold a module-bound duplicate into a game bound to anything else, and — when the kept
  game is bound to a module — any moved match that, rescored under its resolved rules, fails
  `assertMatchConsistent` (a rounds-won match without round detail cannot be turned back into
  points). The Games screen shows the refusal through its usual merge error (`mergeFailed`), with a
  translated reason.

## Binding a game to its module

Nothing is materialized when the app starts: a fresh profile has no game types at all. A module's
game becomes a real `GameType` the first time someone plays it, through `BindModuleUseCase`:

1. a `GameType` already carries this `moduleId` → reuse it, whatever its name has become;
2. otherwise a `GameType`'s name matches one the manifest claims (case-insensitive, ignoring
   surrounding blanks) → stamp the `moduleId` onto it — the common case for a history a v1.1 import
   already created;
3. otherwise create the `GameType` now, from the manifest.

Rule 1 makes the whole thing idempotent, and both reuse paths un-archive the game: playing a game is
asking for it back.

Rule 2 stores the `moduleId` but, through the decorator, keeps the homonym's stored rules and does
not recompute its matches. That is why it only takes a homonym whose effective scoring mode is
`POINTS` and whose every match passes `assertMatchConsistent` under the module's rules; a refused
homonym stays an ordinary game and rule 3 creates the bound one. Rule 2 takes the first name match
of `getAll(true)`, archived games included.

Rules 1 and 2 live in one pure function, `resolveBindingTarget(manifest, allGameTypes, matches)`
(exported from `bindModuleUseCase.ts`, with the name match `manifestClaimsGameName`): `invoke()`
decides with it, and the game selection modal calls it too, so the game it launches the module on
is, by construction, the one the binding will pick.

The game selection modal lists every registered module as a game — after the existing game types,
sorted by `gameNames[0]` — unless `resolveBindingTarget` resolves to a `GameType` that is either
bound to it (rule 1, active or archived) or an **active** one matched by name (rule 2): that game
then stands for the module. When rule 2 lands on an archived homonym, the module entry stays listed
so the game remains reachable, and launching it binds and reactivates that archived game. With
several homonyms, the launch is only offered on the one rule 2 would bind. The **Games** screen
lists only real `GameType`s, so a module never played does not appear there.

The `moduleId` never leaves the installation: it is absent from the v1.1 export, which travels to
other installations where module ids mean nothing. `ImportMatchesUseCase` compensates by consulting
the manifests after a failed name lookup, so a game bound to a module and then renamed is not
imported a second time under its old name. The v1.1 JSON format stays the contract for exchanging
matches **by file**, with any installation.

## One grid per game

A game bound to a module has **one grid, the module's**: the game selection modal offers a single
**Start match** button that goes through `BindModuleUseCase` and opens the module's grid — disabled,
with the manifest's player range shown, when the selected players fall outside
`[minPlayers, maxPlayers]`, never redirected to the generic grid. The generic grid remains only for
reopening a match without `moduleData` for that module (a v1.1 import, or a match entered before
the binding), and for the `#/score/…` routes (generic drafts, hand-typed URLs).

## Scoring a match on the module's grid

`#/module/<moduleId>/<gameTypeId>/<ids>[/<matchId>]` is the module's route. `ModuleScoreScreen`
resolves the module from the registry, reads the `GameType` from the repository, builds a
`ModuleHostAdapter` bound to that module and game, and renders the module's screen behind
`React.lazy` + `Suspense` + an error boundary — a module that fails to load, or throws, must not
take Scoreo down with it. A game type that no longer exists shows `modules.unknownGameType`
instead of the grid.

The route is rendered full-screen: `AppShell` (`apps/scoreo/src/App.tsx`) skips the `ScreenTemplate`
header (`AppHeader`) on `ModuleScore` and renders `ModuleScoreScreen` inside the design system's
`ImmersiveTemplate` instead of the capped-width `ScreenTemplate` column. During a game, Scoreo's
back arrow, title and burger menu would only duplicate the exit a grid already needs; every other
route keeps that chrome unchanged. `.sc-immersive` carries `padding-top: env(safe-area-inset-top)`,
the one thing the header was absorbing for this route.

In its place, `ModuleScoreScreen` renders the `ImmersiveTemplate` bar (a `banner`) — the manifest's
`displayName` and a ✕, nothing else — as a sibling of the `React.lazy` + `Suspense` +
error-boundary tree, never a child of it: a module that fails to load, throws while rendering, or is
unknown (`findModule` finds nothing) still leaves the ✕ standing, because none of those failures can
unmount a sibling. The ✕ calls the exact same `onExit` the module itself would call — reusing
`handleExit`'s ref read, so a match saved this session is still landed on the same way (see _Landing
after exit_ below) — and carries a translated `aria-label` under `modules.exit`. This is the **one**
visible way out of a grid: `packages/module-mille-sabords` keeps only "Abandonner" (which clears the
draft; the ✕ never does). `packages/module-api` carries none of this: the bar asks nothing of the
manifest beyond `displayName`.

Re-saving a match keeps the evening it was played, not the evening it was corrected.

### Landing after exit

`onExit` stays `() => void` on the module side of the contract — a module never learns whether, or
where, saving landed it. The id travels inside Scoreo instead: `ModuleHostAdapter` takes an extra
constructor argument, `onMatchSaved?: (matchId: string) => void`, called right after
`matchRepository.save` (and before `saveMatch` returns). `ModuleScoreScreen` passes a callback that
just stashes the id in a `useRef` — not React state, since recording it must never re-render the
module screen mid-session — then wraps the module's `onExit` into the `(savedMatchId?: string) =>
void` its own `onExit` prop expects, reading the ref once, on exit. `saveMatch` only ever runs from a
module's own event handler, never synchronously during its render, so the write is always well past
render by the time it happens — one `eslint-disable-next-line react-hooks/refs` marks the spot React's
compiler-oriented lint can't verify that from.

`AppShell` (`App.tsx`) decides where that lands: a defined `savedMatchId` navigates to `History` and
sets `highlightMatchId`, a plain React state var owned by `AppShell` — never the hash, so a refresh
always shows the plain, unhighlighted history. `HistoryScreen` takes it as a `highlightMatchId` prop
and forwards `highlighted={match.id === highlightMatchId}` to that row's design-system `ListRow`
(`.sc-row--highlighted`). `AppShell` drops the highlight the next time the screen leaves
`History` for any reason other than that same module-exit navigation, so it never lingers into a
later, unrelated visit. Exiting without having saved anything this session goes to `History` when
reopening an existing match, `Home` for a new one.

## Adding a module

`.claude/skills/new-scoring-module/` is the checklist for doing it, in order, with the traps that
cost real bugs here. This section says what a module _is_; the skill says what to type.

A module is a package under `packages/`, and **everything about the game it counts lives in that
package** — its source, its game pieces, its tests, and its documentation under
`packages/module-<game>/doc/`: rules, user guide, resources, technical notes. The workspace's own
`doc/` keeps what belongs to the repository as a whole. A module you delete takes its documentation
with it.

`apps/scoreo/src/modules/registry.ts` is the only file in Scoreo that names a module. Removing one
means deleting its folder, one import, one array entry, the row of `registry.test.ts`, then
`pnpm install`.

`MODULES` holds the full entries and `MODULE_MANIFESTS` derives from them, which is all most of the
app needs. A manifest must stay a plain object importing nothing but its type — Scoreo reads it
eagerly, so anything it pulled in would end up in the main bundle. The screen behind `load` becomes
its own chunk, and a module's strings join Scoreo's i18next instance when that chunk loads.

The same rule reaches one file further out: **a module package's entry point exports its manifest and
its module, and nothing else.** The registry imports that entry point eagerly, so whatever it
re-exports is reachable from the main graph — 1000 Sabords re-exported its domain there for a while
and 8 kB of scoring rules rode into `index.js`, chunk or no chunk. The module's own code reaches its
domain by relative path; a build is the check (`grep` the main bundle for a string only the module
has).

## A module wears Scoreo's look

A module adopts **Scoreo's identity**: it wears the flavor and accent the user picked, not a palette
of its own. Its screen **composes `@scoreboards/design-system`** the way the rest of the app does —
no `className`, no `style`, no `lucide-react` import, only the system's components and `<Icon />` —
and the design system's **semantic** tokens (`--surface-*`, `--text-*`, `--color-*`, `--space-*`,
`--radius-*`) are the only values it reads. `@scoreboards/design-system` is a `workspace:*` dependency
of every module package. The design system sets nothing on a module's bare elements beyond its reset:
a title is a `Panel`, a `Dialog` or a `Text` role, never a bare `h1`/`h2` counting on a default.

### Game pieces live in `src/design/`

Not everything a game draws belongs in the design system: a die face, a card, a score cell exist for
one game only. Those pieces live in the module's **`src/design/`** folder — the one place in a module
where `className` and CSS may be written. `src/design/` lifts the `className` rule and nothing
else: no inline `style` there either, and icons still come through `<Icon />`, never a `lucide-react`
import. Its CSS follows three rules:

- every rule scoped under `.module-<moduleId>`, carried by the module's root;
- every class prefixed with the module's own prefix (`ms-` for 1000 Sabords, `tv-` for Torī Valley,
  `sj-` for Skyjo, `f7-` for Flip 7), never `sc-`;
- only the design system's semantic tokens — never a `var(--ctp-*)` palette token, never a raw
  colour (hex, `rgb()`/`rgba()`, `hsl()`/`hsla()`), never a raw value equal to a token.

**A component two modules need moves into the design system.** The second module to want a piece is
the signal: it is promoted (renamed `sc-`, with its CSS and test, in the right atomic layer) and both
modules compose it from there. `src/design/` holds what is specific to one game, never a component
waiting to be shared.

**The root wrapper is a game piece too.** The element carrying `.module-<moduleId>` sets a
`className`, so it lives in `src/design/` (e.g.
`src/design/ModuleRoot.tsx`, rendering `<div className="module-<moduleId>">{children}</div>`), and the
screen under `src/ui/` composes it — never writes the class itself, which the lint rule refuses
outside `src/design/`.

### The border, both ways

The CSS a module still writes must never escape it. A bare `:root`, or a bare element selector like
`input` or `label`, applies to the whole document — and a stylesheet is never unloaded on navigation,
so the leak follows the player for the rest of the session. Hence the scope.

Scoping runs **one way**: it keeps the module's CSS out of the rest of the app; nothing keeps the
app's CSS out of the module. A class name the two happen to share is settled property by property —
Scoreo's old `theme.css` styled plain `.card` and `.empty`, and Torī Valley shipped for a while with
every player card laid out in a row because its own `.module-tori-valley .card` never declared
`display`. Hence the prefix. The scope and the prefix guard opposite directions of the same border;
only the pair holds it.

### What enforces it

- `eslint.config.js` — the app's `className`/`style`/`lucide-react` rules apply to every
  `packages/module-*/src/**` (`module-api` aside), component tests (`*.test.tsx`) aside; in
  `src/design/**` only the `className` rule is lifted — `style` and `lucide-react` stay refused. The
  rule is a glob, not a list: a new module is held to it from its first file.
  `scripts/eslint-config.test.mjs` proves each case.
- `scripts/check-module-styles.mjs` — every `src/design/**/*.css` must be scoped under
  `.module-<moduleId>` and share no class name with the design system, and must use no
  `var(--ctp-…)` palette token and no raw colour. Raw colours covered: hex, `rgb()`/`rgba()`,
  `hsl()`/`hsla()`, `hwb()`, `lab()`, `lch()`, `oklab()`, `oklch()`, `color()`, and every CSS named
  colour (`white`, `red`…). `transparent`, `currentColor`, `inherit`, `initial`, `unset` and
  `revert` stay permitted. Only declaration values are read, word by word: a name that is part of
  an identifier (`--a-red-shadow`, `var(--sc-white-ish)`), a string and a `url(#…)` reference are
  never flagged. Runs in CI.
- `scripts/check-design-tokens.mjs` — a raw px/duration/easing value equal to a token fails in
  `src/design/**/*.css` exactly as in the design system.
- `apps/scoreo/e2e/module-style-isolation.spec.ts` — a table of every registered module, so a new
  module is a row there, not a new test. For every row, the module's reference surface must wear
  Scoreo's `--surface-card`, and opening the module must leave Scoreo's own theme untouched.
- `scripts/module-packages.test.mjs` — no module package may have a legacy `src/styles.css`, and the
  e2e table (read statically) must hold one row per module package — a deliberate requirement, so
  that no module ships without its style-isolation check. `scripts/module-packages.mjs` is
  also the one definition of "a module package" (`packages/module-*` but `module-api`) both CSS
  guards walk.
- What none of these can see, `apps/scoreo/tests/visual/` does: see
  [`visual-testing.md`](visual-testing.md).

Anything that must paint before scripts run belongs in `index.html`'s splash, not in a module's
stylesheet: the sheet ships inside the JS chunk, so it arrives too late.
