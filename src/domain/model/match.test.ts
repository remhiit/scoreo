import { describe, expect, it } from 'vitest'
import type { GameType } from './gameType'
import { getWinners, isTieBreakIndeterminate, type Match } from './match'
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

function match(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    date: 0,
    gameTypeId: '1',
    playerScores: [],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: [],
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
    const gt = gameType({ name: 'Custom', winCondition: 'MANUAL', tieBreakRule: 'MANUAL_SELECTION' })
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
