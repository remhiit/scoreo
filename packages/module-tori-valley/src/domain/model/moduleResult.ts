import type { ModuleMatch } from '@scoreboards/module-api'
import type { PlayerScore } from '@scoreboards/shared-domain'
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
 * Bumped only when a draft stops being readable by this code. A draft written
 * by another version fails the literal below, and the screen starts a clean
 * grid rather than reviving half of an older shape.
 */
export const DRAFT_VERSION = 1

/**
 * A scoring session in progress: the same shape as `moduleData`, plus the
 * `playerIds` it was written for. Scoring is keyed by `playerId` — see
 * `buildInitialState` — so a draft restored against a different table would
 * quietly hand another game's scores to whichever players happen to share an
 * id.
 */
export const ToriValleyDraftSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  playerIds: z.array(z.string()),
  objectifCards: ObjectifCardSelectionSchema,
  results: z.array(PlayerResultSchema),
})

export type ToriValleyDraft = z.infer<typeof ToriValleyDraftSchema>

export function toDraft(
  playerIds: readonly string[],
  objectifCards: ObjectifCardSelection,
  results: PlayerResult[],
): ToriValleyDraft {
  return { version: DRAFT_VERSION, playerIds: [...playerIds], objectifCards, results }
}

function samePlayerSet(restored: readonly string[], playerIds: readonly string[]): boolean {
  if (restored.length !== playerIds.length) return false
  const asSet = new Set(restored)
  return playerIds.every((id) => asSet.has(id))
}

/**
 * Reads a draft the host handed back, without ever trusting it: it may have
 * been written by an older version of this module, hand-edited, or truncated
 * by a browser that ran out of quota. Anything the schema rejects, or that
 * was written for a different table, yields `undefined` — the caller starts a
 * clean grid rather than serving another match's scores to today's players.
 */
export function readDraft(
  data: unknown,
  playerIds: readonly string[],
): ToriValleyModuleData | undefined {
  const parsed = ToriValleyDraftSchema.safeParse(data)
  if (!parsed.success || !samePlayerSet(parsed.data.playerIds, playerIds)) return undefined
  return { objectifCards: parsed.data.objectifCards, results: parsed.data.results }
}

/**
 * Torī Valley has no rounds, so a match's breakdown is emitted as pseudo-rounds
 * — one per scoring category, in this fixed order.
 *
 * The categories **partition** `scorePlayerResult()`, which is what makes each
 * player's rounds sum back to their ranking score. That is the invariant
 * the host checks before storing a match (`assertMatchConsistent`), and the one
 * Scoreo's file import has always required.
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

/** A player's total and standing; rank 1 is a winner, and a tie may share it. */
export interface RankedPlayer {
  readonly playerId: string
  readonly score: number
  readonly rank: number
}

/**
 * Ranks by descending total (standard competition ranking), then hands rank 1
 * to the match's actual winner(s) only: Torī Valley breaks a top-score tie by
 * Torī count then Pinceau, a rule the host does not know, so the winners the
 * module hands over (`manualWinners`) are the rank-1 players.
 */
export function buildModuleRanking(match: Match): RankedPlayer[] {
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

/** One round per scoring category, each scoring every player. */
export function buildModuleRounds(match: Match): PlayerScore[][] {
  return SCORE_CATEGORIES.map((category) =>
    match.results.map((result) => ({
      playerId: result.playerId,
      score: category.score(result),
    })),
  )
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
export function toModuleMatch(input: ModuleMatchInput): ModuleMatch {
  const match: Match = {
    id: input.matchId ?? '',
    playedAt: input.playedAt ?? 0,
    playerIds: [...input.playerIds],
    objectifCards: input.objectifCards,
    results: input.results,
  }
  const ranking = buildModuleRanking(match)
  return {
    ...(input.matchId === undefined ? {} : { id: input.matchId }),
    ...(input.playedAt === undefined ? {} : { date: input.playedAt }),
    playerScores: ranking.map(({ playerId, score }) => ({ playerId, score })),
    rounds: buildModuleRounds(match),
    manualWinners: ranking.filter((entry) => entry.rank === 1).map((entry) => entry.playerId),
    moduleData: {
      version: MODULE_DATA_VERSION,
      data: { objectifCards: input.objectifCards, results: input.results },
    },
  }
}
