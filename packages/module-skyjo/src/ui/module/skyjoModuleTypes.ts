import { z } from 'zod'
import { SkyjoRoundSchema, type SkyjoRound } from '../../domain/round'

/**
 * Everything the screen needs to redraw itself, and nothing else.
 *
 * The running totals are absent on purpose: they are derived from `rounds`
 * (`cumulativeTotals`), so the reducer's output never depends on anything but
 * its own event log — the same reasoning 1000 Sabords' `historique` follows.
 */
export interface SkyjoState {
  /** Host player ids, in the order the host handed them over. */
  readonly playerIds: readonly string[]
  readonly rounds: readonly SkyjoRound[]
  /** Who is about to end the round being entered — unset until chosen. */
  readonly enderPlayerId: string | undefined
  /** Kept as typed strings, not numbers: a half-typed or empty field is a real state. */
  readonly scoreInputs: Readonly<Record<string, string>>
  readonly confirmAbandon: boolean
}

export type SkyjoAction =
  | { type: 'selectEnder'; playerId: string }
  | { type: 'updateScoreInput'; playerId: string; value: string }
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

/**
 * A scoring session in progress: the round log plus the round currently being
 * entered — the turn state a reload must not lose.
 */
export const SkyjoDraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  players: z.array(z.string()),
  rounds: z.array(SkyjoRoundSchema),
  enderPlayerId: z.string().optional(),
  scoreInputs: z.record(z.string(), z.string()).default({}),
})

export type SkyjoDraft = z.infer<typeof SkyjoDraftSchema>
