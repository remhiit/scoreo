import { describe, expect, it } from 'vitest'
import { newGameType, type GameType } from './gameType'
import {
  getWinners,
  isTieBreakIndeterminate,
  rescoreMatch,
  roundDetailStatus,
  scoresFromRounds,
  syntheticRounds,
  type Match,
} from './match'
import type { PlayerScore } from './playerScore'

function scores(...pairs: [string, number][]): PlayerScore[] {
  return pairs.map(([playerId, score]) => ({ playerId, score }))
}

function gameType(overrides: Partial<GameType> = {}): GameType {
  return {
    id: '1',
    name: 'Game',
    winCondition: 'HIGHEST_SCORE',
    scoringMode: 'POINTS' as const,
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
    ...overrides,
  }
}

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    date: 0,
    gameTypeId: '1',
    playerScores: [],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: [],
    moduleData: null,
    ...overrides,
  }
}

describe('isTieBreakIndeterminate', () => {
  it('indeterminate when MANUAL_SELECTION and manualWinners empty with tie', () => {
    const gt = gameType({ tieBreakRule: 'MANUAL_SELECTION' })
    const m = match({ playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]) })
    expect(isTieBreakIndeterminate(m, gt)).toBe(true)
  })

  it('indeterminate when SECONDARY_SCORE and secondaryPlayerScores empty with tie', () => {
    const gt = gameType({ tieBreakRule: 'SECONDARY_SCORE' })
    const m = match({ playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]) })
    expect(isTieBreakIndeterminate(m, gt)).toBe(true)
  })

  it('not indeterminate when NONE tie-break rule', () => {
    const gt = gameType({ tieBreakRule: 'NONE' })
    const m = match({ playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]) })
    expect(isTieBreakIndeterminate(m, gt)).toBe(false)
  })

  it('not indeterminate when MANUAL_SELECTION and manualWinners populated', () => {
    const gt = gameType({ tieBreakRule: 'MANUAL_SELECTION' })
    const m = match({
      playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]),
      manualWinners: ['alice'],
    })
    expect(isTieBreakIndeterminate(m, gt)).toBe(false)
  })

  it('not indeterminate when SECONDARY_SCORE and secondaryPlayerScores populated', () => {
    const gt = gameType({ tieBreakRule: 'SECONDARY_SCORE' })
    const m = match({
      playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]),
      secondaryPlayerScores: scores(['alice', 5], ['bob', 3]),
    })
    expect(isTieBreakIndeterminate(m, gt)).toBe(false)
  })

  it('not indeterminate when no tie exists', () => {
    const gt = gameType({ tieBreakRule: 'MANUAL_SELECTION' })
    const m = match({ playerScores: scores(['alice', 10], ['bob', 5], ['charlie', 3]) })
    expect(isTieBreakIndeterminate(m, gt)).toBe(false)
  })

  it('not indeterminate when MANUAL win condition', () => {
    const gt = gameType({
      name: 'Custom',
      winCondition: 'MANUAL',
      tieBreakRule: 'MANUAL_SELECTION',
    })
    const m = match({ playerScores: scores(['alice', 10], ['bob', 10]) })
    expect(isTieBreakIndeterminate(m, gt)).toBe(false)
  })
})

