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

The registry currently holds manifests (`MODULE_MANIFESTS`); it gains the matching `load` thunks when
the module screen lands. A manifest must stay a plain object importing nothing but its type — the
host reads it eagerly, so anything it pulled in would end up in Scoreo's main bundle.

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

## What is deliberately _not_ shared

Repository ports. Scoreo's `PlayerRepository` carries a `saveAll` that its `SyncUseCase` needs and a
module has no use for; sharing the interface would drag the host's persistence concerns into every
module. Modules go through `ModuleHost` instead.

The v1.1 JSON import format is unaffected: it stays the contract for exchanging matches **by file**,
between installations and with the outside world.
