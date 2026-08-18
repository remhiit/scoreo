import { describe, expect, it } from 'vitest'
import { emptyToriiCounts, scoreTorii } from './torii'

describe('scoreTorii', () => {
  it('scores zero Torī as zero', () => {
    expect(scoreTorii(emptyToriiCounts())).toBe(0)
  })

  it('scores a single Torī as zero', () => {
    expect(scoreTorii({ ...emptyToriiCounts(), red: 1 })).toBe(0)
  })

  it('matches the rulebook worked example (p.4): 8 Torī → 12 VP', () => {
    // 1 series of 5 (10) + 1 series of 2 (2) + 1 series of 1 (0)
    const counts = { green: 3, red: 2, blue: 1, yellow: 1, purple: 1 }
    expect(scoreTorii(counts)).toBe(12)
  })

  it('scores one full series of each of the 5 colors as 10', () => {
    const counts = { green: 1, red: 1, blue: 1, yellow: 1, purple: 1 }
    expect(scoreTorii(counts)).toBe(10)
  })

  it('caps series size at the number of distinct colors held', () => {
    // Only 2 colors present: every series tops out at 2 distinct Torī.
    const counts = { green: 5, red: 5, blue: 0, yellow: 0, purple: 0 }
    expect(scoreTorii(counts)).toBe(5 * 2)
  })

  it('scores the maximum possible collection (7 of each color) as 70', () => {
    const counts = { green: 7, red: 7, blue: 7, yellow: 7, purple: 7 }
    expect(scoreTorii(counts)).toBe(7 * 10)
  })
})
