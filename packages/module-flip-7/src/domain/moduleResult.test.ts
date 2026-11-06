import { assertMatchConsistent, newGameType } from '@scoreboards/shared-domain'
import { describe, expect, it } from 'vitest'
import { EMPTY_HAND } from './hand'
import { buildRanking, Flip7ModuleDataSchema, toModuleMatch } from './moduleResult'
import type { Flip7Round } from './round'

const GAME_TYPE = newGameType('gt-flip-7', 'Flip 7', 'HIGHEST_SCORE', { moduleId: 'flip-7' })

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

describe('toModuleMatch', () => {
  it('builds rounds that sum back to the scores (the domain invariant passes)', () => {
    const match = toModuleMatch({ playerIds: ['a', 'b'], rounds: ROUNDS })
    expect(() => assertMatchConsistent(match, GAME_TYPE)).not.toThrow()
    expect(match.playerScores).toEqual([
      { playerId: 'b', score: 36 },
      { playerId: 'a', score: 29 },
    ])
    expect(match.manualWinners).toEqual(['b'])
    expect(match.rounds).toEqual([
      [
        { playerId: 'a', score: 28 },
        { playerId: 'b', score: 0 },
      ],
      [
        { playerId: 'a', score: 1 },
        { playerId: 'b', score: 36 },
      ],
    ])
    expect(match.id).toBeUndefined()
  })

  it('names every player tied at the first place as a winner', () => {
    const tied: Flip7Round[] = [
      {
        entries: [
          { playerId: 'a', hand: { ...EMPTY_HAND, numbers: [3] } },
          { playerId: 'b', hand: { ...EMPTY_HAND, numbers: [3] } },
          { playerId: 'c', hand: { ...EMPTY_HAND, numbers: [1] } },
        ],
      },
    ]
    const match = toModuleMatch({ playerIds: ['a', 'b', 'c'], rounds: tied })
    expect(match.manualWinners).toEqual(['a', 'b'])
    expect(() => assertMatchConsistent(match, GAME_TYPE)).not.toThrow()
  })

  it('carries a moduleData payload its own schema reads back', () => {
    const match = toModuleMatch({ playerIds: ['a', 'b'], rounds: ROUNDS, matchId: 'm1' })
    expect(match.id).toBe('m1')
    expect(match.moduleData?.version).toBe(1)
    const parsed = Flip7ModuleDataSchema.parse(JSON.parse(JSON.stringify(match.moduleData?.data)))
    expect(parsed.players).toEqual(['a', 'b'])
    expect(parsed.rounds).toHaveLength(2)
  })
})
