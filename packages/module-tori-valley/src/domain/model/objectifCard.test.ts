import { describe, expect, it } from 'vitest'
import { ValidationError } from './errors'
import { LANDSCAPE_TYPES, OBJECTIF_VARIANTS } from './landscape'
import { objectifCard, scoreObjectifCard } from './objectifCard'

describe('the card registry', () => {
  it('covers all 15 landscape/variant combinations', () => {
    for (const landscape of LANDSCAPE_TYPES) {
      for (const variant of OBJECTIF_VARIANTS) {
        expect(objectifCard(landscape, variant)).toBeDefined()
      }
    }
  })

  it('marks Village A and Eau C as not computable, with a reason', () => {
    for (const [landscape, variant] of [
      ['village', 'A'],
      ['water', 'C'],
    ] as const) {
      const card = objectifCard(landscape, variant)
      expect(card.computable).toBe(false)
      expect(card.notComputableReasonKey).toBeTruthy()
    }
  })

  it('marks every other card as computable with at least one input field', () => {
    for (const landscape of LANDSCAPE_TYPES) {
      for (const variant of OBJECTIF_VARIANTS) {
        const card = objectifCard(landscape, variant)
        if (!card.computable) continue
        expect(card.fields.length).toBeGreaterThan(0)
      }
    }
  })

  it('gives every field a label key and a range the UI can render', () => {
    for (const landscape of LANDSCAPE_TYPES) {
      for (const variant of OBJECTIF_VARIANTS) {
        for (const field of objectifCard(landscape, variant).fields) {
          expect(field.labelKey).toMatch(/^objectifCard\./)
          expect(field.max).toBeGreaterThanOrEqual(field.min)
        }
      }
    }
  })
})

describe('Bambou', () => {
  it('A scores the printed table by number of 2-tile groups', () => {
    const table = [0, 4, 9, 15, 22, 30]
    table.forEach((points, groups) => {
      expect(scoreObjectifCard('bamboo', 'A', { groups })).toBe(points)
    })
  })

  it('B adds 4 / 10 / 16 per group of 2 / 3 / 4 tiles', () => {
    expect(scoreObjectifCard('bamboo', 'B', { groupsOf2: 1, groupsOf3: 0, groupsOf4: 0 })).toBe(4)
    expect(scoreObjectifCard('bamboo', 'B', { groupsOf2: 0, groupsOf3: 1, groupsOf4: 0 })).toBe(10)
    expect(scoreObjectifCard('bamboo', 'B', { groupsOf2: 0, groupsOf3: 0, groupsOf4: 1 })).toBe(16)
    expect(scoreObjectifCard('bamboo', 'B', { groupsOf2: 2, groupsOf3: 1, groupsOf4: 1 })).toBe(34)
  })

  it("C scores the card's example: three plain, one corner, one crossing → 19", () => {
    expect(scoreObjectifCard('bamboo', 'C', { onDiagonal: 3, inCorner: 1, atCrossing: 1 })).toBe(19)
  })
})

describe('Cerisier', () => {
  it("A scores the card's example: 6 tiles with one full column of 4 → 18", () => {
    expect(scoreObjectifCard('cherryBlossom', 'A', { tiles: 6, fullColumns: 1 })).toBe(18)
  })

  it("B scores the card's example: 3 occupied columns → 9", () => {
    expect(scoreObjectifCard('cherryBlossom', 'B', { occupiedColumns: 3 })).toBe(9)
  })

  it("C scores the card's example: 2 Cerisier × 3 Village → 6", () => {
    expect(scoreObjectifCard('cherryBlossom', 'C', { cherryTiles: 2, villageTiles: 3 })).toBe(6)
  })
})

describe('Montagne', () => {
  it("A scores the card's example: 2 rows holding exactly one Mountain → 6", () => {
    expect(scoreObjectifCard('mountain', 'A', { rowsWithExactlyOne: 2 })).toBe(6)
  })

  it("B scores the card's example: 2 groups of 2+ tiles → 12", () => {
    expect(scoreObjectifCard('mountain', 'B', { groups: 2 })).toBe(12)
  })

  it("C scores the card's example: 3 Mountains with 3 Water adjacencies → 6", () => {
    expect(scoreObjectifCard('mountain', 'C', { tiles: 3, waterAdjacencies: 3 })).toBe(6)
  })
})

describe('Village', () => {
  it("B scores the card's example: a largest group of 5 → 20", () => {
    expect(scoreObjectifCard('village', 'B', { largestGroupSize: 5 })).toBe(20)
  })

  it("C scores the card's example: 4 distinct adjacent types in total → 8", () => {
    expect(scoreObjectifCard('village', 'C', { distinctAdjacentTypes: 4 })).toBe(8)
  })
})

describe('Eau', () => {
  it("A scores the card's example: a largest group of 5 touching both edges → 20", () => {
    expect(scoreObjectifCard('water', 'A', { largestGroupSize: 5, touchesTopAndBottom: 1 })).toBe(
      20,
    )
  })

  it('A drops the per-tile bonus when the group does not touch both edges', () => {
    expect(scoreObjectifCard('water', 'A', { largestGroupSize: 5, touchesTopAndBottom: 0 })).toBe(
      15,
    )
  })

  it("B scores the card's example: 2 isolated tiles on the edge → 8", () => {
    expect(scoreObjectifCard('water', 'B', { isolatedEdgeTiles: 2 })).toBe(8)
  })
})

describe('input validation', () => {
  it('rejects scoring a card that depends on the neighbours boards', () => {
    expect(() => scoreObjectifCard('village', 'A', {})).toThrow(ValidationError)
    expect(() => scoreObjectifCard('water', 'C', {})).toThrow(ValidationError)
  })

  it('rejects a missing count rather than treating it as zero', () => {
    expect(() => scoreObjectifCard('bamboo', 'B', { groupsOf2: 1 })).toThrow(ValidationError)
  })

  it('treats an absent flag as "no", since unticked is an answer', () => {
    expect(scoreObjectifCard('water', 'A', { largestGroupSize: 5 })).toBe(15)
    expect(scoreObjectifCard('bamboo', 'C', { onDiagonal: 1, inCorner: 0 })).toBe(3)
  })

  it('rejects a negative input', () => {
    expect(() => scoreObjectifCard('cherryBlossom', 'B', { occupiedColumns: -1 })).toThrow(
      ValidationError,
    )
  })

  it('rejects an input above the field maximum', () => {
    expect(() => scoreObjectifCard('bamboo', 'A', { groups: 99 })).toThrow(ValidationError)
  })

  it('rejects a non-integer input', () => {
    expect(() => scoreObjectifCard('mountain', 'B', { groups: 1.5 })).toThrow(ValidationError)
  })

  it('names the offending field on the error', () => {
    try {
      scoreObjectifCard('cherryBlossom', 'B', { occupiedColumns: -1 })
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError)
      expect((e as ValidationError).field).toBe('occupiedColumns')
    }
  })
})
