# Skyjo — architecture

Scoring module for Skyjo, loaded by Scoreo. MVI-style (reducer/action/state), the same pattern
every other screen in the workspace follows. No port, no adapter, no storage of its own: the module
owns the game's rules and its one screen; everything persisted goes through `ModuleHost` — see the
workspace's `doc/technical/module-contract.md`.

## Why a counter, not a simulator

Skyjo is played with physical cards. A digital grid — flip animation, column-clearing, the deck —
would duplicate a UI the players already have on the table and add a second source of truth that
must agree with the real cards. The module instead takes exactly what a physical scorer app needs:
the total each player reveals, entered once per round. This mirrors how 1000 Sabords' *manual* tab
already works (a typed total, not a simulated shake of the dice), just without that module's
*additional* calculator tab — Skyjo has no equivalent to compute from.

## Layout

| Folder                | Content                                                                 |
| ---------------------- | ------------------------------------------------------------------------ |
| `src/domain/round.ts`  | `SkyjoRound`/`SkyjoRoundEntry`, the doubling rule (`appliedRoundScores`), running totals (`cumulativeTotals`), the end-of-game check (`isGameOver`), the `END_THRESHOLD` constant |
| `src/domain/moduleResult.ts` | `SkyjoModuleData` (the persisted shape), ranking (`buildRanking`), and `toModuleMatch` — the single place that builds what goes back to the host |
| `src/ui/module/`       | `skyjoModuleTypes.ts` (state/actions/draft schema), `skyjoModuleReducer.ts` (pure reducer + draft/restore helpers), `SkyjoModuleScreen.tsx` (the one screen) |
| `src/module.ts`        | The manifest and the lazily-loaded module — the only things Scoreo imports |
| `src/design/`          | The game pieces with no design-system equivalent (`ModuleRoot`, `SkyjoTable`, `SkyjoWinner`) and their CSS. Scoped under `.module-skyjo`, classes prefixed `sj-`, semantic design-system tokens only. The screen itself composes `@scoreboards/design-system` (no `className`/`style`) |

## State

`SkyjoState` carries the round log (`rounds`) and the round currently being entered
(`enderPlayerId`, `scoreInputs`) — nothing else. Running totals, the ranking and whether the game is
over are all **derived** from `rounds` (`cumulativeTotals`, `buildRanking`, `isGameOver`), never
stored: keeping a mutable aggregate in the state would make the reducer's output depend on who else
holds a reference, the same reasoning 1000 Sabords' `historique` already follows.

`scoreInputs` is kept as typed strings, not numbers — a half-typed or empty field is a real,
representable state, not an error. A round can only be submitted once every player's field parses
as an integer (`^-?\d+$`, allowing a leading minus) and an ender has been picked; both are checked by
the same `pendingEntries` helper the reducer's `submitRound` case itself uses, so the "can submit"
UI check and the actual submission logic can never disagree.

## Persistence

The turn in progress goes through `host.saveDraft`/`loadDraft`/`clearDraft`, namespaced by
`moduleId` — the draft trio exists precisely for this: a reload mid-round must not lose the scores
already typed. A finished match's `moduleData` carries the same round log (`{ players, rounds }`,
`SkyjoModuleDataSchema`), so reopening it from History restores the full table, not just the final
totals.

Reading either payload back never trusts it: `SkyjoDraftSchema`/`SkyjoModuleDataSchema` (zod) reject
anything malformed, and a payload restored for a different table is discarded in favor of a clean
game, rather than crediting today's players with someone else's rounds. What "the same table" means
depends on where the payload comes from — `buildInitialState(playerIds, charge, source)`:

- **`'draft'`** (a new game, `host.loadDraft()`): `sameSeating`, order-sensitive. The host passes the
  ids in the order the players were picked, which is the order the draft was written with.
- **`'match'`** (a match reopened through `editing`): `samePlayers`, which compares the **set** of
  players — same size, no duplicate, every id at the table. The host reopens with
  `Match.playerScores` ids, which are in ranking order, so an order-sensitive check would throw the
  match away whenever its winner was not seated first. The restored state then keeps the payload's
  own `players` order: the columns read as they did when the match was played. Ties in the ranking
  change nothing; only who sits at the table counts. 1000 Sabords applies the same rule.

A reopened match never touches the draft: the screen calls neither `host.saveDraft` nor (on
"Abandonner") `host.clearDraft` while `editing` is set. That match is already saved on the host's
side; writing it into the draft would overwrite a new game in progress, and leaving the screen by the
host's ✕ would then leave its rounds there, without a `matchId`, for the next new game with the same
players to pick up and save as a duplicate. Saving still passes `editing.matchId`, so the host
updates the match instead of adding a second one.

## Backward compatibility

`SkyjoModuleData`/`SkyjoDraft` are the only serialized shapes this module owns; both carry a version
(`dataVersion` on the manifest, `DRAFT_VERSION` on the draft) bumped only when a payload stops being
readable by the current code — see the workspace's `doc/technical/migrations.md` if that ever
happens. Adding a new optional field to either schema must ship a `.default()`, per the workspace's
own backward-compat rule.
