import { assertRoundsSumToRanking } from '@scoreboards/module-api'
import { describe, expect, it } from 'vitest'
import { EMPTY_HAND } from './hand'
import { buildRanking, Flip7ModuleDataSchema, toModuleMatchResult } from './moduleResult'
import type { Flip7Round } from './round'

const ROUNDS: Flip7Round[] = [
  {
    entries: [
      { playerId: 'a', hand: { ...EMPTY_HAND, numbers: [5, 7], doubled: true, modifiers: [4] } }, // 28
      { playerId: 'b', hand: { ...EMPTY_HAND, busted: true, numbers: [12] } }, // 0
    ],
  },
  {
    entries: [
      { playerId: 'a', hand: { ...EMPTY_HAND, numbers: [1] } }, // 1
      { playerId: 'b', hand: { ...EMPTY_HAND, numbers: [0, 1, 2, 3, 4, 5, 6] } }, // 36
    ],
  },
]

describe('buildRanking', () => {
  it('ranks the highest total first', () => {
    expect(buildRanking(['a', 'b'], ROUNDS)).toEqual([
      { playerId: 'b', score: 36, rank: 1 },
      { playerId: 'a', score: 29, rank: 2 },
    ])
  })

  it('shares a rank on a tie', () => {
    const ranking = buildRanking(
      ['a', 'b', 'c'],
      [
        {
          entries: [
            { playerId: 'a', hand: { ...EMPTY_HAND, numbers: [3] } },
            { playerId: 'b', hand: { ...EMPTY_HAND, numbers: [3] } },
            { playerId: 'c', hand: { ...EMPTY_HAND, numbers: [1] } },
          ],
        },
      ],
    )
    expect(ranking.map((entry) => entry.rank)).toEqual([1, 1, 3])
  })
})

describe('toModuleMatchResult', () => {
  it('produces a result whose rounds sum to the ranking', () => {
    const result = toModuleMatchResult({ playerIds: ['a', 'b'], rounds: ROUNDS })
    expect(() => assertRoundsSumToRanking(result)).not.toThrow()
    expect(result.rounds).toEqual([
      {
        label: 'Manche 1',
        scores: [
          { playerId: 'a', score: 28 },
          { playerId: 'b', score: 0 },
        ],
      },
      {
        label: 'Manche 2',
        scores: [
          { playerId: 'a', score: 1 },
          { playerId: 'b', score: 36 },
        ],
      },
    ])
    expect(result.matchId).toBeUndefined()
  })

  it('carries a moduleData payload its own schema reads back', () => {
    const result = toModuleMatchResult({ playerIds: ['a', 'b'], rounds: ROUNDS, matchId: 'm1' })
    expect(result.matchId).toBe('m1')
    expect(result.moduleData?.version).toBe(1)
    const parsed = Flip7ModuleDataSchema.parse(JSON.parse(JSON.stringify(result.moduleData?.data)))
    expect(parsed.players).toEqual(['a', 'b'])
    expect(parsed.rounds).toHaveLength(2)
  })
})
