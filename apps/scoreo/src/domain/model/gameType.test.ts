import { describe, expect, it } from 'vitest'
import {
  computeRoundsWon,
  computeWinners,
  effectiveScoringMode,
  newGameType,
  roundScoringChanged,
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

  it('counts a participant missing from a round as having scored 0 in it', () => {
    const partial = [scores(['alice', 3], ['bob', 5])]
    const won = computeRoundsWon(partial, 'LOWEST_SCORE', ['alice', 'bob', 'carol'])
    expect(won.get('carol')).toBe(1)
    expect(won.get('alice')).toBe(0)
    expect(computeRoundsWon([], 'HIGHEST_SCORE', ['alice']).get('alice')).toBe(0)
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
      active: false,
    })
    expect(gt).toMatchObject({
      scoringMode: 'ROUNDS_WON',
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
      tieBreakLabel: 'Bonus',
      moduleId: null,
      active: false,
    })
  })

  it('forces points for a module-bound game', () => {
    const gt = newGameType('1', 'Game', 'HIGHEST_SCORE', {
      scoringMode: 'ROUNDS_WON',
      moduleId: 'mod',
    })
    expect(gt).toMatchObject({ scoringMode: 'POINTS', moduleId: 'mod' })
  })

  it('forces points under a MANUAL win condition', () => {
    expect(newGameType('1', 'Game', 'MANUAL', { scoringMode: 'ROUNDS_WON' }).scoringMode).toBe(
      'POINTS',
    )
  })
})

describe('effectiveScoringMode', () => {
  const inputs = (
    winCondition: GameType['winCondition'],
    scoringMode: GameType['scoringMode'],
    moduleId: string | null = null,
  ) => ({ winCondition, scoringMode, moduleId })

  it('keeps the chosen mode when the app decides who wins', () => {
    expect(effectiveScoringMode(inputs('HIGHEST_SCORE', 'ROUNDS_WON'))).toBe('ROUNDS_WON')
    expect(effectiveScoringMode(inputs('LOWEST_SCORE', 'POINTS'))).toBe('POINTS')
  })

  it('forces POINTS for a MANUAL game', () => {
    expect(effectiveScoringMode(inputs('MANUAL', 'ROUNDS_WON'))).toBe('POINTS')
  })

  it('forces POINTS for a module-bound game, the module computing its own scores', () => {
    expect(effectiveScoringMode(inputs('HIGHEST_SCORE', 'ROUNDS_WON', 'skyjo'))).toBe('POINTS')
    expect(effectiveScoringMode(inputs('LOWEST_SCORE', 'ROUNDS_WON', 'skyjo'))).toBe('POINTS')
  })
})

describe('roundScoringChanged', () => {
  it('is true when the effective scoring mode changes', () => {
    expect(roundScoringChanged(gameType(), gameType({ scoringMode: 'ROUNDS_WON' }))).toBe(true)
    expect(
      roundScoringChanged(
        gameType({ scoringMode: 'ROUNDS_WON' }),
        gameType({ scoringMode: 'ROUNDS_WON', winCondition: 'MANUAL' }),
      ),
    ).toBe(true)
  })

  it('is true when who wins a round changes in rounds won', () => {
    const before = gameType({ scoringMode: 'ROUNDS_WON' })
    expect(roundScoringChanged(before, { ...before, winCondition: 'LOWEST_SCORE' })).toBe(true)
  })

  it('is false when the final score of the rounds stays the same', () => {
    expect(roundScoringChanged(gameType(), gameType({ winCondition: 'LOWEST_SCORE' }))).toBe(false)
    expect(
      roundScoringChanged(
        gameType({ moduleId: 'skyjo' }),
        gameType({ moduleId: 'skyjo', scoringMode: 'ROUNDS_WON' }),
      ),
    ).toBe(false)
  })
})
