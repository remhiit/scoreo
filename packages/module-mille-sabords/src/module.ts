import type { ScoringModule, ScoringModuleManifest } from '@scoreboards/module-api'

/**
 * What Scoreo knows about this module before loading any of it.
 *
 * This file imports nothing but a type, on purpose: the host reads the manifest
 * eagerly to list the module, so anything it pulled in would land in Scoreo's
 * main bundle. The module's own code depends on the manifest, never the reverse.
 */
export const milleSabordsManifest: ScoringModuleManifest = {
  moduleId: 'mille-sabords',
  displayName: '1000 Sabords',
  // The exact string the Kotlin app has always written in its v1.1 export, so a
  // history imported from it binds to this module instead of spawning a second
  // game type beside it.
  gameNames: ['1000 Sabords'],
  winCondition: 'HIGHEST_SCORE',
  minPlayers: 2,
  maxPlayers: 8,
  dataVersion: 1,
}

/**
 * The module as the host's registry lists it. `load` is a thunk holding a
 * dynamic import, so the screen and the scoring rules it drags in become a
 * separate chunk — a module nobody opens costs nothing.
 */
export const milleSabordsModule: ScoringModule = {
  manifest: milleSabordsManifest,
  load: () => import('./ui/module/MilleSabordsModuleScreen'),
}
