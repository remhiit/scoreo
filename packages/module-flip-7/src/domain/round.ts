import { z } from 'zod'
import { END_THRESHOLD, Flip7HandSchema, handScore, toPlainHand, type Flip7Hand } from './hand'

export interface Flip7RoundEntry {
  readonly playerId: string
  readonly hand: Flip7Hand
}

/** A played round: every player's hand as it stood when the round was scored. */
export interface Flip7Round {
  readonly entries: readonly Flip7RoundEntry[]
}

export const Flip7RoundSchema = z.object({
  entries: z.array(z.object({ playerId: z.string(), hand: Flip7HandSchema })),
})

/** The points each player scored in one round. */
export function roundScores(round: Flip7Round): ReadonlyMap<string, number> {
  return new Map(round.entries.map((entry) => [entry.playerId, handScore(entry.hand)]))
}

/** Running total per player after every round played so far. */
export function cumulativeTotals(
  playerIds: readonly string[],
  rounds: readonly Flip7Round[],
): Map<string, number> {
  const totals = new Map(playerIds.map((playerId) => [playerId, 0]))
  for (const round of rounds) {
    for (const [playerId, score] of roundScores(round)) {
      if (totals.has(playerId)) totals.set(playerId, (totals.get(playerId) ?? 0) + score)
    }
  }
  return totals
}

/**
 * True at the end of a round that left someone at or past `END_THRESHOLD`
 * with a total nobody else shares. The publisher's FAQ: players tied for the
 * lead past 200 keep playing rounds until there is one winner — so a tie at
 * the top keeps the game going, however high the totals are.
 */
export function isGameOver(playerIds: readonly string[], rounds: readonly Flip7Round[]): boolean {
  const totals = [...cumulativeTotals(playerIds, rounds).values()]
  if (totals.length === 0) return false
  const best = Math.max(...totals)
  return best >= END_THRESHOLD && totals.filter((total) => total === best).length === 1
}

/** True when the lead is shared past the threshold: the round after this one is a tie-break. */
export function isTieBreak(playerIds: readonly string[], rounds: readonly Flip7Round[]): boolean {
  const totals = [...cumulativeTotals(playerIds, rounds).values()]
  if (totals.length === 0) return false
  const best = Math.max(...totals)
  return best >= END_THRESHOLD && totals.filter((total) => total === best).length > 1
}

/** A copy without `readonly` arrays, for the draft and `moduleData` payloads. */
export function toPlainRounds(rounds: readonly Flip7Round[]) {
  return rounds.map((round) => ({
    entries: round.entries.map((entry) => ({
      playerId: entry.playerId,
      hand: toPlainHand(entry.hand),
    })),
  }))
}
