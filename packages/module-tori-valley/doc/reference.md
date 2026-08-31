# Reference — for the LLM

Exhaustive tables. Read before exploring `src/`.

## Reducers (MVI-style)

| Screen         | Reducer file                               | Action type         | Actions                                                                                                                                                      | State file                                                                                            |
| -------------- | ------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| MatchSetup     | `src/ui/matchsetup/matchSetupReducer.ts`   | `MatchSetupAction`  | `selectVariant`                                                                                                                                              | `src/ui/matchsetup/matchSetupTypes.ts` (`MatchSetupState`)                                            |
| ScoreDetail    | `src/ui/scoredetail/scoreDetailReducer.ts` | `ScoreDetailAction` | `updateToriiCount`, `updateParchemin`, `setPinceauHolder`, `updateObjectifPoints`, `updateObjectifInput`, `setObjectifManual`, `saveSucceeded`, `saveFailed` | `src/ui/scoredetail/scoreDetailTypes.ts` (`ScoreDetailState`, `ScoreDetailMode` = `Create` \| `Edit`) |

## What the module no longer owns

Players, match history, persistence, export and routing belong to Scoreo. The use cases, ports,
localStorage adapters, DI container and hash router this package used to carry went with the
standalone shell (#330, #350): the module is handed its players and gives back a result, and never
touches storage.

What remains is the game: its domain, its two screens, its dictionaries and its stylesheet.

## Hosted module

The package is a scoring module Scoreo loads — nothing else. What the host uses:

| Export | File | Role |
| --- | --- | --- |
| `toriValleyManifest` | `src/module.ts` | Read eagerly by Scoreo's registry, so this file imports nothing but its type |
| `toriValleyModule` | `src/module.ts` | `{ manifest, load }` — `load` holds a dynamic import, which is what puts the screen in its own chunk |
| `ToriValleyModuleScreen` | `src/ui/module/ToriValleyModuleScreen.tsx` | Default export, implements `ScoringModuleScreenProps`. Reads players from `host.getPlayers()`, saves through `host.saveMatch()`, and **never touches `tori_valley_*`** — the host owns the storage |
| `toModuleMatchResult` | `src/domain/model/moduleResult.ts` | The single description of a finished match, keyed by `playerId`. The v1.1 file export maps ids to names on top of it, so file and module can never disagree about a rank or a category |
| `ToriValleyModuleDataSchema` | `src/domain/model/moduleResult.ts` | Validates the opaque payload the host hands back when a match is reopened; an unreadable one starts a fresh grid |
| `ToriValleyDraftSchema` / `toDraft` / `readDraft` | `src/domain/model/moduleResult.ts` | The in-progress scoring session written to `host.saveDraft` after every grid change and read back via `host.loadDraft`. Same shape as `moduleData` plus `playerIds`: `readDraft` rejects an unreadable/older-shape payload or one written for a different player set, in which case `ToriValleyModuleScreen` starts a blank grid |

`ScoreDetailScreen` takes a `save(results, objectifCards)` callback rather than a use case: where the scores go is the host's business, and the screen stays ignorant of it.

## Shared Components

| Component   | Props                                                                                                                                           | Usage                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `AppButton` | `text`, `variant?` (`'primary' \| 'secondary' \| 'ghost' \| 'danger'`, default `primary`), `iconOnly?`, `ariaLabel?`, `...ButtonHTMLAttributes` | The single interactive-action primitive. |

## Tests

**Behaviour** (`pnpm test`) — colocated `*.test.ts(x)` next to the file they cover, running under Vitest + `jsdom`. Both screens have a component test on top of their reducer's pure-function tests, and `src/ui/module/ToriValleyModuleScreen.test.tsx` covers the module against a fake `ModuleHost`. `src/test/i18n.ts` builds the i18next instance they render against — in the app it is Scoreo's instance that receives `registerTranslations`.

**Visual regression** — moved to the host with the standalone shell it needed: `apps/scoreo/tests/visual/toriModule.visual.spec.ts` photographs this module through Scoreo's `#/module/tori-valley/…` route, at a phone and a desktop width, in light and dark. Baselines and the procedure for re-recording them live with it — see the workspace's `doc/technical/visual-testing.md`.

## localStorage Keys

The module writes **none**. It reaches storage only through `ModuleHost`, which keeps its draft
under Scoreo's own `scoreo_module_draft_tori-valley` — written by `ToriValleyModuleScreen` on every
change to the grid once the Objectif cards are confirmed (not during card dealing: the grid doesn't
exist yet), and cleared either by `ModuleHostAdapter.saveMatch` on a finished match or by the screen's
own **Cancel** button, the explicit way to start over. The module bar's own exit (leaving mid-entry,
today only the browser's back arrow) leaves the draft in place on purpose — it is what makes that exit
recoverable.

| Key                                                | Content                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `tori_valley_players`, `tori_valley_matches`        | What the standalone app left behind on the origin it shared with Scoreo. Read by nothing since #350 |
| `tori_valley_language`                              | Same, superseded by Scoreo's `scoreo_lang`                                            |

## Internationalization

`src/i18n/index.ts` — the module's dictionaries as the `tori-valley` i18next namespace, added to whatever instance the host owns by `registerTranslations()`, called when the module's chunk loads. Resource dictionaries: `src/i18n/locales/en.ts` / `fr.ts`. Choosing a language is Scoreo's business; the module has no bootstrap of its own, only `src/test/i18n.ts` for the suite. `ValidationError`/`NotFoundError` (`src/domain/model/errors.ts`) carry an optional `code` (+ `params`) i18n key, translated by the `ui` layer.
