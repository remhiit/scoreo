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
