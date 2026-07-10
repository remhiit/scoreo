export interface MatchDraft {
  gameTypeId: string
  playerIds: string[]
  /** One entry per round: playerId -> score string (as typed by the user). */
  rounds: Record<string, string>[]
  /** Epoch milliseconds (UTC). */
  updatedAt: number
}
