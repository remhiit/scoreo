import type { ModuleMatchResult } from './matchResult'

/**
 * Fails when a result's round detail contradicts its ranking.
 *
 * This is the executable form of the rule the v1.1 file import already enforces
 * before accepting a game: round detail that does not add up to the announced
 * score is a scoring bug, and storing it would leave a match whose history
 * disagrees with its own total. Modules are expected to call this on the result
 * they build, and the host on every result it receives.
 *
 * Results carrying no rounds are accepted: round detail is optional, and a
 * ranking on its own contradicts nothing.
 *
 * @throws Error naming the first violation found.
 */
export function assertRoundsSumToRanking(result: ModuleMatchResult): void {
  const { ranking, rounds } = result
  if (!rounds) return

  const totals = new Map<string, number>()
  for (const entry of ranking) {
    if (totals.has(entry.playerId)) {
      throw new Error(`Player ${entry.playerId} appears twice in the ranking`)
    }
    totals.set(entry.playerId, 0)
  }

  rounds.forEach((round, index) => {
    const seen = new Set<string>()
    for (const { playerId, score } of round.scores) {
      if (seen.has(playerId)) {
        throw new Error(`Player ${playerId} appears twice in round ${index + 1} (${round.label})`)
      }
      seen.add(playerId)

      const total = totals.get(playerId)
      if (total === undefined) {
        throw new Error(
          `Round ${index + 1} (${round.label}) scores player ${playerId}, who is not in the ranking`,
        )
      }
      totals.set(playerId, total + score)
    }
  })

  for (const entry of ranking) {
    // A player absent from every round totals 0 — which is right only if that
    // is also their announced score.
    const actual = totals.get(entry.playerId) ?? 0
    if (actual !== entry.score) {
      throw new Error(
        `Rounds sum to ${actual} for player ${entry.playerId}, but the ranking says ${entry.score}`,
      )
    }
  }
}

/** The rules a module declares for its game, as far as checking a result needs them. */
export interface ModuleScoringRules {
  readonly winCondition: 'HIGHEST_SCORE' | 'LOWEST_SCORE' | 'MANUAL'
  /** Absent means `POINTS`. */
  readonly scoringMode?: 'POINTS' | 'ROUNDS_WON'
}

/**
 * Fails when a result contradicts the scoring mode its module declares.
 *
 * - `POINTS` (the default): the rounds must sum to the ranking, exactly
 *   {@link assertRoundsSumToRanking}.
 * - `ROUNDS_WON`: every score of the ranking is a whole number of at least 0
 *   (the error names the player). When the result carries round detail, each
 *   player's score must equal the number of rounds they won under the module's
 *   `winCondition` (every tied player wins a round; a player missing from a
 *   non-empty round counts as 0 in it, as a blank cell does).
 *
 * @throws Error naming the first violation found.
 */
export function assertResultMatchesRules(
  result: ModuleMatchResult,
  rules: ModuleScoringRules,
): void {
  if ((rules.scoringMode ?? 'POINTS') === 'POINTS') {
    assertRoundsSumToRanking(result)
    return
  }
  if (rules.winCondition === 'MANUAL') {
    throw new Error('A module cannot count rounds won with a MANUAL win condition')
  }

  const { ranking, rounds } = result
  const seen = new Set<string>()
  for (const entry of ranking) {
    if (seen.has(entry.playerId)) {
      throw new Error(`Player ${entry.playerId} appears twice in the ranking`)
    }
    seen.add(entry.playerId)
    if (!Number.isInteger(entry.score) || entry.score < 0) {
      throw new Error(
        `Rounds won must be a whole number of at least 0, but player ${entry.playerId} has ${entry.score}`,
      )
    }
  }
  if (!rounds) return

  const won = new Map<string, number>(ranking.map((entry) => [entry.playerId, 0]))
  rounds.forEach((round, index) => {
    if (round.scores.length === 0) return
    const inRound = new Map<string, number>()
    for (const { playerId, score } of round.scores) {
      if (!won.has(playerId)) {
        throw new Error(
          `Round ${index + 1} (${round.label}) scores player ${playerId}, who is not in the ranking`,
        )
      }
      if (inRound.has(playerId)) {
        throw new Error(`Player ${playerId} appears twice in round ${index + 1} (${round.label})`)
      }
      inRound.set(playerId, score)
    }
    for (const entry of ranking) if (!inRound.has(entry.playerId)) inRound.set(entry.playerId, 0)
    const values = [...inRound.values()]
    const best = rules.winCondition === 'HIGHEST_SCORE' ? Math.max(...values) : Math.min(...values)
    for (const [playerId, score] of inRound) {
      if (score === best) won.set(playerId, (won.get(playerId) ?? 0) + 1)
    }
  })

  for (const entry of ranking) {
    const actual = won.get(entry.playerId) ?? 0
    if (actual !== entry.score) {
      throw new Error(
        `Player ${entry.playerId} won ${actual} rounds, but the ranking says ${entry.score}`,
      )
    }
  }
}
