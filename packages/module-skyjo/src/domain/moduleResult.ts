import type { ModuleMatch } from '@scoreboards/module-api'
import type { PlayerScore } from '@scoreboards/shared-domain'
import { z } from 'zod'
import { skyjoManifest } from '../module'
import {
  appliedRoundScores,
  cumulativeTotals,
  SkyjoRoundSchema,
  toPlainRounds,
  type SkyjoRound,
} from './round'

/** What the host stores next to the match, and hands straight back when reopened. */
export const SkyjoModuleDataSchema = z.object({
  players: z.array(z.string()),
  rounds: z.array(SkyjoRoundSchema),
})

export type SkyjoModuleData = z.infer<typeof SkyjoModuleDataSchema>

/**
 * Lower total wins. Ties share a rank — standard competition ranking, the same
 * shape Torī Valley and 1000 Sabords already use for their own ties.
 */
export function buildRanking(playerIds: readonly string[], rounds: readonly SkyjoRound[]) {
  const totals = cumulativeTotals(playerIds, rounds)
  return playerIds
    .map((playerId) => {
      const score = totals.get(playerId) ?? 0
      const rank = 1 + playerIds.filter((other) => (totals.get(other) ?? 0) < score).length
      return { playerId, score, rank }
    })
    .sort((a, b) => a.rank - b.rank)
}

function buildRounds(playerIds: readonly string[], rounds: readonly SkyjoRound[]): PlayerScore[][] {
  return rounds.map((round) => {
    const applied = appliedRoundScores(round)
    return playerIds.map((playerId) => ({ playerId, score: applied.get(playerId) ?? 0 }))
  })
}

export interface ModuleMatchInput {
  readonly playerIds: readonly string[]
  readonly rounds: readonly SkyjoRound[]
  /** Present only when reopening: turns the save into an update instead of a second match. */
  readonly matchId?: string
  /** Present only when replaying a match this module stored itself (e.g. an export path). */
  readonly playedAt?: number
}

/**
 * The finished (or in-progress-but-savable) game, in the shape the host stores.
 *
 * The host refuses a match whose rounds do not sum to its scores
 * (`assertMatchConsistent`); this module's tests run the same check on what it
 * builds, so a contradiction fails here first.
 */
export function toModuleMatch(input: ModuleMatchInput): ModuleMatch {
  const ranking = buildRanking(input.playerIds, input.rounds)
  return {
    ...(input.matchId === undefined ? {} : { id: input.matchId }),
    ...(input.playedAt === undefined ? {} : { date: input.playedAt }),
    playerScores: ranking.map(({ playerId, score }) => ({ playerId, score })),
    rounds: buildRounds(input.playerIds, input.rounds),
    // Lowest total wins; a tie at the first place names every tied player.
    manualWinners: ranking.filter((entry) => entry.rank === 1).map((entry) => entry.playerId),
    moduleData: {
      version: skyjoManifest.dataVersion,
      data: {
        players: [...input.playerIds],
        rounds: toPlainRounds(input.rounds),
      } satisfies SkyjoModuleData,
    },
  }
}
