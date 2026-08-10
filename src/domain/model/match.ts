import { computeWinners, type GameType } from './gameType'
import type { PlayerScore } from './playerScore'

export interface Match {
  id: string
  /** Epoch milliseconds (UTC). */
  date: number
  gameTypeId: string
  playerScores: PlayerScore[]
  manualWinners: string[]
  secondaryPlayerScores: PlayerScore[]
  /** One entry per round played, each listing every participant's score for that round. Empty for matches saved before this was tracked, or imported without round detail. */
  rounds: PlayerScore[][]
}

/**
 * Returns true if this match has a tie but lacks the data required
 * to apply the game type's tie-break rule.
 *
 * This can happen for historic matches saved before tie-break support
 * was introduced, where `manualWinners` or `secondaryPlayerScores`
 * are empty despite a tie existing.
 */
export function isTieBreakIndeterminate(match: Match, gameType: GameType): boolean {
  if (gameType.winCondition === 'MANUAL') return false
  const winners = computeWinners(gameType, match.playerScores)
  if (winners.length <= 1) return false
  switch (gameType.tieBreakRule) {
    case 'MANUAL_SELECTION':
      return match.manualWinners.length === 0
    case 'SECONDARY_SCORE':
      return match.secondaryPlayerScores.length === 0
    case 'NONE':
      return false
  }
}

/**
 * Returns the winners of this match for the given game type.
 * Handles all three tie-break rules:
 * - NONE: all tied players are winners (equality preserved)
 * - MANUAL_SELECTION: returns manualWinners
 * - SECONDARY_SCORE: applies gameType.tieBreakCondition on secondaryPlayerScores
 * For historic matches where tie-break data is missing (indeterminate),
 * falls back to returning all tied players (NONE behavior).
 */
export function getWinners(match: Match, gameType: GameType): string[] {
  if (gameType.winCondition === 'MANUAL') return match.manualWinners
  const primaryWinners = computeWinners(gameType, match.playerScores)
  if (primaryWinners.length <= 1 || gameType.tieBreakRule === 'NONE') return primaryWinners

  if (isTieBreakIndeterminate(match, gameType)) return primaryWinners

  switch (gameType.tieBreakRule) {
    case 'MANUAL_SELECTION':
      return match.manualWinners
    case 'SECONDARY_SCORE': {
      const result = computeWinners(gameType, match.secondaryPlayerScores, gameType.tieBreakCondition)
      return result.length === 0 ? primaryWinners : result
    }
  }
}
