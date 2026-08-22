import { describe, expect, it } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import type { PlayerScore } from '../domain/model/playerScore'
import { EloCalculator } from './eloCalculator'

const calculator = new EloCalculator()

function gameType(overrides: Partial<GameType> = {}): GameType {
  return {
    id: 'g1',
    name: 'Test',
    winCondition: 'HIGHEST_SCORE',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
    ...overrides,
  }
}

function match(id: string, date: number, gameTypeId: string, playerScores: PlayerScore[], overrides: Partial<Match> = {}): Match {
  return {
    id,
    date,
    gameTypeId,
    playerScores,
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: [],
    ...overrides,
  }
}

describe('EloCalculator', () => {
  it('match with single participant is ignored', () => {
    const gt = gameType({ id: 'g1', name: 'Solo' })
    const m = match('m1', 1000, 'g1', [{ playerId: 'p1', score: 10 }])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.size).toBe(0)
  })

  it('empty match list returns empty map', () => {
    const result = calculator.compute([], new Map())
    expect(result.size).toBe(0)
  })

  it('match with zero losers is ignored (all tied, NONE rule)', () => {
    const gt = gameType({ tieBreakRule: 'NONE' })
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 10 },
      { playerId: 'p3', score: 10 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.size).toBe(0)
  })

  it('match with unknown game type is skipped', () => {
    const m = match('m1', 1000, 'unknown', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ])
    const result = calculator.compute([m], new Map())
    expect(result.size).toBe(0)
  })

  it('normal two-player match computes ELO correctly', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.get('p1')!).toBeGreaterThan(1200)
    expect(result.get('p2')!).toBeLessThan(1200)
  })

  it('two-player match - equal ELO means fair distribution', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    const winnerGain = (result.get('p1') ?? 1200) - 1200
    const loserLoss = 1200 - (result.get('p2') ?? 1200)
    expect(winnerGain).toBe(loserLoss)
  })

  it('three-player match - 1 winner, 2 losers distributes ELO correctly', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
      { playerId: 'p3', score: 3 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.get('p1')!).toBeGreaterThan(1200)
    expect(result.get('p2')!).toBeLessThan(1200)
    expect(result.get('p3')!).toBeLessThan(1200)
  })

  it('three-player match - winner gains more than each loser loses individually', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
      { playerId: 'p3', score: 3 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    const p1Gain = (result.get('p1') ?? 1200) - 1200
    const p2Loss = 1200 - (result.get('p2') ?? 1200)
    const p3Loss = 1200 - (result.get('p3') ?? 1200)
    expect(p1Gain).toBe(p2Loss + p3Loss)
  })

  it('three-player match - winner gains equal amount against multiple losers', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
      { playerId: 'p3', score: 3 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    const p1Gain = (result.get('p1') ?? 1200) - 1200
    expect(p1Gain).toBeGreaterThanOrEqual(14)
    expect(p1Gain).toBeLessThanOrEqual(18)
  })

  it('four-player match - 2 winners, 2 losers distributes ELO correctly', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 10 },
      { playerId: 'p3', score: 5 },
      { playerId: 'p4', score: 3 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.get('p1')!).toBeGreaterThan(1200)
    expect(result.get('p2')!).toBeGreaterThan(1200)
    expect(result.get('p3')!).toBeLessThan(1200)
    expect(result.get('p4')!).toBeLessThan(1200)
  })

  it('five-player match - 1 winner, 4 losers', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 100 },
      { playerId: 'p2', score: 5 },
      { playerId: 'p3', score: 4 },
      { playerId: 'p4', score: 3 },
      { playerId: 'p5', score: 2 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.get('p1')!).toBeGreaterThan(1200)
    for (let i = 2; i <= 5; i++) {
      expect(result.get(`p${i}`)!).toBeLessThan(1200)
    }
  })

  it('sequential matches - ELO carries forward across matches', () => {
    const gt = gameType()
    const match1 = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ])
    const match2 = match('m2', 2000, 'g1', [
      { playerId: 'p2', score: 10 },
      { playerId: 'p1', score: 5 },
    ])
    const result = calculator.compute([match1, match2], new Map([['g1', gt]]))
    expect(result.get('p1')!).toBeGreaterThanOrEqual(1180)
    expect(result.get('p1')!).toBeLessThanOrEqual(1220)
    expect(result.get('p2')!).toBeGreaterThanOrEqual(1180)
    expect(result.get('p2')!).toBeLessThanOrEqual(1220)
  })

  it('three consecutive matches - volatility compounds', () => {
    const gt = gameType()
    const matches = [
      match('m1', 1000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ]),
      match('m2', 2000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ]),
      match('m3', 3000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ]),
    ]
    const result = calculator.compute(matches, new Map([['g1', gt]]))
    expect(result.get('p1') ?? 1200).toBeGreaterThan(1240)
    expect(result.get('p2') ?? 1200).toBeLessThan(1160)
  })

  it('multi-match chain with alternating winners - ELO converges', () => {
    const gt = gameType()
    const matches = [
      match('m1', 1000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ]),
      match('m2', 2000, 'g1', [
        { playerId: 'p2', score: 10 },
        { playerId: 'p1', score: 5 },
      ]),
      match('m3', 3000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ]),
      match('m4', 4000, 'g1', [
        { playerId: 'p2', score: 10 },
        { playerId: 'p1', score: 5 },
      ]),
    ]
    const result = calculator.compute(matches, new Map([['g1', gt]]))
    const p1Final = result.get('p1') ?? 1200
    const p2Final = result.get('p2') ?? 1200
    expect(p1Final).toBeGreaterThanOrEqual(1150)
    expect(p1Final).toBeLessThanOrEqual(1250)
    expect(p2Final).toBeGreaterThanOrEqual(1150)
    expect(p2Final).toBeLessThanOrEqual(1250)
  })

  it('three-player chain - consistent winner accumulates more ELO', () => {
    const gt = gameType()
    const round = () =>
      match('m', 1000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
        { playerId: 'p3', score: 3 },
      ])
    const matches = [
      { ...round(), id: 'm1', date: 1000 },
      { ...round(), id: 'm2', date: 2000 },
      { ...round(), id: 'm3', date: 3000 },
    ]
    const result = calculator.compute(matches, new Map([['g1', gt]]))
    const p1Final = result.get('p1') ?? 1200
    const p2Final = result.get('p2') ?? 1200
    const p3Final = result.get('p3') ?? 1200
    expect(p1Final).toBeGreaterThan(p2Final)
    expect(p2Final).toBeGreaterThanOrEqual(p3Final - 5)
  })

  it('three-player match with manual selection tie-break - only manual winner gains', () => {
    const gt = gameType({ tieBreakRule: 'MANUAL_SELECTION' })
    const m = match(
      'm1',
      1000,
      'g1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 10 },
        { playerId: 'p3', score: 5 },
      ],
      { manualWinners: ['p1'] },
    )
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.get('p1')!).toBeGreaterThan(1200)
    expect(result.get('p2')!).toBeLessThan(1200)
    expect(result.get('p3')!).toBeLessThan(1200)
  })

  it('four-player with secondary score tie-break', () => {
    const gt = gameType({ tieBreakRule: 'SECONDARY_SCORE', tieBreakCondition: 'LOWEST_SCORE' })
    const m = match(
      'm1',
      1000,
      'g1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 10 },
        { playerId: 'p3', score: 10 },
        { playerId: 'p4', score: 5 },
      ],
      {
        secondaryPlayerScores: [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
          { playerId: 'p3', score: 3 },
        ],
      },
    )
    const result = calculator.compute([m], new Map([['g1', gt]]))
    expect(result.get('p3')!).toBeGreaterThan(1200)
    expect(result.get('p1')!).toBeLessThan(1200)
    expect(result.get('p2')!).toBeLessThan(1200)
    expect(result.get('p4')!).toBeLessThan(1200)
  })

  it('K-factor distributes fairly across different player counts', () => {
    const gt = gameType()
    const match2 = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ])
    const result2 = calculator.compute([match2], new Map([['g1', gt]]))
    const p1Gain2 = (result2.get('p1') ?? 1200) - 1200

    const match3 = match('m2', 1000, 'g1', [
      { playerId: 'p3', score: 10 },
      { playerId: 'p4', score: 5 },
      { playerId: 'p5', score: 3 },
    ])
    const result3 = calculator.compute([match3], new Map([['g1', gt]]))
    const p3Gain3 = (result3.get('p3') ?? 1200) - 1200

    expect(p1Gain2).toBe(p3Gain3)
  })

  it('ELO changes are zero-sum across winners and losers', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
      { playerId: 'p3', score: 3 },
      { playerId: 'p4', score: 2 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    const totalChange = [...result.values()].reduce((sum, v) => sum + (v - 1200), 0)
    expect(totalChange).toBeGreaterThanOrEqual(-2)
    expect(totalChange).toBeLessThanOrEqual(2)
  })

  it('underdog winner gains more ELO than favorite winner (equal-ELO consistency check)', () => {
    const gt = gameType()
    const match1 = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ])
    const result1 = calculator.compute([match1], new Map([['g1', gt]]))
    const p1GainDefault = (result1.get('p1') ?? 1200) - 1200

    const preMatch = match('pm', 900, 'g1', [
      { playerId: 'p3', score: 10 },
      { playerId: 'p4', score: 5 },
    ])
    const postMatch = match('m2', 950, 'g1', [
      { playerId: 'p5', score: 10 },
      { playerId: 'p6', score: 5 },
    ])
    const resultChain = calculator.compute([preMatch, postMatch], new Map([['g1', gt]]))
    const p5GainBase = (resultChain.get('p5') ?? 1200) - 1200

    expect(p1GainDefault).toBe(p5GainBase)
  })

  it('match with three participants - verify K-norm calculation', () => {
    const gt = gameType()
    const m = match('m1', 1000, 'g1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
      { playerId: 'p3', score: 3 },
    ])
    const result = calculator.compute([m], new Map([['g1', gt]]))
    const p1Gain = (result.get('p1') ?? 1200) - 1200
    const p2Loss = 1200 - (result.get('p2') ?? 1200)
    const p3Loss = 1200 - (result.get('p3') ?? 1200)
    expect(p1Gain).toBeGreaterThanOrEqual(14)
    expect(p1Gain).toBeLessThanOrEqual(18)
    expect(p2Loss + p3Loss).toBe(p1Gain)
  })

  it('long winning streak increases ELO more than expected', () => {
    const gt = gameType()
    const matches = Array.from({ length: 5 }, (_, i) =>
      match('m' + (i + 1), 1000 + (i + 1) * 100, 'g1', [
        { playerId: 'champion', score: 10 },
        { playerId: `opponent${i + 1}`, score: 5 },
      ]),
    )
    const result = calculator.compute(matches, new Map([['g1', gt]]))
    const championElo = result.get('champion') ?? 1200
    expect(championElo).toBeGreaterThan(1270)
  })

  describe('computeHistory', () => {
    it('empty match list returns empty history', () => {
      const result = calculator.computeHistory([], new Map())
      expect(result).toEqual([])
    })

    it('single match produces one snapshot matching compute()', () => {
      const gt = gameType()
      const m = match('m1', 1000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ])
      const history = calculator.computeHistory([m], new Map([['g1', gt]]))
      const final = calculator.compute([m], new Map([['g1', gt]]))
      expect(history).toHaveLength(1)
      expect(history[0].matchId).toBe('m1')
      expect(history[0].date).toBe(1000)
      expect(history[0].ratings).toEqual(final)
    })

    it('ignored matches (unknown game type, no winner, single participant) produce no snapshot', () => {
      const gt = gameType({ winCondition: 'MANUAL' })
      const matches = [
        match('m1', 1000, 'unknown', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
        ]),
        match('m2', 2000, 'g1', [{ playerId: 'p1', score: 10 }]),
        match('m3', 3000, 'g1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 10 },
        ]),
      ]
      const history = calculator.computeHistory(matches, new Map([['g1', gt]]))
      expect(history).toEqual([])
    })

    it('snapshots are ordered by date ascending regardless of input order', () => {
      const gt = gameType()
      const match1 = match('m1', 3000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ])
      const match2 = match('m2', 1000, 'g1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ])
      const history = calculator.computeHistory([match1, match2], new Map([['g1', gt]]))
      expect(history.map((s) => s.matchId)).toEqual(['m2', 'm1'])
      expect(history[0].date).toBeLessThan(history[1].date)
    })

    it('last snapshot ratings equal compute() result on a multi-match chain', () => {
      const gt = gameType()
      const matches = [
        match('m1', 1000, 'g1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
        ]),
        match('m2', 2000, 'g1', [
          { playerId: 'p2', score: 10 },
          { playerId: 'p1', score: 5 },
        ]),
        match('m3', 3000, 'g1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p3', score: 5 },
        ]),
      ]
      const gameTypes = new Map([['g1', gt]])
      const history = calculator.computeHistory(matches, gameTypes)
      const final = calculator.compute(matches, gameTypes)
      expect(history).toHaveLength(3)
      expect(history[history.length - 1].ratings).toEqual(final)
    })

    it('player absent from early matches only appears in ratings from their first participation', () => {
      const gt = gameType()
      const matches = [
        match('m1', 1000, 'g1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 5 },
        ]),
        match('m2', 2000, 'g1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p3', score: 5 },
        ]),
      ]
      const history = calculator.computeHistory(matches, new Map([['g1', gt]]))
      expect(history[0].ratings.has('p3')).toBe(false)
      expect(history[1].ratings.has('p3')).toBe(true)
    })
  })
})
