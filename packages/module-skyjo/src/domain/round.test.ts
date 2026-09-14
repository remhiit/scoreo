import { describe, expect, it } from 'vitest'
import { appliedRoundScores, cumulativeTotals, END_THRESHOLD, isGameOver } from './round'

describe('appliedRoundScores', () => {
  it('leaves every non-ender score untouched', () => {
    const applied = appliedRoundScores({
      enderPlayerId: 'p1',
      entries: [
        { playerId: 'p1', rawScore: 5 },
        { playerId: 'p2', rawScore: -2 },
      ],
    })
    expect(applied.get('p2')).toBe(-2)
  })

  it('doubles the ender when they are not the lowest', () => {
    const applied = appliedRoundScores({
      enderPlayerId: 'p1',
      entries: [
        { playerId: 'p1', rawScore: 8 },
        { playerId: 'p2', rawScore: 3 },
      ],
    })
    expect(applied.get('p1')).toBe(16)
  })

  it('does not double the ender when they are the strict lowest', () => {
    const applied = appliedRoundScores({
      enderPlayerId: 'p1',
      entries: [
        { playerId: 'p1', rawScore: 1 },
        { playerId: 'p2', rawScore: 4 },
      ],
    })
    expect(applied.get('p1')).toBe(1)
  })

  it('does not double the ender when tied for lowest', () => {
    const applied = appliedRoundScores({
      enderPlayerId: 'p1',
      entries: [
        { playerId: 'p1', rawScore: 2 },
        { playerId: 'p2', rawScore: 2 },
      ],
    })
    expect(applied.get('p1')).toBe(2)
  })

  it('doubles a negative ender score the same way', () => {
    const applied = appliedRoundScores({
      enderPlayerId: 'p1',
      entries: [
        { playerId: 'p1', rawScore: -1 },
        { playerId: 'p2', rawScore: -3 },
      ],
    })
    expect(applied.get('p1')).toBe(-2)
  })
})

describe('cumulativeTotals', () => {
  it('sums applied scores round after round', () => {
    const totals = cumulativeTotals(
      ['p1', 'p2'],
      [
        {
          enderPlayerId: 'p1',
          entries: [
            { playerId: 'p1', rawScore: 10 },
            { playerId: 'p2', rawScore: 4 },
          ],
        },
        {
          enderPlayerId: 'p2',
          entries: [
            { playerId: 'p1', rawScore: 2 },
            { playerId: 'p2', rawScore: 6 },
          ],
        },
      ],
    )
    // Round 1: p1 not lowest (10 > 4) -> doubled to 20. Round 2: p2 not lowest (6 > 2) -> 12.
    expect(totals.get('p1')).toBe(22)
    expect(totals.get('p2')).toBe(16)
  })

  it('starts every player at zero with no rounds played', () => {
    const totals = cumulativeTotals(['p1', 'p2'], [])
    expect(totals.get('p1')).toBe(0)
    expect(totals.get('p2')).toBe(0)
  })
})

describe('isGameOver', () => {
  it('is false while every total stays under the threshold', () => {
    const rounds = [
      {
        enderPlayerId: 'p1',
        entries: [
          { playerId: 'p1', rawScore: 10 },
          { playerId: 'p2', rawScore: 5 },
        ],
      },
    ]
    expect(isGameOver(['p1', 'p2'], rounds)).toBe(false)
  })

  it('is true the instant a total reaches the threshold', () => {
    const rounds = [
      {
        enderPlayerId: 'p2',
        entries: [
          { playerId: 'p1', rawScore: 10 },
          { playerId: 'p2', rawScore: END_THRESHOLD },
        ],
      },
    ]
    expect(isGameOver(['p1', 'p2'], rounds)).toBe(true)
  })
})
