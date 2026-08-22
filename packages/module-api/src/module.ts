import type { ComponentType } from 'react'
import type { ModuleHost } from './host'
import type { ScoringModuleManifest } from './manifest'

/**
 * What a module's screen receives. The host has already chosen the players and
 * resolved the game type; the module only scores.
 */
export interface ScoringModuleScreenProps {
  readonly host: ModuleHost

  /** The players to score, in the order the host picked them. */
  readonly playerIds: readonly string[]

  /** Set when the host reopens a match this module scored. */
  readonly editing?: ModuleMatchEdit

  /** Leaves the module and returns to the host, whether or not anything was saved. */
  readonly onExit: () => void
}

export interface ModuleMatchEdit {
  /** Pass this back as `ModuleMatchResult.matchId` to update rather than duplicate. */
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
