import type { PlayerScore } from './playerScore'

export interface Match {
  id: string
  /** Epoch milliseconds (UTC). */
  date: number
  gameTypeId: string
  playerScores: PlayerScore[]
  manualWinners: string[]
  secondaryPlayerScores: PlayerScore[]
}
