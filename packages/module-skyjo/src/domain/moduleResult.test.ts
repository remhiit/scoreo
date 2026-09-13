import { describe, expect, it } from 'vitest'
import { buildRanking, SkyjoModuleDataSchema, toModuleMatchResult } from './moduleResult'
import type { SkyjoRound } from './round'

const PLAYER_IDS = ['p1', 'p2', 'p3']

const ROUNDS: SkyjoRound[] = [
  {
    enderPlayerId: 'p1',
    entries: [
      { playerId: 'p1', rawScore: 1 },
      { playerId: 'p2', rawScore: 20 },
      { playerId: 'p3', rawScore: 15 },
    ],
  },
  {
    enderPlayerId: 'p2',
    // p2 ends but is not the lowest (5 > 3) -> doubled to 10.
    entries: [
      { playerId: 'p1', rawScore: 8 },
      { playerId: 'p2', rawScore: 5 },
      { playerId: 'p3', rawScore: 3 },
    ],
  },
]

describe('buildRanking', () => {
  it('ranks lowest total first', () => {
    const ranking = buildRanking(PLAYER_IDS, ROUNDS)
    // p1: 1 + 8 = 9, p2: 20 + 10 = 30, p3: 15 + 3 = 18.
    expect(ranking).toEqual([
      { playerId: 'p1', score: 9, rank: 1 },
      { playerId: 'p3', score: 18, rank: 2 },
      { playerId: 'p2', score: 30, rank: 3 },
    ])
  })

  it('gives tied totals the same rank', () => {
    const tied: SkyjoRound[] = [
      {
        enderPlayerId: 'p1',
        entries: [
          { playerId: 'p1', rawScore: 5 },
          { playerId: 'p2', rawScore: 5 },
          { playerId: 'p3', rawScore: 12 },
        ],
      },
    ]
    const ranking = buildRanking(PLAYER_IDS, tied)
    expect(ranking).toEqual([
      { playerId: 'p1', score: 5, rank: 1 },
      { playerId: 'p2', score: 5, rank: 1 },
      { playerId: 'p3', score: 12, rank: 3 },
    ])
  })
})

describe('toModuleMatchResult', () => {
  it('builds rounds that sum back to the ranking (assertRoundsSumToRanking passes)', () => {
    expect(() => toModuleMatchResult({ playerIds: PLAYER_IDS, rounds: ROUNDS })).not.toThrow()
  })

  it('stores the round log verbatim as moduleData, versioned by the manifest', () => {
    const result = toModuleMatchResult({ playerIds: PLAYER_IDS, rounds: ROUNDS })
    expect(result.moduleData?.version).toBe(1)
    const parsed = SkyjoModuleDataSchema.parse(result.moduleData?.data)
    expect(parsed.rounds).toEqual(ROUNDS)
    expect(parsed.players).toEqual(PLAYER_IDS)
  })

  it('carries matchId only when reopening, and playedAt only when replaying', () => {
    const created = toModuleMatchResult({ playerIds: PLAYER_IDS, rounds: ROUNDS })
    expect(created.matchId).toBeUndefined()
    expect(created.playedAt).toBeUndefined()

    const updated = toModuleMatchResult({
      playerIds: PLAYER_IDS,
      rounds: ROUNDS,
      matchId: 'match-1',
      playedAt: 1234,
    })
    expect(updated.matchId).toBe('match-1')
    expect(updated.playedAt).toBe(1234)
  })
})
