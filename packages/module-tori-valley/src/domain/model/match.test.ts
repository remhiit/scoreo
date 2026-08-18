import { describe, expect, it } from 'vitest'
import { defaultObjectifCardSelection, emptyObjectifPoints } from './landscape'
import { emptyPlayerResult, matchWinners, scorePlayerResult, type Match } from './match'
import { emptyToriiCounts } from './torii'

describe('scorePlayerResult', () => {
  it('sums Torī, Parchemin, Pinceau, and Objectif points', () => {
    const result = {
      playerId: 'p1',
      toriiCounts: { ...emptyToriiCounts(), green: 1, red: 1 }, // series of 2 → 2 VP
      parcheminValue: 4 as const,
      hasPinceau: true, // +2 VP
      objectifPoints: { ...emptyObjectifPoints(), bamboo: 5, water: 3 },
    }
    expect(scorePlayerResult(result)).toBe(2 + 4 + 2 + 5 + 3)
  })

  it('scores an empty result as zero', () => {
    expect(scorePlayerResult(emptyPlayerResult('p1'))).toBe(0)
  })
})

describe('matchWinners', () => {
  const baseMatch: Match = {
    id: 'm1',
    playedAt: 0,
    playerIds: ['p1', 'p2'],
    results: [],
    objectifCards: defaultObjectifCardSelection(),
  }

  it('returns the single highest scorer', () => {
    const match: Match = {
      ...baseMatch,
      results: [
        { ...emptyPlayerResult('p1'), parcheminValue: 5 },
        { ...emptyPlayerResult('p2'), parcheminValue: 3 },
      ],
    }
    expect(matchWinners(match)).toEqual(['p1'])
  })

  it('breaks a score tie by Torī count', () => {
    const match: Match = {
      ...baseMatch,
      results: [
        {
          ...emptyPlayerResult('p1'),
          parcheminValue: 3,
          toriiCounts: { ...emptyToriiCounts(), green: 2 },
        },
        {
          ...emptyPlayerResult('p2'),
          parcheminValue: 3,
          toriiCounts: { ...emptyToriiCounts(), green: 1 },
        },
      ],
    }
    expect(matchWinners(match)).toEqual(['p1'])
  })

  it('breaks a score+Torī tie by Pinceau possession', () => {
    const match: Match = {
      ...baseMatch,
      results: [
        { ...emptyPlayerResult('p1'), parcheminValue: 3, hasPinceau: false },
        { ...emptyPlayerResult('p2'), parcheminValue: 3, hasPinceau: true },
      ],
    }
    expect(matchWinners(match)).toEqual(['p2'])
  })

  it('shares victory when nothing breaks the tie', () => {
    const match: Match = {
      ...baseMatch,
      results: [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
    }
    expect(matchWinners(match)).toEqual(['p1', 'p2'])
  })

  it('returns an empty array when the match has no results', () => {
    expect(matchWinners(baseMatch)).toEqual([])
  })
})
