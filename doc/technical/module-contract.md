# Module contract

How a **scoring module** talks to the host application. Two packages hold it:

| Package                                                  | Role                                                                                                                                                                                                                                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/module-api`](../../packages/module-api)       | The contract itself: what a module declares, what it hands back, what the host lends it. No runtime code — React and `shared-domain` appear only as type-only imports.                                                                  |
| [`packages/shared-domain`](../../packages/shared-domain) | The vocabulary genuinely shared by both sides: `Player`, `GameType`, `Match`, `PlayerScore` (types, pure functions and zod schemas), the `WinCondition`/`ScoringMode`/`TieBreakRule` enums, `newId()`, `isUuid()`, `Result`/`ok`/`err`. |

A module is a package under `packages/` that Scoreo lists in its registry. It owns the scoring rules
of one game; the host owns the players, the storage and the navigation. Nothing crosses that line
except the types below.

## What a module hands back — `ModuleMatch`

A module knows Scoreo's own models: it receives the host's `Player`s and the `GameType` of the
game, and hands back the fields of a `Match` (types of `@scoreboards/shared-domain`). The host only
completes the identity and checks the invariants.

```ts
interface ModuleMatch {
  id?: string // set to update, absent to create
  date?: number // epoch ms; absent: the existing match's date, else the host's now()
  playerScores: PlayerScore[] // { playerId, score } — the final scores, in the order stored
  rounds: PlayerScore[][] // one entry per round; [] for a game without round detail
  manualWinners: string[] // the module's own winners; several on a tie at the first place
  moduleData: { version: number; data: unknown } | null // opaque, stored and handed back verbatim
}
```

The winners are the module's own: it knows its game's tie-breaks (Torī Valley settles a tie on the
Torī count, then the Pinceau), so the host does not recompute them from the scores.

`moduleData` is what makes a match re-openable. The host stores it next to the match without ever
looking inside; `version` belongs to the module, which is the only side able to migrate the payload.
The host adds `moduleId` to it.

What the host sets itself: `id` (new when absent), `date`, `gameTypeId`, `secondaryPlayerScores: []`
and `moduleData.moduleId`. The stored shape of `Match` is unchanged.

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
accepting a game. The host calls it on every match it receives, before writing; a module's tests
run it on what the module builds.

## What a module declares — `ScoringModuleManifest`

```ts
interface ScoringModuleManifest {
  moduleId: string // stable forever, never derived from a name
  displayName: string
  gameNames: readonly string[] // aliases, matched once at first binding
  winCondition: 'HIGHEST_SCORE' | 'LOWEST_SCORE' | 'MANUAL'
  minPlayers: number
  maxPlayers: number
  dataVersion: number // version of the moduleData payload
}
```

The manifest is loaded eagerly — a few hundred bytes, enough for the host to list the module — while
the screen behind `ScoringModule.load()` is a thunk, so a module nobody opens costs zero bytes.

`moduleId` is what a `GameType` gets stamped with once bound. `gameNames` only serves the _first_
match, typically against a game a v1.1 import already created; renaming the game afterwards changes
nothing.

## What the host lends — `ModuleHost`

```ts
interface ModuleHost {
  getPlayers(): readonly Player[] // the host's Player, retired players included
  readonly gameType: GameType // the game this match is scored for
  saveMatch(match: ModuleMatch): string // returns the match id; throws if the invariant refuses it
  loadDraft(): unknown | undefined // the single draft slot, if it is this module's
  saveDraft(state: unknown): void
  clearDraft(): void
}
```

A module has no repository and no storage key: it reads the host's models and hands back a `ModuleMatch`.

The draft trio is not convenience. _1000 Sabords_ is a game engine, not a score sheet: it carries
live turn state — dice, events, the current turn — that must survive a page reload. Scoreo's own
`MatchDraft`'s `rounds` grid of typed strings cannot hold it, hence `MatchDraft.moduleState`, an opaque `{ moduleId, state }` the host stores without reading.
Designing this contract against Torī alone would have made it unfit the day Sabords is plugged in.

## The screen

```ts
interface ScoringModuleScreenProps {
  host: ModuleHost
  playerIds: readonly string[] // new game: picking order; reopening: ranking order
  editing?: { matchId: string; version: number; data: unknown }
  onExit: () => void
}
```

`editing` carries back the `moduleData` of a match being reopened; passing its `matchId` back as `ModuleMatch.id` into
`saveMatch` updates that match instead of duplicating it. `onExit` returns to the host, whether or
not anything was saved.

On a new game, `playerIds` arrives in the order the players were picked — the order a draft was
written with. On a reopened match it does **not** carry the seating: the host passes
`Match.playerScores` ids, in the order the module's own `ModuleMatch.playerScores` stored them —
sorted by rank in every module today. A
module that keeps the seating in its `moduleData` must compare the **set** of players when reading
`editing.data` and restore its own order from the payload; an order-sensitive check would discard the
match whenever its winner was not seated first. Skyjo and 1000 Sabords do this; Torī Valley reads
`editing.data` without comparing players at all.

While `editing` is set, a module neither writes nor clears the draft (`saveDraft`/`clearDraft`): the
match is already saved on the host's side, and the draft slot belongs to the new game that may be in
progress for the same module.

## Adding a module

`.claude/skills/new-scoring-module/` is the checklist for doing it, in order, with the traps that
cost real bugs here. This section says what a module _is_; the skill says what to type.

A module is a package, and **everything about the game it counts lives in that package** — its
source, its game pieces, its tests, and its documentation under `packages/module-<game>/doc/`: rules,
user guide, resources, technical notes. The workspace's own `doc/` keeps what belongs to the
repository as a whole. A module you delete takes its documentation with it, and nothing is left
behind describing a game nobody can play.

`apps/scoreo/src/modules/registry.ts` is the only file in Scoreo that names a module. Removing one
means deleting its folder, one import, one array entry, then `pnpm install`.

`MODULES` holds the full entries and `MODULE_MANIFESTS` derives from them, which is all most of the
app needs. A manifest must stay a plain object importing nothing but its type — the host reads it
eagerly, so anything it pulled in would end up in Scoreo's main bundle. The screen behind `load`
becomes its own chunk, and a module's strings join the host's i18next instance when that chunk loads.

The same rule reaches one file further out: **a module package's entry point exports its manifest and
its module, and nothing else.** The registry imports that entry point eagerly, so whatever it
re-exports is reachable from the host's own graph — 1000 Sabords re-exported its domain there for a
while and 8 kB of scoring rules rode into `index.js`, chunk or no chunk. The module's own code
reaches its domain by relative path; a build is the check (`grep` the main bundle for a string only
the module has).

## What is deliberately not shared

`shared-domain` holds the serialized models and their pure rules, nothing else. `MatchDraft`, `trophy`, the
errors (`ValidationError`/`NotFoundError`), the repository ports and the use cases stay in the app: they describe
how the host stores and orchestrates, not what a module needs to read. `shared-domain` depends on `zod` only, never
on React or on the app. A rule that throws one of the app's errors stays in the app
for the same reason: `assertValidPlayerRange` lives in `apps/scoreo/src/domain/model/gameType.ts`, next to the
re-export, while the pure `playerCountFitsRange` is shared.

## Binding a module to a game

Nothing is materialized when the app starts: a fresh profile has no game types at all. The game
selection modal still lists every registered module as a game — after the existing game types,
sorted by `gameNames[0]` — unless `resolveBindingTarget` resolves to a `GameType` that is either
bound to it (rule 1, active or archived) or an **active** one matched by name (rule 2,
case-insensitive, ignoring surrounding blanks): that game then stands for the module. When rule 2
lands on an archived homonym, the module entry stays listed so the module remains reachable, and
launching it binds and reactivates that archived game. The single **Start match** button opens the module's screen; it is disabled, with the
manifest's player range shown, when the selected players fall outside `[minPlayers, maxPlayers]`.
An unbound `GameType` carrying one of the module's names — typically created by a v1.1 import —
stands for the module instead: selecting it launches the module too (unless the module is
already bound to another `GameType`), which binds it through rule 2 below. Rule 2 stamps the first
name match of `getAll(true)`, archived games included, so with several homonyms the button is only
offered on that first one — on any other, it would bind and open a different game. The **Games** screen lists only
real `GameType`s, so a module never played does not appear there.

A module's game becomes real the first time someone plays it — always on the module's grid — through `BindModuleUseCase`:

1. a `GameType` already carries this `moduleId` → reuse it, whatever its name has become;
2. otherwise a `GameType`'s name matches one the manifest claims → stamp the `moduleId` onto it —
   the common case for a history a v1.1 import already created;
3. otherwise create the `GameType` now, from the manifest.

Rule 1 makes the whole thing idempotent, and both reuse paths un-archive the game: playing a game is
asking for it back.

Rules 1 and 2 live in one pure function, `resolveBindingTarget(manifest, allGameTypes)` (exported
from `bindModuleUseCase.ts`, with the name match `manifestClaimsGameName`): `invoke()` decides with
it, and the game selection modal calls it too, so the game it launches the module on is,
by construction, the one the binding will pick.

A game that has a module has **one grid, the module's**: the game selection modal offers a single
launch button that goes through `BindModuleUseCase` and opens the module screen, never the generic
grid (out of the player range it is disabled, not redirected). The generic grid remains only for
reopening a match without `moduleData` for that module, and for the routes `#/score/…` (generic
drafts, hand-typed URLs).

