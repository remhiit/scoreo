import { describe, expect, it } from 'vitest'
import {
  computeRoundsWon,
  computeWinners,
  effectiveScoringMode,
  newGameType,
  type GameType,
} from './gameType'
import { GameTypeSchema } from './gameType.schema'
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

describe('computeWinners', () => {
  it('HIGHEST_SCORE returns player with max score', () => {
    const gt = gameType({ name: 'Belote', winCondition: 'HIGHEST_SCORE' })
    expect(computeWinners(gt, scores(['alice', 5], ['bob', 10], ['charlie', 3]))).toEqual(['bob'])
  })

  it('HIGHEST_SCORE returns all tied winners', () => {
    const gt = gameType({ winCondition: 'HIGHEST_SCORE' })
    const winners = computeWinners(gt, scores(['alice', 10], ['bob', 10], ['charlie', 3]))
    expect(new Set(winners)).toEqual(new Set(['alice', 'bob']))
  })

  it('LOWEST_SCORE returns player with min score', () => {
    const gt = gameType({ name: 'Golf', winCondition: 'LOWEST_SCORE' })
    expect(computeWinners(gt, scores(['alice', 1], ['bob', 5], ['charlie', 3]))).toEqual(['alice'])
  })

  it('LOWEST_SCORE returns all tied winners', () => {
    const gt = gameType({ name: 'Golf', winCondition: 'LOWEST_SCORE' })
    const winners = computeWinners(gt, scores(['alice', 1], ['bob', 1], ['charlie', 3]))
    expect(new Set(winners)).toEqual(new Set(['alice', 'bob']))
  })

  it('MANUAL returns empty list', () => {
    const gt = gameType({ name: 'Custom', winCondition: 'MANUAL' })
    expect(computeWinners(gt, scores(['alice', 5], ['bob', 10]))).toEqual([])
  })

  it('returns empty for empty scores', () => {
    const gt = gameType()
    expect(computeWinners(gt, [])).toEqual([])
  })

  it('with custom condition uses that condition', () => {
    const gt = gameType({ winCondition: 'HIGHEST_SCORE' })
    const winners = computeWinners(
      gt,
      scores(['alice', 10], ['bob', 5], ['charlie', 3]),
      'LOWEST_SCORE',
    )
    expect(winners).toEqual(['charlie'])
  })

  it('with HIGHEST_SCORE condition returns max', () => {
    const gt = gameType({ name: 'Belote', winCondition: 'LOWEST_SCORE' })
    const winners = computeWinners(
      gt,
      scores(['alice', 5], ['bob', 10], ['charlie', 3]),
      'HIGHEST_SCORE',
    )
    expect(winners).toEqual(['bob'])
  })

  it('with custom condition returns all tied', () => {
    const gt = gameType({ winCondition: 'HIGHEST_SCORE' })
    const winners = computeWinners(
      gt,
      scores(['alice', 1], ['bob', 1], ['charlie', 3]),
      'LOWEST_SCORE',
    )
    expect(new Set(winners)).toEqual(new Set(['alice', 'bob']))
  })
})

describe('computeRoundsWon', () => {
  const rounds = [
    scores(['alice', 10], ['bob', 5], ['carol', 1]),
    scores(['alice', 2], ['bob', 8], ['carol', 1]),
    scores(['alice', 7], ['bob', 7], ['carol', 0]),
  ]

  it('HIGHEST_SCORE gives the round to the top score, ties included', () => {
    const won = computeRoundsWon(rounds, 'HIGHEST_SCORE')
    expect(won.get('alice')).toBe(2)
    expect(won.get('bob')).toBe(2)
    expect(won.get('carol')).toBe(0)
  })

  it('LOWEST_SCORE gives the round to the lowest score, ties included', () => {
    const won = computeRoundsWon(rounds, 'LOWEST_SCORE')
    expect(won.get('alice')).toBe(0)
    expect(won.get('bob')).toBe(0)
    expect(won.get('carol')).toBe(3)
  })

  it('every player wins a round they all tie', () => {
    const won = computeRoundsWon([scores(['alice', 4], ['bob', 4])], 'HIGHEST_SCORE')
    expect([...won.entries()]).toEqual([
      ['alice', 1],
      ['bob', 1],
    ])
  })

  it('MANUAL wins nothing and no rounds yields no entries', () => {
    expect(computeRoundsWon(rounds, 'MANUAL').get('alice')).toBe(0)
    expect(computeRoundsWon([], 'HIGHEST_SCORE').size).toBe(0)
  })
})

describe('computeWinners with ROUNDS_WON', () => {
  it('rewards the highest count even when the win condition is LOWEST_SCORE', () => {
    const gt = gameType({ winCondition: 'LOWEST_SCORE', scoringMode: 'ROUNDS_WON' })
    expect(computeWinners(gt, scores(['alice', 1], ['bob', 3]))).toEqual(['bob'])
  })

  it('ignores ROUNDS_WON under a MANUAL win condition', () => {
    const gt = gameType({ winCondition: 'MANUAL', scoringMode: 'ROUNDS_WON' })
    expect(computeWinners(gt, scores(['alice', 1]))).toEqual([])
  })
})

describe('newGameType', () => {
  it('applies the same defaults as reading a minimal game type back', () => {
    expect(newGameType('1', 'Game', 'LOWEST_SCORE')).toEqual(
      GameTypeSchema.parse({ id: '1', name: 'Game', winCondition: 'LOWEST_SCORE' }),
    )
  })

  it('keeps the provided values', () => {
    const gt = newGameType('1', 'Game', 'HIGHEST_SCORE', {
      scoringMode: 'ROUNDS_WON',
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
      tieBreakLabel: 'Bonus',
      moduleId: 'mod',
    })
    expect(gt).toMatchObject({
      scoringMode: 'ROUNDS_WON',
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
      tieBreakLabel: 'Bonus',
      moduleId: 'mod',
      active: true,
    })
  })

  it('forces points under a MANUAL win condition', () => {
    expect(newGameType('1', 'Game', 'MANUAL', { scoringMode: 'ROUNDS_WON' }).scoringMode).toBe(
      'POINTS',
    )
  })
})

describe('effectiveScoringMode', () => {
  it('keeps the chosen mode when the app decides who wins', () => {
    expect(effectiveScoringMode('HIGHEST_SCORE', 'ROUNDS_WON')).toBe('ROUNDS_WON')
    expect(effectiveScoringMode('LOWEST_SCORE', 'POINTS')).toBe('POINTS')
  })

  it('forces POINTS for a MANUAL game', () => {
    expect(effectiveScoringMode('MANUAL', 'ROUNDS_WON')).toBe('POINTS')
  })
})
