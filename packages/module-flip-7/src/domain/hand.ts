import { z } from 'zod'

/**
 * Flip 7's scoring, as the publisher's FAQ states it (see this package's
 * `doc/functional/feature.md`): add the Number cards, double that sum if the
 * player holds the ×2, add the +2…+10 modifiers, then add 15 if the player
 * flipped seven different Number cards. A player who busted scores 0 — their
 * modifiers are lost with the rest.
 */

/** Number cards run from 0 to 12, every value distinct in a hand that did not bust. */
export const NUMBER_VALUES: readonly number[] = Array.from({ length: 13 }, (_, value) => value)

/** The additive modifier cards — one of each in the deck. */
export const ADDITIVE_MODIFIERS: readonly number[] = [2, 4, 6, 8, 10]

/** How many different Number cards make a Flip 7. */
export const FLIP_7_COUNT = 7

/** Bonus for a Flip 7, added after the ×2 and never doubled by it. */
export const FLIP_7_BONUS = 15

/** The game ends at the end of a round that leaves someone at or past this total. */
export const END_THRESHOLD = 200

/**
 * What one player kept in front of them at the end of a round.
 *
 * The cards stay recorded when `busted` is set, so un-ticking a mistaken bust
 * gives the hand back; they simply count for nothing while it holds.
 */
export interface Flip7Hand {
  readonly busted: boolean
  /** Distinct Number card values, 0–12, at most seven. */
  readonly numbers: readonly number[]
  /** Distinct additive modifier values among `ADDITIVE_MODIFIERS`. */
  readonly modifiers: readonly number[]
  /** The ×2 modifier card. */
  readonly doubled: boolean
}

const distinct = (values: readonly number[]) => new Set(values).size === values.length

export const Flip7HandSchema = z.object({
  busted: z.boolean(),
  numbers: z
    .array(z.number().int().min(0).max(12))
    .max(FLIP_7_COUNT)
    .refine(distinct, 'Number cards must be distinct'),
  modifiers: z
    .array(
      z
        .number()
        .int()
        .refine((value) => ADDITIVE_MODIFIERS.includes(value)),
    )
    .refine(distinct, 'Modifier cards must be distinct'),
  doubled: z.boolean(),
})

export const EMPTY_HAND: Flip7Hand = { busted: false, numbers: [], modifiers: [], doubled: false }

/** Seven different Number cards, bust aside. */
export function isFlip7(hand: Flip7Hand): boolean {
  return !hand.busted && hand.numbers.length === FLIP_7_COUNT
}

/** The points a hand adds to its player's total. */
export function handScore(hand: Flip7Hand): number {
  if (hand.busted) return 0
  const numbers = hand.numbers.reduce((sum, value) => sum + value, 0)
  const modifiers = hand.modifiers.reduce((sum, value) => sum + value, 0)
  return numbers * (hand.doubled ? 2 : 1) + modifiers + (isFlip7(hand) ? FLIP_7_BONUS : 0)
}

/** A copy without `readonly` arrays, matching what `Flip7HandSchema`'s `z.infer` produces. */
export function toPlainHand(hand: Flip7Hand) {
  return {
    busted: hand.busted,
    numbers: [...hand.numbers],
    modifiers: [...hand.modifiers],
    doubled: hand.doubled,
  }
}
