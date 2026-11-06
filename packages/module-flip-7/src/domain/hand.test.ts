import { describe, expect, it } from 'vitest'
import { EMPTY_HAND, Flip7HandSchema, handScore, isFlip7, type Flip7Hand } from './hand'

const hand = (overrides: Partial<Flip7Hand>): Flip7Hand => ({ ...EMPTY_HAND, ...overrides })

describe('handScore', () => {
  it('scores an empty hand 0', () => {
    expect(handScore(EMPTY_HAND)).toBe(0)
  })

  it('adds the Number cards', () => {
    expect(handScore(hand({ numbers: [0, 3, 12] }))).toBe(15)
  })

  it('doubles the Number cards only, then adds the modifiers', () => {
    // (5 + 7) × 2 + 4 + 10 — the publisher FAQ's order.
    expect(handScore(hand({ numbers: [5, 7], doubled: true, modifiers: [4, 10] }))).toBe(38)
  })

  it('scores modifiers alone, with no Number card', () => {
    expect(handScore(hand({ modifiers: [2, 8] }))).toBe(10)
  })

  it('scores a lone ×2 with no Number card 0', () => {
    expect(handScore(hand({ doubled: true }))).toBe(0)
  })

  it('adds the Flip 7 bonus after the ×2, never doubled', () => {
    const seven = [0, 1, 2, 3, 4, 5, 6] // sum 21
    expect(isFlip7(hand({ numbers: seven }))).toBe(true)
    expect(handScore(hand({ numbers: seven }))).toBe(36)
    expect(handScore(hand({ numbers: seven, doubled: true, modifiers: [6] }))).toBe(21 * 2 + 6 + 15)
  })

  it('scores a bust 0, modifiers and bonus included', () => {
    const busted = hand({
      busted: true,
      numbers: [0, 1, 2, 3, 4, 5, 6],
      modifiers: [10],
      doubled: true,
    })
    expect(isFlip7(busted)).toBe(false)
    expect(handScore(busted)).toBe(0)
  })
})

describe('Flip7HandSchema', () => {
  it('accepts a valid hand', () => {
    expect(Flip7HandSchema.safeParse(hand({ numbers: [1, 12], modifiers: [2] })).success).toBe(true)
  })

  it.each([
    ['a duplicate Number card', { numbers: [3, 3] }],
    ['a Number card out of range', { numbers: [13] }],
    ['eight Number cards', { numbers: [0, 1, 2, 3, 4, 5, 6, 7] }],
    ['an unknown modifier', { modifiers: [3] }],
    ['a duplicate modifier', { modifiers: [4, 4] }],
  ])('rejects %s', (_, overrides) => {
    expect(Flip7HandSchema.safeParse(hand(overrides)).success).toBe(false)
  })
})