### Scoring mode of a module-bound game

The module is the source of truth of its game's scoring: it computes the final scores it hands back
(`ModuleHostAdapter.saveMatch` stores them as they are, after `assertMatchConsistent`), and every module counts **points** today.
So a `GameType` with `moduleId !== null` always scores in `POINTS`, whatever its stored
`scoringMode`: `effectiveScoringMode()` (`packages/shared-domain/src/gameType.ts`, re-exported by `apps/scoreo/src/domain/model/gameType.ts`) returns `POINTS` for it,
`newGameType`/`UpdateGameTypeUseCase` store `POINTS`, the game type form hides the scoring mode
choice, and none of its matches is ever recomputed into rounds won (`roundScoringChanged` sees no
change). Scoreo's generic score screen, when used on such a game, sums the rounds too. A module
declaring its own scoring mode, and Scoreo aligning on it, is tracked in #590.

Known gap: binding by name (rule 2 above) stamps a `moduleId` onto an existing game type, and
stores its effective `scoringMode` (`POINTS`), without recomputing its matches; were that game in
rounds won, its stored counts would then be read as points. Left to #590.

Known gap: merging game types (`MergeGameTypesUseCase`) never rescores a module's match — one
from a module-bound duplicate, or carrying `moduleData` — so, moved into a kept game scored in
rounds won, its points are read as rounds won (inverted winners under `LOWEST_SCORE`). The merge
is not refused: its preview sets `rulesDiffer`, so the dialog warns that winners can change.
Left to #590.

