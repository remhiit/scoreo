import type { WinCondition } from './enums'
import {
  computeRoundsWon,
  computeWinners,
  roundScoringChanged,
  usesRoundsWon,
  type GameType,
} from './gameType'
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
      const result = computeWinners(
        gameType,
        match.secondaryPlayerScores,
        gameType.tieBreakCondition,
      )
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
  const won = computeRoundsWon(match.rounds, winCondition, [...participants])
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
  const won = usesRoundsWon(gameType)
    ? computeRoundsWon(rounds, gameType.winCondition, playerIds)
    : null
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

/**
 * `match` as it scores once its game's rules go from `previous` to `updated`
 * (a scoring mode change, a game type merge): when that changes how rounds turn
 * into a final score ({@link roundScoringChanged}) and the match's round detail
 * agrees with its stored scores, `playerScores` is recomputed from that detail.
 * Otherwise — nothing to recompute, no detail, or detail that disagrees with the
 * stored scores — the match is returned as is (same reference). Tie-break data
 * (`manualWinners`, `secondaryPlayerScores`) is never touched.
 */
export function rescoreMatch(match: Match, previous: GameType, updated: GameType): Match {
  if (!roundScoringChanged(previous, updated)) return match
  if (roundDetailStatus(match, previous.winCondition) !== 'consistent') return match
  const playerScores = scoresFromRounds(
    updated,
    match.rounds,
    match.playerScores.map((ps) => ps.playerId),
  )
  const unchanged = playerScores.every((ps, i) => ps.score === match.playerScores[i].score)
  return unchanged ? match : { ...match, playerScores }
}

/**
 * Round detail made up for a match stored without any (`rounds: []`: imported
 * without detail, or saved before `Match.rounds` existed), such that
 * `scoresFromRounds(gameType, …)` gives back exactly `playerScores`:
 * - in points, a single round holding the final scores;
 * - in rounds won, one round per round won, each won by exactly one player
 *   (Alice 3, Bob 2 → 5 rounds). Under `HIGHEST_SCORE` the round's winner scores
 *   1 and the others 0; under `LOWEST_SCORE` the winner scores 0 and the others 1.
 *
 * `undefined` when the stored scores cannot be counts of rounds won (negative or
 * not whole numbers): no such detail exists.
 */
export function syntheticRounds(
  gameType: GameType,
  playerScores: readonly PlayerScore[],
): PlayerScore[][] | undefined {
  if (!usesRoundsWon(gameType)) return [playerScores.map((ps) => ({ ...ps }))]
  if (playerScores.some((ps) => !Number.isInteger(ps.score) || ps.score < 0)) return undefined
  const [win, lose] = gameType.winCondition === 'LOWEST_SCORE' ? [0, 1] : [1, 0]
  const rounds: PlayerScore[][] = []
  for (const winner of playerScores) {
    for (let i = 0; i < winner.score; i++) {
      rounds.push(
        playerScores.map((ps) => ({
          playerId: ps.playerId,
          score: ps.playerId === winner.playerId ? win : lose,
        })),
      )
    }
  }
  return rounds
}
