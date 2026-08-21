import type { GameType } from '../domain/model/gameType'
import { getWinners, type Match } from '../domain/model/match'

const K = 32
const DEFAULT_RATING = 1200

export interface EloSnapshot {
  matchId: string
  date: number
  ratings: Map<string, number>
}

export class EloCalculator {
  compute(matches: Match[], gameTypes: Map<string, GameType>): Map<string, number> {
    const history = this.computeHistory(matches, gameTypes)
    return history.length > 0 ? history[history.length - 1].ratings : new Map()
  }

  computeHistory(matches: Match[], gameTypes: Map<string, GameType>): EloSnapshot[] {
    const elo = new Map<string, number>()
    const sorted = [...matches].sort((a, b) => a.date - b.date)
    const history: EloSnapshot[] = []

    for (const match of sorted) {
      const gt = gameTypes.get(match.gameTypeId)
      if (!gt) continue
      const winners = new Set(getWinners(match, gt))
      if (winners.size === 0) continue
      const participants = match.playerScores.map((s) => s.playerId)
      if (participants.length < 2) continue
      const preElo = new Map(elo)
      const kNorm = K / (participants.length - 1)
      const deltas = new Map<string, number>()

      for (const winner of winners) {
        for (const loser of participants) {
          if (winners.has(loser)) continue
          const rW = preElo.get(winner) ?? DEFAULT_RATING
          const rL = preElo.get(loser) ?? DEFAULT_RATING
          const eW = 1 / (1 + 10 ** ((rL - rW) / 400))
          const eL = 1 / (1 + 10 ** ((rW - rL) / 400))
          deltas.set(winner, (deltas.get(winner) ?? 0) + Math.round(kNorm * (1 - eW)))
          deltas.set(loser, (deltas.get(loser) ?? 0) + Math.round(kNorm * (0 - eL)))
        }
      }
      for (const [pid, d] of deltas) {
        elo.set(pid, (preElo.get(pid) ?? DEFAULT_RATING) + d)
      }

      history.push({ matchId: match.id, date: match.date, ratings: new Map(elo) })
    }

    return history
  }
}