The id never leaves the installation: it is absent from the v1.1 export, which travels to other
installations where module ids mean nothing. `ImportMatchesUseCase` compensates by consulting the
manifests after a failed name lookup, so a game bound to a module and then renamed is not imported a
second time under its old name.

## Playing on a module

`#/module/<moduleId>/<gameTypeId>/<ids>[/<matchId>]` is the module's route. `ModuleScoreScreen`
resolves the module from the registry, builds a `ModuleHostAdapter` bound to that module and game
type, and renders the module's screen behind `React.lazy` + `Suspense` + an error boundary — a module
that fails to load, or throws, must not take Scoreo down with it.

The route is rendered full-screen: `AppShell` (`apps/scoreo/src/App.tsx`) skips the `ScreenTemplate`
header (`AppHeader`) entirely on `ModuleScore` and renders `ModuleScoreScreen` inside the design
system's `ImmersiveTemplate` instead of the capped-width `ScreenTemplate` column. During a game the
host's back arrow, title and burger menu would only duplicate the exit a module already draws itself;
every other route keeps that chrome unchanged. `.sc-immersive` carries
`padding-top: env(safe-area-inset-top)`, the one thing the header was absorbing for this route.

In its place, `ModuleScoreScreen` renders the `ImmersiveTemplate` bar (a `banner`) — the manifest's `displayName`
and a ✕, nothing else — as a sibling of the `React.lazy` + `Suspense` + error-boundary tree, never a
child of it: a module that fails to load, throws while rendering, or is unknown (`findModule` finds
nothing) still leaves the ✕ standing, because none of those failures can unmount a sibling. The ✕
calls the exact same `onExit` the module itself would call — reusing `handleExit`'s ref read, so a
match saved this session is still landed on the same way (see _Landing after exit_ below) — and
carries a translated `aria-label` under `modules.exit`. This is the **one** visible way out of a
module: `packages/module-mille-sabords` no longer draws its own "⏸ Quitter" now that the bar makes it
redundant, keeping only "🗑 Abandonner" (which the bar does not replace — it clears the draft, the
✕ never does). `packages/module-api` carries none of this: the bar is generic, asks nothing of the
manifest beyond `displayName`, and no member was added to `ScoringModuleScreenProps` or `ModuleHost`.

