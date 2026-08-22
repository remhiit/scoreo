import type { ScoringModule, ScoringModuleManifest } from '@scoreboards/module-api'

/**
 * What Scoreo knows about this module before loading any of it.
 *
 * This file imports nothing but a type, on purpose: the host reads the manifest
 * eagerly to list the module, so anything it pulled in would land in Scoreo's
 * main bundle. The module's own code depends on the manifest, never the reverse.
 *
 * `moduleId` is stamped onto a `GameType` once the two are bound and must never
 * change: renaming the module or the game must not orphan existing matches.
 */
export const toriValleyManifest: ScoringModuleManifest = {
  moduleId: 'tori-valley',
  displayName: 'La Vallée des Torī',
  // The name a v1.1 import already created, so an existing history binds to the
  // module instead of spawning a second game type next to it.
  gameNames: ['La Vallée des Torī'],
  winCondition: 'HIGHEST_SCORE',
  // The scoring screen accepts a solo game, but Scoreo cannot start one and the
  // v1.1 contract requires two entries in `ranking` (see MIN_EXPORTABLE_PLAYERS).
  // Advertising 1 would offer a game the host can never launch.
  minPlayers: 2,
  maxPlayers: 4,
  dataVersion: 1,
}

/**
 * The module as the host's registry lists it.
 *
 * `load` is a thunk holding a dynamic import, so the screen and everything it
 * drags in — the scoring rules, the translations, lucide — become a separate
 * chunk. Only this closure lands in Scoreo's main bundle.
 */
export const toriValleyModule: ScoringModule = {
  manifest: toriValleyManifest,
  load: () => import('./ui/module/ToriValleyModuleScreen'),
}
