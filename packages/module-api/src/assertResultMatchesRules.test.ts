import { describe, expect, it } from 'vitest'
import { assertResultMatchesRules } from './assertRoundsSumToRanking'
import type { ModuleMatchResult } from './matchResult'

const high = { winCondition: 'HIGHEST_SCORE', scoringMode: 'ROUNDS_WON' } as const
const low = { winCondition: 'LOWEST_SCORE', scoringMode: 'ROUNDS_WON' } as const

const ranking = [
  { playerId: 'p1', score: 2, rank: 1 },
  { playerId: 'p2', score: 1, rank: 2 },
]
const rounds = [
  {
    label: 'R1',
    scores: [
      { playerId: 'p1', score: 9 },
      { playerId: 'p2', score: 3 },
    ],
  },
  {
    label: 'R2',
    scores: [
      { playerId: 'p1', score: 7 },
      { playerId: 'p2', score: 1 },
    ],
  },
  {
    label: 'R3',
    scores: [
      { playerId: 'p1', score: 1 },
      { playerId: 'p2', score: 5 },
    ],
  },
]

describe('assertResultMatchesRules', () => {
  it('keeps the POINTS check when the mode is absent or POINTS', () => {
    const bad: ModuleMatchResult = { ranking, rounds }
    expect(() => assertResultMatchesRules(bad, { winCondition: 'HIGHEST_SCORE' })).toThrow(/sum/)
    expect(() =>
      assertResultMatchesRules(
        { ranking },
        { winCondition: 'HIGHEST_SCORE', scoringMode: 'POINTS' },
      ),
    ).not.toThrow()
  })

  it('accepts ROUNDS_WON scores matching the rounds won under HIGHEST_SCORE', () => {
    expect(() => assertResultMatchesRules({ ranking, rounds }, high)).not.toThrow()
  })

  it('counts rounds won under LOWEST_SCORE', () => {
    const lowRanking = [
      { playerId: 'p1', score: 1, rank: 1 },
      { playerId: 'p2', score: 2, rank: 2 },
    ]
    expect(() => assertResultMatchesRules({ ranking: lowRanking, rounds }, low)).not.toThrow()
    expect(() => assertResultMatchesRules({ ranking, rounds }, low)).toThrow(/won/)
  })

  it('accepts a ROUNDS_WON ranking without round detail', () => {
    expect(() => assertResultMatchesRules({ ranking }, high)).not.toThrow()
  })

  it('refuses a ROUNDS_WON score that disagrees with the round detail', () => {
    const wrong = [
      { playerId: 'p1', score: 3, rank: 1 },
      { playerId: 'p2', score: 0, rank: 2 },
    ]
    expect(() => assertResultMatchesRules({ ranking: wrong, rounds }, high)).toThrow(/p1 won 2/)
  })

  it('refuses a negative or fractional ROUNDS_WON score, naming the player', () => {
    expect(() =>
      assertResultMatchesRules({ ranking: [{ playerId: 'p9', score: -1, rank: 1 }] }, high),
    ).toThrow(/p9/)
    expect(() =>
      assertResultMatchesRules({ ranking: [{ playerId: 'p8', score: 1.5, rank: 1 }] }, high),
    ).toThrow(/p8/)
  })

  it('refuses ROUNDS_WON under a MANUAL win condition', () => {
    expect(() =>
      assertResultMatchesRules({ ranking }, { winCondition: 'MANUAL', scoringMode: 'ROUNDS_WON' }),
    ).toThrow(/MANUAL/)
  })
})
