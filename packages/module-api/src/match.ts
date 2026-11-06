import type { PlayerScore } from '@scoreboards/shared-domain'

/**
 * What a scoring module hands the host once a game has been scored: the fields
 * of Scoreo's own `Match` that only the module can fill in, in the host's own
 * types (`@scoreboards/shared-domain`).
 *
 * The module owns the scoring rules and the tie-breaks; the host owns the
 * identity and the storage. Whatever is not here — `gameTypeId`,
 * `secondaryPlayerScores`, `moduleData.moduleId` — the host stamps itself.
 */
export interface ModuleMatch {
  /** Set to update a match the module scored earlier; absent creates a new one. */
  readonly id?: string
  /** Epoch milliseconds. Absent: the host keeps the existing match's date, or stamps its own clock. */
  readonly date?: number
  /** The final score of every participant. Their order is the order the host stores. */
  readonly playerScores: PlayerScore[]
  /**
   * Round-by-round detail, kept as `Match.rounds`; `[]` for a game with none.
   * It must agree with `playerScores` under the game's rules — the host refuses
   * a match it does not (`assertMatchConsistent`).
   */
  readonly rounds: PlayerScore[][]
  /**
   * The winner(s), as the module's own tie-breaks decide them. Several ids when
   * the module declares a tie at the first place.
   */
  readonly manualWinners: string[]
  /**
   * The module's own state for this match, stored opaquely by the host and
   * handed straight back when the match is reopened. The host never reads
   * inside `data`; `version` belongs to the module, which migrates its own
   * payload. `null` stores none.
   */
  readonly moduleData: { readonly version: number; readonly data: unknown } | null
}
