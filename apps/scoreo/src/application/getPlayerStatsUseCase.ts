import { getWinners } from '../domain/model/match'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'

export interface PlayerStats {
  playerId: string
  wins: number
  losses: number
}

export class GetPlayerStatsUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameTypeRepository: GameTypeRepository,
  ) {}

  invoke(): Map<string, PlayerStats> {
    const stats = new Map<string, PlayerStats>()

    let orphanedMatches = 0
    for (const match of this.matchRepository.getAll()) {
      const gameType = this.gameTypeRepository.findById(match.gameTypeId)
      if (!gameType) {
        orphanedMatches++
        continue
      }
      const winners = new Set(getWinners(match, gameType))

      for (const ps of match.playerScores) {
        const current = stats.get(ps.playerId) ?? { playerId: ps.playerId, wins: 0, losses: 0 }
        stats.set(
          ps.playerId,
          winners.has(ps.playerId)
            ? { ...current, wins: current.wins + 1 }
            : { ...current, losses: current.losses + 1 },
        )
      }
    }
    if (orphanedMatches > 0) {
      console.warn(`[Scoreo] Warning: ${orphanedMatches} match(es) reference non-existent game types`)
    }
    return stats
  }
}
