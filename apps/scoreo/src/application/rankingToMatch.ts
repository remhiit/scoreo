import type { Match, MatchModuleData } from '../domain/model/match'
import type { PlayerScore } from '../domain/model/playerScore'

export interface RankingEntry {
  playerId: string
  score: number
  /** 1 = winner. Several entries may share rank 1 when the source declares a tie. */
  rank: number
}

export interface RankingToMatchInput {
  id: string
  /** Epoch milliseconds. */
  date: number
  gameTypeId: string
  ranking: readonly RankingEntry[]
  /** One entry per round, each listing the scores for that round. */
  rounds?: readonly PlayerScore[][]
  moduleData?: MatchModuleData | null
}

/**
 * Turns an outside ranking into a Scoreo match.
 *
 * Both ways a match can arrive from outside Scoreo's own score screen go
 * through this: a v1.1 file import, and a scoring module handing back a result.
 * They agree by construction on the one subtle part — `rank === 1` becomes a
 * `manualWinner`.
 *
 * That mapping is not cosmetic. The source owns tie-breaks Scoreo knows nothing
 * about (Torī Valley settles a tie on Torī count, then Pinceau), so the winners
 * must be taken from the announced rank rather than recomputed from the scores.
 */
export function rankingToMatch(input: RankingToMatchInput): Match {
  return {
    id: input.id,
    date: input.date,
    gameTypeId: input.gameTypeId,
    playerScores: input.ranking.map((entry) => ({
      playerId: entry.playerId,
      score: entry.score,
    })),
    manualWinners: input.ranking.filter((entry) => entry.rank === 1).map((entry) => entry.playerId),
    secondaryPlayerScores: [],
    rounds: (input.rounds ?? []).map((round) => [...round]),
    moduleData: input.moduleData ?? null,
  }
}
