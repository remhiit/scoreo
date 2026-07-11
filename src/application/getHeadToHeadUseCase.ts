import { getWinners } from '../domain/model/match'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'
import { EloCalculator } from './eloCalculator'

export interface HeadToHeadEntry {
  opponentId: string
  opponentName: string
  wins: number
  losses: number
}

export interface PlayerDetail {
  playerId: string
  name: string
  wins: number
  losses: number
  elo: number
  headToHead: HeadToHeadEntry[]
}

interface HeadToHeadTally {
  first: string
  second: string
  winsFirst: number
  winsSecond: number
}

export class GetHeadToHeadUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly playerRepository: PlayerRepository,
    private readonly eloCalculator: EloCalculator = new EloCalculator(),
  ) {}

  invoke(gameTypeId?: string): PlayerDetail[] {
    const gameTypes = new Map(this.gameTypeRepository.getAll().map((gt) => [gt.id, gt]))
    const players = new Map(this.playerRepository.getAll(true).map((p) => [p.id, p]))
    const allMatches = this.matchRepository
      .getAll()
      .filter((m) => gameTypeId === undefined || m.gameTypeId === gameTypeId)

    const totalWins = new Map<string, number>()
    const totalLosses = new Map<string, number>()
    const h2h = new Map<string, HeadToHeadTally>()

    for (const match of allMatches) {
      const gameType = gameTypes.get(match.gameTypeId)
      if (!gameType) continue
      const winners = new Set(getWinners(match, gameType))
      const participants = match.playerScores.map((s) => s.playerId)

      for (const pid of participants) {
        if (winners.has(pid)) {
          totalWins.set(pid, (totalWins.get(pid) ?? 0) + 1)
        } else {
          totalLosses.set(pid, (totalLosses.get(pid) ?? 0) + 1)
        }
      }

      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const a = participants[i]
          const b = participants[j]
          const [first, second] = a < b ? [a, b] : [b, a]
          const key = `${first} ${second}`
          const tally = h2h.get(key) ?? { first, second, winsFirst: 0, winsSecond: 0 }
          if (winners.has(a) && !winners.has(b)) {
            if (first === a) tally.winsFirst += 1
            else tally.winsSecond += 1
          }
          if (winners.has(b) && !winners.has(a)) {
            if (first === b) tally.winsFirst += 1
            else tally.winsSecond += 1
          }
          h2h.set(key, tally)
        }
      }
    }

    const eloMap = this.eloCalculator.compute(allMatches, gameTypes)

    const details: PlayerDetail[] = []
    for (const [pid, player] of players) {
      const wins = totalWins.get(pid) ?? 0
      const losses = totalLosses.get(pid) ?? 0
      if (wins + losses === 0) continue

      const headToHead: HeadToHeadEntry[] = []
      for (const { first, second, winsFirst, winsSecond } of h2h.values()) {
        if (first !== pid && second !== pid) continue
        const isFirst = first === pid
        const oppId = isFirst ? second : first
        const oppName = players.get(oppId)?.name ?? oppId
        headToHead.push({
          opponentId: oppId,
          opponentName: oppName,
          wins: isFirst ? winsFirst : winsSecond,
          losses: isFirst ? winsSecond : winsFirst,
        })
      }
      headToHead.sort((a, b) => b.wins - a.wins)

      details.push({
        playerId: pid,
        name: player.name,
        wins,
        losses,
        elo: eloMap.get(pid) ?? 1200,
        headToHead,
      })
    }

    return details.sort((a, b) => b.elo - a.elo)
  }
}
