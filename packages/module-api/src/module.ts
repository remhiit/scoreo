import type { ComponentType } from 'react'
import type { ModuleHost } from './host'
import type { ScoringModuleManifest } from './manifest'

/**
 * What a module's screen receives. The host has already chosen the players and
 * resolved the game type; the module only scores.
 */
export interface ScoringModuleScreenProps {
  readonly host: ModuleHost

  /**
   * The players to score. On a new game, in the order they were picked — the
   * order a draft was written with. On a reopened match it does **not** carry
   * the seating: it is the `Match.playerScores` ids in the order the module's
   * own `ModuleMatch.playerScores` stored them (by rank in every module today).
   * A module keeping the seating in its `moduleData` must compare the **set** of
   * players when reading `editing.data` and restore its own order from the
   * payload.
   */
  readonly playerIds: readonly string[]

  /** Set when the host reopens a match this module scored. */
  readonly editing?: ModuleMatchEdit

  /**
   * Leaves the module and returns to the host, whether or not anything was
   * saved. The host's own exit bar calls the same function; where the host
   * lands afterwards is not the module's concern.
   */
  readonly onExit: () => void
}

export interface ModuleMatchEdit {
  /** Pass this back as `ModuleMatch.id` to update rather than duplicate. */
  readonly matchId: string
  /** The `moduleData` handed to the host when this match was saved, verbatim. */
  readonly version: number
  readonly data: unknown
}

/**
 * A scoring module, as the host's registry lists it.
 *
 * The manifest is eager — the host reads it to build its list of modules — and
 * `load` is deliberately a thunk: a module nobody opens costs zero bytes.
 */
export interface ScoringModule {
  readonly manifest: ScoringModuleManifest
  readonly load: () => Promise<{ default: ComponentType<ScoringModuleScreenProps> }>
}
