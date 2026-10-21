import type { WinCondition } from './enums'
import { computeRoundsWon, computeWinners, usesRoundsWon, type GameType } from './gameType'
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
  /**
   * The scoring module's own state for this match, stored verbatim and **never
   * inspected**: only the module that wrote it knows how to read it, and
   * `version` is the module's own so it can migrate its payload. This is what
   * lets reopening a module match restore its grid. `null` for every match
   * Scoreo scored itself.
   */
  moduleData: MatchModuleData | null
}

export interface MatchModuleData {
  moduleId: string
  version: number
  data: unknown
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

/**
 * How a match's round detail relates to its stored final scores:
 * - `none`: no detail (saved before `Match.rounds` existed, or imported without it);
 * - `consistent`: every entry names a participant, and the scores are either the
 *   points sum of the rounds or the count of rounds won under `winCondition`,
 *   whatever mode the game type uses today — a match saved under the other mode
 *   is still recognised;
 * - `inconsistent`: neither (older build synced via Drive, data edited outside
 *   the app). The detail is kept, the match counts with its stored scores.
 */
export type RoundDetailStatus = 'none' | 'consistent' | 'inconsistent'

export function roundDetailStatus(match: Match, winCondition: WinCondition): RoundDetailStatus {
  if (match.rounds.length === 0) return 'none'
  const participants = new Set(match.playerScores.map((ps) => ps.playerId))
  const sums = new Map<string, number>()
  for (const round of match.rounds) {
    for (const ps of round) {
      if (!participants.has(ps.playerId)) return 'inconsistent'
      sums.set(ps.playerId, (sums.get(ps.playerId) ?? 0) + ps.score)
    }
  }
  if (match.playerScores.every((ps) => (sums.get(ps.playerId) ?? 0) === ps.score)) {
    return 'consistent'
  }
  if (winCondition === 'MANUAL') return 'inconsistent'
  const won = computeRoundsWon(match.rounds, winCondition)
  return match.playerScores.every((ps) => (won.get(ps.playerId) ?? 0) === ps.score)
    ? 'consistent'
    : 'inconsistent'
}

/**
 * The final scores `gameType` derives from round detail, one per player of
 * `playerIds` (in that order): the points sum, or the count of rounds won.
 */
export function scoresFromRounds(
  gameType: GameType,
  rounds: PlayerScore[][],
  playerIds: readonly string[],
): PlayerScore[] {
  const won = usesRoundsWon(gameType) ? computeRoundsWon(rounds, gameType.winCondition) : null
  return playerIds.map((playerId) => ({
    playerId,
    score: won
      ? (won.get(playerId) ?? 0)
      : rounds.reduce(
          (sum, round) => sum + (round.find((ps) => ps.playerId === playerId)?.score ?? 0),
          0,
        ),
  }))
}
