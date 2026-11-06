import type { ScoringModule, ScoringModuleManifest } from '@scoreboards/module-api'

/**
 * What Scoreo knows about this module before loading any of it.
 *
 * This file imports nothing but a type, on purpose: the host reads the manifest
 * eagerly to list the module, so anything it pulled in would land in Scoreo's
 * main bundle. The module's own code depends on the manifest, never the reverse.
 */
export const flip7Manifest: ScoringModuleManifest = {
  moduleId: 'flip-7',
  displayName: 'Flip 7',
  gameNames: ['Flip 7', 'Flip Seven'],
  winCondition: 'HIGHEST_SCORE',
  // The box says 3+, but no scoring rule depends on the player count and
  // two-player games are common at the table; Scoreo cannot start a solo
  // match anyway. 18 is the most one deck serves, per the rulebook.
  minPlayers: 2,
  maxPlayers: 18,
  dataVersion: 1,
}

/**
 * The module as the host's registry lists it. `load` is a thunk holding a
 * dynamic import, so the screen and the scoring rules it drags in become a
 * separate chunk — a module nobody opens costs nothing.
 */
export const flip7Module: ScoringModule = {
  manifest: flip7Manifest,
  load: () => import('./ui/module/Flip7ModuleScreen'),
}