describe('getWinners fallback', () => {
  it('returns all tied when indeterminate', () => {
    const gt = gameType({ tieBreakRule: 'MANUAL_SELECTION' })
    const m = match({ playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]) })
    expect(new Set(getWinners(m, gt))).toEqual(new Set(['alice', 'bob']))
  })

  it('respects manualWinners when not indeterminate', () => {
    const gt = gameType({ tieBreakRule: 'MANUAL_SELECTION' })
    const m = match({
      playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]),
      manualWinners: ['bob'],
    })
    expect(getWinners(m, gt)).toEqual(['bob'])
  })

  it('uses SECONDARY_SCORE when tie and rule set', () => {
    const gt = gameType({ tieBreakRule: 'SECONDARY_SCORE', tieBreakCondition: 'LOWEST_SCORE' })
    const m = match({
      playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]),
      secondaryPlayerScores: scores(['alice', 5], ['bob', 3]),
    })
    expect(getWinners(m, gt)).toEqual(['bob'])
  })

  it('with SECONDARY_SCORE falls back to primary when secondary empty', () => {
    const gt = gameType({ tieBreakRule: 'SECONDARY_SCORE' })
    const m = match({ playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]) })
    expect(new Set(getWinners(m, gt))).toEqual(new Set(['alice', 'bob']))
  })

  it('with SECONDARY_SCORE falls back to all tied when secondary still tied', () => {
    const gt = gameType({ tieBreakRule: 'SECONDARY_SCORE', tieBreakCondition: 'HIGHEST_SCORE' })
    const m = match({
      playerScores: scores(['alice', 10], ['bob', 10], ['charlie', 3]),
      secondaryPlayerScores: scores(['alice', 5], ['bob', 5]),
    })
    expect(new Set(getWinners(m, gt))).toEqual(new Set(['alice', 'bob']))
  })
})

describe('roundDetailStatus', () => {
  const rounds: PlayerScore[][] = [
    [
      { playerId: 'a', score: 10 },
      { playerId: 'b', score: 2 },
    ],
    [
      { playerId: 'a', score: 1 },
      { playerId: 'b', score: 8 },
    ],
    [
      { playerId: 'a', score: 9 },
      { playerId: 'b', score: 3 },
    ],
  ]
  const match = (a: number, b: number, detail = rounds): Match => ({
    id: 'm',
    date: 0,
    gameTypeId: 'g',
    playerScores: [
      { playerId: 'a', score: a },
      { playerId: 'b', score: b },
    ],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: detail,
    moduleData: null,
  })

  it('is none without round detail', () => {
    expect(roundDetailStatus(match(20, 13, []), 'HIGHEST_SCORE')).toBe('none')
  })

  it('recognises the points sum', () => {
    expect(roundDetailStatus(match(20, 13), 'HIGHEST_SCORE')).toBe('consistent')
  })

  it('recognises the count of rounds won under the win condition', () => {
    expect(roundDetailStatus(match(2, 1), 'HIGHEST_SCORE')).toBe('consistent')
    expect(roundDetailStatus(match(1, 2), 'LOWEST_SCORE')).toBe('consistent')
    expect(roundDetailStatus(match(2, 1), 'LOWEST_SCORE')).toBe('inconsistent')
  })

  it('only accepts the sum for a MANUAL game', () => {
    expect(roundDetailStatus(match(0, 0), 'MANUAL')).toBe('inconsistent')
    expect(roundDetailStatus(match(20, 13), 'MANUAL')).toBe('consistent')
  })

  it('is inconsistent when the scores match neither', () => {
    expect(roundDetailStatus(match(50, 40), 'HIGHEST_SCORE')).toBe('inconsistent')
  })

  it('counts a participant missing from a stored round as 0 when counting rounds won', () => {
    // 'b' is missing from the first round: with 0 there, 'b' wins it under LOWEST_SCORE.
    const partial = [[{ playerId: 'a', score: 10 }], rounds[1], rounds[2]]
    expect(roundDetailStatus(match(1, 2, partial), 'LOWEST_SCORE')).toBe('consistent')
  })

  it('is inconsistent when a round names a non-participant', () => {
    const stranger = [[...rounds[0], { playerId: 'z', score: 0 }], rounds[1], rounds[2]]
    expect(roundDetailStatus(match(20, 13, stranger), 'HIGHEST_SCORE')).toBe('inconsistent')
  })
})

describe('scoresFromRounds', () => {
  const rounds: PlayerScore[][] = [
    [
      { playerId: 'a', score: 10 },
      { playerId: 'b', score: 2 },
    ],
    [
      { playerId: 'a', score: 1 },
      { playerId: 'b', score: 8 },
    ],
  ]

  it('sums the rounds in points', () => {
    expect(scoresFromRounds(newGameType('g', 'G', 'HIGHEST_SCORE'), rounds, ['a', 'b'])).toEqual([
      { playerId: 'a', score: 11 },
      { playerId: 'b', score: 10 },
    ])
  })

  it('counts the rounds won in rounds-won mode', () => {
    const gameType = newGameType('g', 'G', 'LOWEST_SCORE', { scoringMode: 'ROUNDS_WON' })
    expect(scoresFromRounds(gameType, rounds, ['b', 'a'])).toEqual([
      { playerId: 'b', score: 1 },
      { playerId: 'a', score: 1 },
    ])
  })
})

