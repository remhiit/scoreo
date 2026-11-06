import { describe, expect, it } from 'vitest'
import { EMPTY_HAND, type Flip7Hand } from './hand'
import { cumulativeTotals, isGameOver, isTieBreak, roundScores, type Flip7Round } from './round'

const PLAYERS = ['a', 'b', 'c']

/** A round where each player's hand scores exactly the given number of points. */
function round(...scores: number[]): Flip7Round {
  return {
    entries: PLAYERS.map((playerId, index) => ({ playerId, hand: asHand(scores[index] ?? 0) })),
  }
}

/** Distinct Number cards (greedy, at most six), doubled by the ×2 for an even score. */
function asHand(score: number): Flip7Hand {
  const doubled = score > 0 && score % 2 === 0
  let rest = doubled ? score / 2 : score
  const numbers: number[] = []
  for (let value = 12; value >= 1 && numbers.length < 6; value--) {
    if (value <= rest) {
      numbers.push(value)
      rest -= value
    }
  }
  if (rest !== 0) throw new Error(`cannot build ${score}`)
  return { ...EMPTY_HAND, doubled, numbers: numbers.sort((x, y) => x - y) }
}

describe('round totals', () => {
  it('scores each player of a round', () => {
    expect([...roundScores(round(10, 0, 25)).values()]).toEqual([10, 0, 25])
  })

  it('accumulates rounds', () => {
    expect(cumulativeTotals(PLAYERS, [round(10, 5, 0), round(20, 5, 3)])).toEqual(
      new Map([
        ['a', 30],
        ['b', 10],
        ['c', 3],
      ]),
    )
  })
})

describe('end of game', () => {
  const nearlyThere = Array.from({ length: 3 }, () => round(60, 50, 40)) // 180 / 150 / 120

  it('goes on while nobody has reached 200', () => {
    expect(isGameOver(PLAYERS, nearlyThere)).toBe(false)
    expect(isGameOver(PLAYERS, [])).toBe(false)
  })

  it('ends at the end of the round that takes a sole leader to 200', () => {
    expect(isGameOver(PLAYERS, [...nearlyThere, round(20, 0, 0)])).toBe(true)
  })

  it('keeps going when the lead is tied past 200, then ends on the tie-break', () => {
    const tied = [...nearlyThere, round(30, 60, 0)] // 210 / 210 / 120
    expect(isGameOver(PLAYERS, tied)).toBe(false)
    expect(isTieBreak(PLAYERS, tied)).toBe(true)

    const broken = [...tied, round(5, 0, 0)]
    expect(isGameOver(PLAYERS, broken)).toBe(true)
    expect(isTieBreak(PLAYERS, broken)).toBe(false)
  })

  it('ends when the sole leader is past 200 even if others are tied below', () => {
    expect(isGameOver(PLAYERS, [...nearlyThere, round(40, 0, 30)])).toBe(true) // 220 / 150 / 150
  })
})
