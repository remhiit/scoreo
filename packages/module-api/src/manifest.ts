/**
 * What a module declares about itself, eagerly: a few hundred bytes loaded at
 * startup so the host can list the module without pulling in its screen.
 * It must stay a plain object importing nothing but this type, or whatever it
 * pulls in ends up in the host's main bundle.
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
   * Names this module accepts as its game, matched case-insensitively
   * (ignoring surrounding blanks) and only the first time it is bound —
   * typically the name a v1.1 import already created. After that the binding
   * lives on `GameType.moduleId`; renaming the game changes nothing.
   */
  readonly gameNames: readonly string[]

  /**
   * The game's rules: `winCondition`, `minPlayers` and `maxPlayers` are the
   * only source of the rules of a game bound to this module, applied to its
   * whole history. `registry.test.ts` freezes them, so changing one is a
   * deliberate edit of that test too.
   */
  readonly winCondition: 'HIGHEST_SCORE' | 'LOWEST_SCORE' | 'MANUAL'

  readonly minPlayers: number
  readonly maxPlayers: number

  /** Version of the payload the module puts in `ModuleMatch.moduleData`. */
  readonly dataVersion: number
}
