# Module contract

How a **scoring module** talks to the host application. Two packages hold it:

| Package                                                  | Role                                                                                                                                                                                |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`packages/module-api`](../../packages/module-api)       | The contract itself: what a module declares, what it hands back, what the host lends it. No runtime dependency — React appears only as a type-only import for the screen component. |
| [`packages/shared-domain`](../../packages/shared-domain) | The vocabulary genuinely shared by both sides: `Player`, `PlayerSchema`, `newId()`, `isUuid()`, `Result`/`ok`/`err`.                                                                |

A module is a package under `packages/` that Scoreo lists in its registry. It owns the scoring rules
of one game; the host owns the players, the storage and the navigation. Nothing crosses that line
except the types below.

## What a module hands back — `ModuleMatchResult`

```ts
interface ModuleMatchResult {
  matchId?: string // set to update, absent to create
  ranking: readonly ModuleRankingEntry[] // { playerId, score, rank }, rank 1 = winner
  rounds?: readonly ModuleRound[] // { label, scores: [{ playerId, score }] }
  playedAt?: number // epoch ms; the host stamps now() when absent
  moduleData?: { version: number; data: unknown } // opaque, stored and handed back verbatim
}
```

`rank` is the module's own: it knows its game's tie-breaks, so several entries may share a rank and
the host does not recompute them.

`moduleData` is what makes a match re-openable. The host stores it next to the match without ever
looking inside; `version` belongs to the module, which is the only side able to migrate the payload.

### The invariant — `assertRoundsSumToRanking`

Round detail that does not add up to the announced score is a scoring bug, and storing it would
leave a match whose history contradicts its own total. `assertRoundsSumToRanking(result)` throws on:

- a player whose rounds sum to something other than their ranking score (a player absent from every
  round sums to 0, which is fine only if that is also their score);
- a round scoring a player who is not in the ranking — otherwise that score would vanish silently;
- the same player twice in one ranking or twice in one round, which makes the sum meaningless.

A result carrying no `rounds` at all is accepted: round detail is optional and a ranking on its own
contradicts nothing.

This is the executable form of the rule `ImportMatchesUseCase` already applies to a v1.1 file before
accepting a game. Modules call it on the result they build; the host calls it on every result it
receives.

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
  getPlayers(): readonly ModulePlayer[] // retired players included
  saveMatch(result: ModuleMatchResult): string // returns the match id
  loadDraft(): unknown | undefined // namespaced by moduleId
  saveDraft(state: unknown): void
  clearDraft(): void
}
```

A module has no repository, no storage key and no knowledge of the host's models.

The draft trio is not convenience. _1000 Sabords_ is a game engine, not a score sheet: it carries
live turn state — dice, events, the current turn — that must survive a page reload. Scoreo's own
`MatchDraftRepository` has a single anonymous slot (`scoreo_match_draft`) and cannot hold it.
Designing this contract against Torī alone would have made it unfit the day Sabords is plugged in.

## The screen

```ts
interface ScoringModuleScreenProps {
  host: ModuleHost
  playerIds: readonly string[] // in the order the host picked them
  editing?: { matchId: string; version: number; data: unknown }
  onExit: () => void
}
```

`editing` carries back the `moduleData` of a match being reopened; passing its `matchId` into
`saveMatch` updates that match instead of duplicating it. `onExit` returns to the host, whether or
not anything was saved.

## Adding a module

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

## Binding a module to a game

Nothing is materialized when the app starts: a fresh profile has no game types at all. A module's
game becomes real the first time someone plays it, through `BindModuleUseCase`:

1. a `GameType` already carries this `moduleId` → reuse it, whatever its name has become;
2. otherwise a `GameType`'s name matches one the manifest claims → stamp the `moduleId` onto it —
   the common case for a history a v1.1 import already created;
3. otherwise create the `GameType` now, from the manifest.

Rule 1 makes the whole thing idempotent, and both reuse paths un-archive the game: playing a game is
asking for it back.

`moduleId` is a **capability flag, not a redirection** — Scoreo's own score screen stays available
for a game that has a module, which is what lets the host offer "play in Scoreo" _or_ "play on the
module".

The id never leaves the installation: it is absent from the v1.1 export, which travels to other
installations where module ids mean nothing. `ImportMatchesUseCase` compensates by consulting the
manifests after a failed name lookup, so a game bound to a module and then renamed is not imported a
second time under its old name.

## Playing on a module

`#/module/<moduleId>/<gameTypeId>/<ids>[/<matchId>]` is the module's route. `ModuleScoreScreen`
resolves the module from the registry, builds a `ModuleHostAdapter` bound to that module and game
type, and renders the module's screen behind `React.lazy` + `Suspense` + an error boundary — a module
that fails to load, or throws, must not take Scoreo down with it.

The host side never trusts blindly:

- `saveMatch` runs `assertRoundsSumToRanking` **before** writing. A self-contradicting match kept in
  the history would never be noticed again.
- `rank === 1` becomes a `manualWinner` through `rankingToMatch`, the same function the v1.1 import
  uses. The module owns tie-breaks Scoreo knows nothing about, so the winners come from the announced
  rank rather than from recomputing the top score.
- The host stamps `moduleData.moduleId` itself, so a payload is never handed back to the wrong
  module. Reopening a match scored elsewhere starts a fresh grid instead.
- Re-saving a match keeps the evening it was played, not the evening it was corrected.

Drafts live in `scoreo_module_draft_<moduleId>`, one per module.

## A module's look is its own, and stays its own

A module keeps the identity of the game it counts: Torī Valley wears its warm washi palette inside
Scoreo, not the flavor and accent the user picked for the host.

That only holds if none of it escapes. **Scope every rule of a module's stylesheet under a class of
its own** (`.module-<moduleId>`), carried by whatever the module renders. A bare `:root`, or a bare
element selector like `input` or `label`, applies to the whole document — and a stylesheet is never
unloaded on navigation, so the leak follows the player for the rest of the session.

The names collide by design: both sides speak of `--color-primary`, `--space-5`, `--radius-lg`, with
different values. `apps/scoreo/e2e/module-style-isolation.spec.ts` guards the boundary for **every**
registered module — it runs its two checks over a table of them, so a new module is a row there, not
a new test.

Anything that must paint before scripts run belongs in the module's own shell, not in the
stylesheet: the sheet ships inside the JS chunk, so it arrives too late for a splash.

## What is deliberately _not_ shared

Repository ports. Scoreo's `PlayerRepository` carries a `saveAll` that its `SyncUseCase` needs and a
module has no use for; sharing the interface would drag the host's persistence concerns into every
module. Modules go through `ModuleHost` instead.

The v1.1 JSON import format is unaffected: it stays the contract for exchanging matches **by file**,
between installations and with the outside world.