The host side never trusts blindly:

- `saveMatch` runs `assertMatchConsistent` **before** writing. A self-contradicting match kept in
  the history would never be noticed again; on a refusal it throws, nothing is written and the
  draft is kept.
- The winners are the module's `manualWinners`, stored as they are. The module owns tie-breaks
  Scoreo knows nothing about. (`rankingToMatch` now serves the v1.1 import only.)
- `ModuleScoreScreen` reads the `GameType` from the repository and hands it to the adapter (and so
  to `host.gameType`); a game type that no longer exists shows `modules.unknownGameType` instead of
  the module, the bar's ✕ still standing.
- The host stamps `moduleData.moduleId` itself, so a payload is never handed back to the wrong
  module. Reopening a match scored elsewhere starts a fresh grid instead.
- Re-saving a match keeps the evening it was played, not the evening it was corrected.

Drafts live in the single `scoreo_match_draft` slot (`MatchDraft.moduleState`, issue #610), shared with
the generic grid: starting any game replaces the draft of another. `loadDraft()` returns the state only
when the slot belongs to this module and this game type, and `undefined` otherwise (the legacy
`scoreo_module_draft_<moduleId>` keys are erased at startup, #611).
`clearDraft()` and `saveMatch` clear the slot if it is this module's. The Home
"Resume match" banner reopens the module screen for such a draft while the module is registered.

### Landing after exit

`onExit` stays `() => void` on the module side of the contract — a module never learns whether, or
where, saving landed it. The id travels host code to host code instead: `ModuleHostAdapter` takes an
extra constructor argument, `onMatchSaved?: (matchId: string) => void`, called right after
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
later, unrelated visit. Exiting without having saved anything this session keeps the pre-#390
behaviour: `History` when reopening an existing match, `Home` for a new one.

## A module wears Scoreo's look

A module adopts **Scoreo's identity**: inside the app it wears the flavor and accent the user picked,
not a palette of its own. Its screen **composes `@scoreboards/design-system`** the way the host does —
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

Scoping runs **one way**: it keeps the module out of the host; nothing keeps the host out of the
module. A class name the two happen to share is settled property by property — Scoreo's old
`theme.css` styled plain `.card` and `.empty`, and Torī Valley shipped for a while with every player
card laid out in a row because its own `.module-tori-valley .card` never declared `display`. Hence the
prefix. The scope and the prefix guard opposite directions of the same border; only the pair holds it.

### What enforces it

- `eslint.config.js` — the host's `className`/`style`/`lucide-react` rules apply to every
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
  module is a row there, not a new test. For every row, the module's reference surface must wear the
  host's `--surface-card`, and opening the module must leave Scoreo's own theme untouched.
- `scripts/module-packages.test.mjs` — no module package may have a legacy `src/styles.css`, and the
  e2e table (read statically) must hold one row per module package — a deliberate requirement, so
  that no module ships without its style-isolation check. `scripts/module-packages.mjs` is
  also the one definition of "a module package" (`packages/module-*` but `module-api`) both CSS
  guards walk.
- What none of these can see, `apps/scoreo/tests/visual/` does: see
  [`visual-testing.md`](visual-testing.md).

Anything that must paint before scripts run belongs in the module's own shell, not in a stylesheet:
the sheet ships inside the JS chunk, so it arrives too late for a splash.

## What is deliberately _not_ shared

Repository ports. Scoreo's `PlayerRepository` carries a `saveAll` that its `SyncUseCase` needs and a
module has no use for; sharing the interface would drag the host's persistence concerns into every
module. Modules go through `ModuleHost` instead.

The v1.1 JSON import format is unaffected: it stays the contract for exchanging matches **by file**,
between installations and with the outside world.
