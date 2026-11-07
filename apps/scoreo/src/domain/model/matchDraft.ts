export interface MatchDraft {
  gameTypeId: string
  playerIds: string[]
  /** One entry per round: playerId -> score string (as typed by the user). */
  rounds: Record<string, string>[]
  /** Epoch milliseconds (UTC). */
  updatedAt: number
  /**
   * Set when the draft is a game in progress on a scoring module: the module's
   * own opaque state, which only that module can read. The generic grid never
   * reads such a draft as its own rounds.
   */
  moduleState: { moduleId: string; state: unknown } | null
}
