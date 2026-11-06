import { assertMatchConsistent, newGameType } from '@scoreboards/shared-domain'
import { describe, expect, it } from 'vitest'
import { buildRanking, SkyjoModuleDataSchema, toModuleMatch } from './moduleResult'
import type { SkyjoRound } from './round'

const GAME_TYPE = newGameType('gt-skyjo', 'Skyjo', 'LOWEST_SCORE', { moduleId: 'skyjo' })

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

describe('toModuleMatch', () => {
  it('builds rounds that sum back to the scores (the domain invariant passes)', () => {
    const match = toModuleMatch({ playerIds: PLAYER_IDS, rounds: ROUNDS })
    expect(() => assertMatchConsistent(match, GAME_TYPE)).not.toThrow()
  })

  it('scores lowest total first and names the lowest as the winner', () => {
    const match = toModuleMatch({ playerIds: PLAYER_IDS, rounds: ROUNDS })
    expect(match.playerScores).toEqual([
      { playerId: 'p1', score: 9 },
      { playerId: 'p3', score: 18 },
      { playerId: 'p2', score: 30 },
    ])
    expect(match.manualWinners).toEqual(['p1'])
    expect(match.rounds).toEqual([
      [
        { playerId: 'p1', score: 1 },
        { playerId: 'p2', score: 20 },
        { playerId: 'p3', score: 15 },
      ],
      [
        { playerId: 'p1', score: 8 },
        { playerId: 'p2', score: 10 },
        { playerId: 'p3', score: 3 },
      ],
    ])
  })

  it('stores the round log verbatim as moduleData, versioned by the manifest', () => {
    const result = toModuleMatch({ playerIds: PLAYER_IDS, rounds: ROUNDS })
    expect(result.moduleData?.version).toBe(1)
    const parsed = SkyjoModuleDataSchema.parse(result.moduleData?.data)
    expect(parsed.rounds).toEqual(ROUNDS)
    expect(parsed.players).toEqual(PLAYER_IDS)
  })

  it('carries the id only when reopening, and the date only when replaying', () => {
    const created = toModuleMatch({ playerIds: PLAYER_IDS, rounds: ROUNDS })
    expect(created.id).toBeUndefined()
    expect(created.date).toBeUndefined()

    const updated = toModuleMatch({
      playerIds: PLAYER_IDS,
      rounds: ROUNDS,
      matchId: 'match-1',
      playedAt: 1234,
    })
    expect(updated.id).toBe('match-1')
    expect(updated.date).toBe(1234)
  })

  // What the host stored before the module wrote `Match` fields itself: the
  // ranking order kept, `rank === 1` as the winners, the rounds copied. The
  // expectations are frozen literals of that old output, round contents included.
  describe('is equivalent to the match the host used to build from the ranking', () => {
    const tie: SkyjoRound[] = [
      {
        enderPlayerId: 'p1',
        entries: [
          { playerId: 'p1', rawScore: 5 },
          { playerId: 'p2', rawScore: 5 },
          { playerId: 'p3', rawScore: 12 },
        ],
      },
    ]
    const s = (playerId: string, score: number) => ({ playerId, score })
    const corpus: Record<
      string,
      {
        rounds: SkyjoRound[]
        scores: ReturnType<typeof s>[]
        winners: string[]
        playedRounds: ReturnType<typeof s>[][]
      }
    > = {
      'a decided game': {
        rounds: ROUNDS,
        scores: [s('p1', 9), s('p3', 18), s('p2', 30)],
        winners: ['p1'],
        playedRounds: [
          [s('p1', 1), s('p2', 20), s('p3', 15)],
          [s('p1', 8), s('p2', 10), s('p3', 3)],
        ],
      },
      'a tie for first place': {
        rounds: tie,
        scores: [s('p1', 5), s('p2', 5), s('p3', 12)],
        winners: ['p1', 'p2'],
        playedRounds: [[s('p1', 5), s('p2', 5), s('p3', 12)]],
      },
      'no round played': {
        rounds: [],
        scores: [s('p1', 0), s('p2', 0), s('p3', 0)],
        winners: ['p1', 'p2', 'p3'],
        playedRounds: [],
      },
    }

    for (const [name, { rounds, scores, winners, playedRounds }] of Object.entries(corpus)) {
      it(name, () => {
        expect(
          toModuleMatch({ playerIds: PLAYER_IDS, rounds, matchId: 'm1', playedAt: 99 }),
        ).toEqual({
          id: 'm1',
          date: 99,
          playerScores: scores,
          manualWinners: winners,
          rounds: playedRounds,
          moduleData: { version: 1, data: { players: PLAYER_IDS, rounds } },
        })
      })
    }
  })
})
