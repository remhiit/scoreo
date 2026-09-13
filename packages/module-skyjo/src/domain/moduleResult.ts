import { assertRoundsSumToRanking, type ModuleMatchResult, type ModuleRound } from '@scoreboards/module-api'
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

function buildRounds(playerIds: readonly string[], rounds: readonly SkyjoRound[]): ModuleRound[] {
  return rounds.map((round, index) => {
    const applied = appliedRoundScores(round)
    return {
      label: `Manche ${index + 1}`,
      scores: playerIds.map((playerId) => ({ playerId, score: applied.get(playerId) ?? 0 })),
    }
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
 * `assertRoundsSumToRanking` is called here rather than left to the host: a
 * module handing over a contradictory result should fail its own tests first.
 */
export function toModuleMatchResult(input: ModuleMatchInput): ModuleMatchResult {
  const result: ModuleMatchResult = {
    ...(input.matchId === undefined ? {} : { matchId: input.matchId }),
    ...(input.playedAt === undefined ? {} : { playedAt: input.playedAt }),
    ranking: buildRanking(input.playerIds, input.rounds),
    rounds: buildRounds(input.playerIds, input.rounds),
    moduleData: {
      version: skyjoManifest.dataVersion,
      data: {
        players: [...input.playerIds],
        rounds: toPlainRounds(input.rounds),
      } satisfies SkyjoModuleData,
    },
  }
  assertRoundsSumToRanking(result)
  return result
}
