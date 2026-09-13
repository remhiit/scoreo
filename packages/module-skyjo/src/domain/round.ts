import { z } from 'zod'

/**
 * One player's revealed-card total for a round, before the doubling rule.
 * Skyjo is played with physical cards: the sum is added up at the table and
 * entered here, never computed from a simulated grid — see this package's
 * `doc/functional/feature.md` for why the module stops at that boundary.
 */
export interface SkyjoRoundEntry {
  readonly playerId: string
  readonly rawScore: number
}

export const SkyjoRoundEntrySchema = z.object({
  playerId: z.string(),
  rawScore: z.number().int(),
})

/**
 * A full round: every player's raw total, plus who ended it — the player who
 * flipped their last card first, which is what the doubling rule keys on.
 */
export interface SkyjoRound {
  readonly enderPlayerId: string
  readonly entries: readonly SkyjoRoundEntry[]
}

export const SkyjoRoundSchema = z.object({
  enderPlayerId: z.string(),
  entries: z.array(SkyjoRoundEntrySchema),
})

/** The game ends the instant a played round leaves someone at or past this total. */
export const END_THRESHOLD = 100

/**
 * The score a round actually adds to each player's total.
 *
 * Standard rule: the round-ender's raw score is doubled unless it is already
 * the round's lowest. A tie for lowest still counts as "the lowest" — the
 * ender is not doubled — the same ruling ties get in `buildRanking`
 * (`moduleResult.ts`): this module never treats a tie as "not enough".
 */
export function appliedRoundScores(round: SkyjoRound): ReadonlyMap<string, number> {
  const lowest = Math.min(...round.entries.map((entry) => entry.rawScore))
  return new Map(
    round.entries.map((entry) => {
      const doubled = entry.playerId === round.enderPlayerId && entry.rawScore > lowest
      return [entry.playerId, doubled ? entry.rawScore * 2 : entry.rawScore]
    }),
  )
}

/** Running total per player after every round played so far, in order. */
export function cumulativeTotals(
  playerIds: readonly string[],
  rounds: readonly SkyjoRound[],
): Map<string, number> {
  const totals = new Map(playerIds.map((playerId) => [playerId, 0]))
  for (const round of rounds) {
    for (const [playerId, score] of appliedRoundScores(round)) {
      totals.set(playerId, (totals.get(playerId) ?? 0) + score)
    }
  }
  return totals
}

/** True once a played round has left someone at or past `END_THRESHOLD`. */
export function isGameOver(playerIds: readonly string[], rounds: readonly SkyjoRound[]): boolean {
  const totals = cumulativeTotals(playerIds, rounds)
  return [...totals.values()].some((total) => total >= END_THRESHOLD)
}

/**
 * A structural copy with no `readonly` modifiers, matching what
 * `SkyjoRoundSchema`'s `z.infer` produces — needed wherever a round log is
 * handed to something typed straight off that schema (the draft, the
 * `moduleData` payload), since a `readonly` array is never assignable to a
 * mutable one even when nothing actually mutates it afterwards.
 */
export function toPlainRounds(rounds: readonly SkyjoRound[]) {
  return rounds.map((round) => ({
    enderPlayerId: round.enderPlayerId,
    entries: round.entries.map((entry) => ({ playerId: entry.playerId, rawScore: entry.rawScore })),
  }))
}
