/**
 * What a module declares about itself, eagerly: a few hundred bytes loaded at
 * startup so the host can list the module without pulling in its screen.
 */
export interface ScoringModuleManifest {
  /**
   * Stable forever, and never derived from a display name: it is what a
   * `GameType` is stamped with once bound, so renaming the module or the game
   * must not break existing matches.
   */
  readonly moduleId: string

  readonly displayName: string

  /**
   * Names this module accepts as its game, matched case-insensitively and only
   * the first time it is bound — typically the name a v1.1 import already
   * created. After that the binding lives on `GameType.moduleId`.
   */
  readonly gameNames: readonly string[]

  readonly winCondition: 'HIGHEST_SCORE' | 'LOWEST_SCORE' | 'MANUAL'

  readonly minPlayers: number
  readonly maxPlayers: number

  /** Version of the payload the module puts in `ModuleMatchResult.moduleData`. */
  readonly dataVersion: number
}
