import type { ScoringModule, ScoringModuleManifest } from '@scoreboards/module-api'

/**
 * What Scoreo knows about this module before loading any of it.
 *
 * This file imports nothing but a type, on purpose: the host reads the manifest
 * eagerly to list the module, so anything it pulled in would land in Scoreo's
 * main bundle. The module's own code depends on the manifest, never the reverse.
 */
export const skyjoManifest: ScoringModuleManifest = {
  moduleId: 'skyjo',
  displayName: 'Skyjo',
  gameNames: ['Skyjo'],
  winCondition: 'LOWEST_SCORE',
  minPlayers: 2,
  maxPlayers: 8,
  dataVersion: 1,
}

/**
 * The module as the host's registry lists it. `load` is a thunk holding a
 * dynamic import, so the screen and the scoring rules it drags in become a
 * separate chunk — a module nobody opens costs nothing.
 */
export const skyjoModule: ScoringModule = {
  manifest: skyjoManifest,
  load: () => import('./ui/module/SkyjoModuleScreen'),
}
