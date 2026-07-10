import { describe, expect, it } from 'vitest'
import { computeWinners, type GameType } from './gameType'
import type { PlayerScore } from './playerScore'

function scores(...pairs: [string, number][]): PlayerScore[] {
  return pairs.map(([playerId, score]) => ({ playerId, score }))
}

function gameType(overrides: Partial<GameType> = {}): GameType {
  return {
    id: '1',
    name: 'Game',
    winCondition: 'HIGHEST_SCORE',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
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
    const winners = computeWinners(gt, scores(['alice', 10], ['bob', 5], ['charlie', 3]), 'LOWEST_SCORE')
    expect(winners).toEqual(['charlie'])
  })

  it('with HIGHEST_SCORE condition returns max', () => {
    const gt = gameType({ name: 'Belote', winCondition: 'LOWEST_SCORE' })
    const winners = computeWinners(gt, scores(['alice', 5], ['bob', 10], ['charlie', 3]), 'HIGHEST_SCORE')
    expect(winners).toEqual(['bob'])
  })

  it('with custom condition returns all tied', () => {
    const gt = gameType({ winCondition: 'HIGHEST_SCORE' })
    const winners = computeWinners(gt, scores(['alice', 1], ['bob', 1], ['charlie', 3]), 'LOWEST_SCORE')
    expect(new Set(winners)).toEqual(new Set(['alice', 'bob']))
  })
})
