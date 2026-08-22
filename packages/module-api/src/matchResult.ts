/**
 * What a scoring module hands back to the host once a game has been scored.
 *
 * The module owns the scoring rules; the host owns the storage. Nothing here
 * says how either side persists anything — this is the in-process equivalent
 * of the v1.1 import file, without the file.
 */

/** A player as a module sees one: an identity and a name, never the host's `active` flag. */
export interface ModulePlayer {
  readonly id: string
  readonly name: string
}

export interface ModuleRankingEntry {
  readonly playerId: string
  readonly score: number
  /** 1 = winner. The module owns its own tie-breaks, so several entries may share a rank. */
  readonly rank: number
}

export interface ModuleRound {
  readonly label: string
  readonly scores: readonly { playerId: string; score: number }[]
}

export interface ModuleMatchResult {
  /** Set to update a match the module scored earlier; absent creates a new one. */
  readonly matchId?: string
  readonly ranking: readonly ModuleRankingEntry[]
  /** Round-by-round detail, kept by the host as `Match.rounds`. Must sum to `ranking`. */
  readonly rounds?: readonly ModuleRound[]
  /** Epoch milliseconds. The host stamps the current time when this is absent. */
  readonly playedAt?: number
  /**
   * The module's own state for this match, stored opaquely by the host and
   * handed straight back when the match is reopened. The host never reads
   * inside `data`; `version` belongs to the module, which migrates its own payload.
   */
  readonly moduleData?: { readonly version: number; readonly data: unknown }
}
