import { scoresFromRounds, roundDetailStatus, type Match } from './match'
import type { GameType } from './gameType'

/** The fields of a match that a scoring module fills in, and the invariant bears on. */
export type MatchFields = Pick<Match, 'playerScores' | 'rounds' | 'manualWinners'>

/**
 * Fails when a match contradicts itself or the rules of its game.
 *
 * This is the domain invariant behind every match a scoring module hands to the
 * host (and the executable form of the rule the v1.1 file import enforces
 * before accepting a game): a match whose history disagrees with its own total
 * is a scoring bug, and storing it would leave nothing that ever notices again.
 *
 * It refuses:
 * - a player listed twice in `playerScores`, or twice in one round;
 * - a round that scores someone who is not in `playerScores`;
 * - a `manualWinners` entry who is not in `playerScores`;
 * - round detail that disagrees with `playerScores` under the game's rules
 *   (`roundDetailStatus` is `inconsistent`; then, more strictly than that
 *   status, the scores must be the ones the game's scoring mode derives from
 *   the rounds — the points sum, or the count of rounds won).
 *
 * `rounds: []` is accepted: round detail is optional, and totals on their own
 * contradict nothing.
 *
 * @throws Error naming the first violation found.
 */
export function assertMatchConsistent(match: MatchFields, gameType: GameType): void {
  const { playerScores, rounds, manualWinners } = match

  const participants = new Set<string>()
  for (const { playerId } of playerScores) {
    if (participants.has(playerId)) {
      throw new Error(`Player ${playerId} appears twice in the scores`)
    }
    participants.add(playerId)
  }

  rounds.forEach((round, index) => {
    const seen = new Set<string>()
    for (const { playerId } of round) {
      if (seen.has(playerId)) {
        throw new Error(`Player ${playerId} appears twice in round ${index + 1}`)
      }
      seen.add(playerId)
      if (!participants.has(playerId)) {
        throw new Error(`Round ${index + 1} scores player ${playerId}, who is not in the scores`)
      }
    }
  })

  for (const winnerId of manualWinners) {
    if (!participants.has(winnerId)) {
      throw new Error(`Winner ${winnerId} is not in the scores`)
    }
  }

  if (roundDetailStatus(match, gameType.winCondition) === 'inconsistent') {
    throw new Error('The rounds do not add up to the scores')
  }

  if (rounds.length === 0) return
  const derived = scoresFromRounds(
    gameType,
    rounds,
    playerScores.map((ps) => ps.playerId),
  )
  derived.forEach((expected, index) => {
    const actual = playerScores[index]
    if (actual.score !== expected.score) {
      throw new Error(
        `The rounds give ${expected.score} for player ${actual.playerId}, but the scores say ${actual.score}`,
      )
    }
  })
}
