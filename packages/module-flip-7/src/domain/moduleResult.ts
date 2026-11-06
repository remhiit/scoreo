import {
  assertRoundsSumToRanking,
  type ModuleMatchResult,
  type ModuleRound,
} from '@scoreboards/module-api'
import { z } from 'zod'
import { flip7Manifest } from '../module'
import {
  cumulativeTotals,
  Flip7RoundSchema,
  roundScores,
  toPlainRounds,
  type Flip7Round,
} from './round'

/** What the host stores next to the match, and hands straight back when reopened. */
export const Flip7ModuleDataSchema = z.object({
  players: z.array(z.string()),
  rounds: z.array(Flip7RoundSchema),
})

export type Flip7ModuleData = z.infer<typeof Flip7ModuleDataSchema>

/** Higher total wins. Ties share a rank (standard competition ranking). */
export function buildRanking(playerIds: readonly string[], rounds: readonly Flip7Round[]) {
  const totals = cumulativeTotals(playerIds, rounds)
  return playerIds
    .map((playerId) => {
      const score = totals.get(playerId) ?? 0
      const rank = 1 + playerIds.filter((other) => (totals.get(other) ?? 0) > score).length
      return { playerId, score, rank }
    })
    .sort((a, b) => a.rank - b.rank)
}

function buildRounds(playerIds: readonly string[], rounds: readonly Flip7Round[]): ModuleRound[] {
  return rounds.map((round, index) => {
    const scores = roundScores(round)
    return {
      label: `Manche ${index + 1}`,
      scores: playerIds.map((playerId) => ({ playerId, score: scores.get(playerId) ?? 0 })),
    }
  })
}

export interface ModuleMatchInput {
  readonly playerIds: readonly string[]
  readonly rounds: readonly Flip7Round[]
  /** Present only when reopening: turns the save into an update instead of a second match. */
  readonly matchId?: string
}

/**
 * The finished game, in the shape the host stores. `assertRoundsSumToRanking`
 * runs here too: a module handing over a contradictory result should fail its
 * own tests first.
 */
export function toModuleMatchResult(input: ModuleMatchInput): ModuleMatchResult {
  const result: ModuleMatchResult = {
    ...(input.matchId === undefined ? {} : { matchId: input.matchId }),
    ranking: buildRanking(input.playerIds, input.rounds),
    rounds: buildRounds(input.playerIds, input.rounds),
    moduleData: {
      version: flip7Manifest.dataVersion,
      data: {
        players: [...input.playerIds],
        rounds: toPlainRounds(input.rounds),
      } satisfies Flip7ModuleData,
    },
  }
  assertRoundsSumToRanking(result)
  return result
}
