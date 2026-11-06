import { z } from 'zod'
import { Flip7HandSchema, type Flip7Hand } from '../../domain/hand'
import { Flip7RoundSchema, type Flip7Round } from '../../domain/round'

/**
 * Everything the screen needs to redraw itself, and nothing else.
 *
 * The running totals are absent on purpose: they are derived from `rounds`
 * (`cumulativeTotals`), so the reducer's output depends on its event log alone.
 */
export interface Flip7State {
  /** Host player ids, in the order the host handed them over. */
  readonly playerIds: readonly string[]
  readonly rounds: readonly Flip7Round[]
  /** The round being entered: each player's hand so far (absent = empty hand). */
  readonly hands: Readonly<Record<string, Flip7Hand>>
  readonly confirmAbandon: boolean
}

export type Flip7Action =
  | { type: 'toggleNumber'; playerId: string; value: number }
  | { type: 'toggleModifier'; playerId: string; value: number }
  | { type: 'toggleDoubled'; playerId: string }
  | { type: 'toggleBusted'; playerId: string }
  | { type: 'submitRound' }
  | { type: 'undoLastRound' }
  | { type: 'showAbandonConfirm' }
  | { type: 'dismissAbandonConfirm' }

/**
 * Bumped only when a draft stops being readable by this code. A draft written
 * by another version fails the literal below, and the screen starts a clean
 * game rather than reviving half of an older shape.
 */
export const DRAFT_VERSION = 1

/** A scoring session in progress: the round log plus the round being entered. */
export const Flip7DraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  players: z.array(z.string()),
  rounds: z.array(Flip7RoundSchema),
  hands: z.record(z.string(), Flip7HandSchema).default({}),
})

export type Flip7Draft = z.infer<typeof Flip7DraftSchema>
