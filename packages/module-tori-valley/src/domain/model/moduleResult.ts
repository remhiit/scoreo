import type { ModuleMatchResult, ModuleRankingEntry, ModuleRound } from '@scoreboards/module-api'
import { z } from 'zod'
import { LANDSCAPE_TYPES, type ObjectifCardSelection } from './landscape'
import {
  matchWinners,
  PINCEAU_BONUS,
  scorePlayerResult,
  type Match,
  type PlayerResult,
} from './match'
import { ObjectifCardSelectionSchema, PlayerResultSchema } from './match.schema'
import { scoreTorii } from './torii'

/**
 * Version of the payload this module hands the host as `moduleData`. Bump it
 * only alongside a migration: the host stores the blob without ever looking
 * inside, so the module is the only side able to read an older one.
 */
export const MODULE_DATA_VERSION = 1

/** What the module needs to rebuild its grid when a match is reopened. */
export const ToriValleyModuleDataSchema = z.object({
  objectifCards: ObjectifCardSelectionSchema,
  results: z.array(PlayerResultSchema),
})

export type ToriValleyModuleData = z.infer<typeof ToriValleyModuleDataSchema>

/**
 * Torī Valley has no rounds, so a match's breakdown is emitted as pseudo-rounds
 * — one per scoring category, in this fixed order.
 *
 * The categories **partition** `scorePlayerResult()`, which is what makes each
 * player's rounds sum back to their ranking score. That is the invariant
 * `assertRoundsSumToRanking` checks, and the one Scoreo's file import has
 * always required.
 */
export const SCORE_CATEGORIES: readonly {
  readonly label: string
  readonly score: (result: PlayerResult) => number
}[] = [
  ...LANDSCAPE_TYPES.map((type) => ({
    label: type,
    score: (result: PlayerResult) => result.objectifPoints[type],
  })),
  { label: 'torii', score: (result: PlayerResult) => scoreTorii(result.toriiCounts) },
  {
    label: 'parchemin',
    score: (result: PlayerResult) =>
      result.parcheminValue + (result.hasPinceau ? PINCEAU_BONUS : 0),
  },
]

/**
 * Ranks by descending total (standard competition ranking), then hands rank 1
 * to the match's actual winner(s) only: Torī Valley breaks a top-score tie by
 * Torī count then Pinceau, a rule the host does not know, so the rank is what
 * carries it over.
 */
export function buildModuleRanking(match: Match): ModuleRankingEntry[] {
  const winners = new Set(matchWinners(match))
  const scored = match.results.map((result) => ({
    playerId: result.playerId,
    score: scorePlayerResult(result),
  }))
  const topScore = Math.max(...scored.map((s) => s.score))
  const winnerCount = scored.filter((s) => winners.has(s.playerId)).length

  return scored
    .map((entry) => {
      const tiedLoser = entry.score === topScore && !winners.has(entry.playerId)
      const rank = tiedLoser
        ? winnerCount + 1
        : 1 + scored.filter((other) => other.score > entry.score).length
      return { playerId: entry.playerId, score: entry.score, rank }
    })
    .sort((a, b) => a.rank - b.rank)
}

export function buildModuleRounds(match: Match): ModuleRound[] {
  return SCORE_CATEGORIES.map((category) => ({
    label: category.label,
    scores: match.results.map((result) => ({
      playerId: result.playerId,
      score: category.score(result),
    })),
  }))
}

export interface ModuleMatchInput {
  readonly playerIds: readonly string[]
  readonly objectifCards: ObjectifCardSelection
  readonly results: PlayerResult[]
  /** Set to update a match the host already stores; absent creates a new one. */
  readonly matchId?: string
  /**
   * Set only when replaying a match the module stored itself, as the file
   * export does. Left out on the hosted path so the host stamps its own clock —
   * a module has no business deciding what time the host thinks it is.
   */
  readonly playedAt?: number
}

/**
 * The single description of a finished match, keyed by player id.
 *
 * Both ways out of the module go through this: the in-process `ModuleHost`
 * hands it straight to Scoreo, and the v1.1 file export maps the ids to display
 * names on top of it. They cannot disagree about a rank or a category.
 */
export function toModuleMatchResult(input: ModuleMatchInput): ModuleMatchResult {
  const match: Match = {
    id: input.matchId ?? '',
    playedAt: input.playedAt ?? 0,
    playerIds: [...input.playerIds],
    objectifCards: input.objectifCards,
    results: input.results,
  }
  return {
    ...(input.matchId === undefined ? {} : { matchId: input.matchId }),
    ...(input.playedAt === undefined ? {} : { playedAt: input.playedAt }),
    ranking: buildModuleRanking(match),
    rounds: buildModuleRounds(match),
    moduleData: {
      version: MODULE_DATA_VERSION,
      data: { objectifCards: input.objectifCards, results: input.results },
    },
  }
}