describe('rescoreMatch', () => {
  const rounds: PlayerScore[][] = [
    scores(['a', 10], ['b', 2]),
    scores(['a', 1], ['b', 8]),
    scores(['a', 9], ['b', 3]),
  ]
  const points = gameType()
  const roundsWon = gameType({ scoringMode: 'ROUNDS_WON' })

  it('recomputes consistent detail when the scoring changes', () => {
    const m = match({ playerScores: scores(['a', 20], ['b', 13]), rounds })
    expect(rescoreMatch(m, points, roundsWon).playerScores).toEqual(scores(['a', 2], ['b', 1]))
  })

  it('returns the same match when nothing changes, without detail, or with inconsistent detail', () => {
    const consistent = match({ playerScores: scores(['a', 20], ['b', 13]), rounds })
    const none = match({ playerScores: scores(['a', 20], ['b', 13]) })
    const inconsistent = match({ playerScores: scores(['a', 50], ['b', 40]), rounds })
    expect(rescoreMatch(consistent, points, gameType({ winCondition: 'LOWEST_SCORE' }))).toBe(
      consistent,
    )
    expect(rescoreMatch(none, points, roundsWon)).toBe(none)
    expect(rescoreMatch(inconsistent, points, roundsWon)).toBe(inconsistent)
  })

  it('never turns a module-bound game into rounds won', () => {
    const m = match({ playerScores: scores(['a', 20], ['b', 13]), rounds })
    const bound = gameType({ moduleId: 'skyjo' })
    expect(rescoreMatch(m, bound, { ...bound, scoringMode: 'ROUNDS_WON' })).toBe(m)
  })
})

describe('syntheticRounds', () => {
  it('is a single round holding the final scores in points', () => {
    expect(syntheticRounds(gameType(), scores(['a', 20], ['b', 13]))).toEqual([
      scores(['a', 20], ['b', 13]),
    ])
  })

  it('is one round per round won, the winner scoring 1 under HIGHEST_SCORE', () => {
    const gt = gameType({ scoringMode: 'ROUNDS_WON' })
    const detail = syntheticRounds(gt, scores(['alice', 3], ['bob', 2]))
    expect(detail).toHaveLength(5)
    expect(detail?.[0]).toEqual(scores(['alice', 1], ['bob', 0]))
    expect(detail?.[4]).toEqual(scores(['alice', 0], ['bob', 1]))
    expect(scoresFromRounds(gt, detail ?? [], ['alice', 'bob'])).toEqual(
      scores(['alice', 3], ['bob', 2]),
    )
  })

  it('gives the winner 0 and the others 1 under LOWEST_SCORE', () => {
    const gt = gameType({ scoringMode: 'ROUNDS_WON', winCondition: 'LOWEST_SCORE' })
    const stored = scores(['alice', 3], ['bob', 2], ['carol', 0])
    const detail = syntheticRounds(gt, stored)
    expect(detail?.[0]).toEqual(scores(['alice', 0], ['bob', 1], ['carol', 1]))
    expect(scoresFromRounds(gt, detail ?? [], ['alice', 'bob', 'carol'])).toEqual(stored)
    const m = match({ playerScores: stored, rounds: detail ?? [] })
    expect(roundDetailStatus(m, 'LOWEST_SCORE')).toBe('consistent')
  })

  it('is empty when nobody won a round, and undefined for scores that cannot be rounds won', () => {
    const gt = gameType({ scoringMode: 'ROUNDS_WON' })
    expect(syntheticRounds(gt, scores(['a', 0], ['b', 0]))).toEqual([])
    expect(syntheticRounds(gt, scores(['a', -1], ['b', 0]))).toBeUndefined()
    expect(syntheticRounds(gt, scores(['a', 1.5], ['b', 0]))).toBeUndefined()
  })
})
