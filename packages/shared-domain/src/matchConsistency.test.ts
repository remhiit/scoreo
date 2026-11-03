import { describe, expect, it } from 'vitest'
import { newGameType, type GameType } from './gameType'
import { assertMatchConsistent, type MatchFields } from './matchConsistency'
import type { PlayerScore } from './playerScore'

function scores(...pairs: [string, number][]): PlayerScore[] {
  return pairs.map(([playerId, score]) => ({ playerId, score }))
}

const points: GameType = newGameType('gt', 'Points', 'HIGHEST_SCORE')
const roundsWon: GameType = newGameType('gt', 'Rounds', 'HIGHEST_SCORE', {
  scoringMode: 'ROUNDS_WON',
})

function match(overrides: Partial<MatchFields> = {}): MatchFields {
  return {
    playerScores: scores(['p1', 9], ['p2', 5]),
    rounds: [scores(['p1', 9], ['p2', 5])],
    manualWinners: ['p1'],
    ...overrides,
  }
}

describe('assertMatchConsistent', () => {
  describe('accepts', () => {
    it('a match with rounds adding up to its scores', () => {
      expect(() => assertMatchConsistent(match(), points)).not.toThrow()
    })

    it('several rounds adding up to the scores', () => {
      expect(() =>
        assertMatchConsistent(
          match({ rounds: [scores(['p1', 4], ['p2', 5]), scores(['p1', 5], ['p2', 0])] }),
          points,
        ),
      ).not.toThrow()
    })

    it('negative round scores', () => {
      expect(() =>
        assertMatchConsistent(
          match({
            playerScores: scores(['p1', 3], ['p2', 5]),
            rounds: [scores(['p1', 10], ['p2', 5]), scores(['p1', -7], ['p2', 0])],
          }),
          points,
        ),
      ).not.toThrow()
    })

    it('a player who sat a round out', () => {
      expect(() =>
        assertMatchConsistent(
          match({ rounds: [scores(['p1', 9], ['p2', 5]), scores(['p1', 0])] }),
          points,
        ),
      ).not.toThrow()
    })

    it('a match with no round detail', () => {
      expect(() => assertMatchConsistent(match({ rounds: [] }), points)).not.toThrow()
    })

    it('an empty match', () => {
      expect(() =>
        assertMatchConsistent({ playerScores: [], rounds: [], manualWinners: [] }, points),
      ).not.toThrow()
    })

    it('several winners declared at the first place', () => {
      expect(() =>
        assertMatchConsistent(
          match({
            playerScores: scores(['p1', 5], ['p2', 5]),
            rounds: [scores(['p1', 5], ['p2', 5])],
            manualWinners: ['p1', 'p2'],
          }),
          points,
        ),
      ).not.toThrow()
    })

    it('a count of rounds won in a rounds-won game', () => {
      expect(() =>
        assertMatchConsistent(
          match({
            playerScores: scores(['p1', 1], ['p2', 1]),
            rounds: [scores(['p1', 9], ['p2', 5]), scores(['p1', 2], ['p2', 8])],
            manualWinners: [],
          }),
          roundsWon,
        ),
      ).not.toThrow()
    })
  })

  describe('rejects', () => {
    it('rounds summing above the scores', () => {
      expect(() =>
        assertMatchConsistent(match({ rounds: [scores(['p1', 12], ['p2', 5])] }), points),
      ).toThrow()
    })

    it('rounds summing below the scores', () => {
      expect(() =>
        assertMatchConsistent(match({ rounds: [scores(['p1', 4], ['p2', 5])] }), points),
      ).toThrow()
    })

    it('a player listed twice in the scores', () => {
      expect(() =>
        assertMatchConsistent(
          match({ playerScores: scores(['p1', 9], ['p1', 9]), rounds: [] }),
          points,
        ),
      ).toThrow(/p1 appears twice in the scores/)
    })

    it('a player twice in one round', () => {
      expect(() =>
        assertMatchConsistent(match({ rounds: [scores(['p1', 4], ['p1', 5], ['p2', 5])] }), points),
      ).toThrow(/p1 appears twice in round 1/)
    })

    it('a round scoring a non-participant, naming that round', () => {
      expect(() =>
        assertMatchConsistent(
          match({ rounds: [scores(['p1', 9], ['p2', 5]), scores(['ghost', 1])] }),
          points,
        ),
      ).toThrow(/Round 2 scores player ghost/)
    })

    it('a winner who is not a participant', () => {
      expect(() => assertMatchConsistent(match({ manualWinners: ['ghost'] }), points)).toThrow(
        /Winner ghost/,
      )
    })

    it('a points total in a rounds-won game', () => {
      expect(() => assertMatchConsistent(match(), roundsWon)).toThrow()
    })

    it('a count of rounds won in a points game', () => {
      expect(() =>
        assertMatchConsistent(
          match({
            playerScores: scores(['p1', 1], ['p2', 1]),
            rounds: [scores(['p1', 9], ['p2', 5]), scores(['p1', 2], ['p2', 8])],
          }),
          points,
        ),
      ).toThrow()
    })
  })
})
