import { getWinners } from '../domain/model/match'
import type { Match } from '../domain/model/match'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'
import type { Trophy, TrophyHolder } from '../domain/model/trophy'

interface StreakBreak {
  winnerId: string
  brokenPlayerName: string
  streakLength: number
}

function compareMatchesChronologically(a: Match, b: Match): number {
  if (a.date !== b.date) return a.date - b.date
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

function topHolders(values: Map<string, number>, names: Map<string, string>): TrophyHolder[] {
  let max = 0
  for (const value of values.values()) {
    if (value > max) max = value
  }
  if (max <= 0) return []

  const holders: TrophyHolder[] = []
  for (const [playerId, value] of values) {
    if (value === max) {
      holders.push({ playerId, name: names.get(playerId) ?? playerId, value })
    }
  }
  return holders.sort((a, b) => a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId))
}

/**
 * Renders playful "hall of fame" trophies, recomputed from scratch on every
 * call — nothing here is persisted. When gameTypeId is set, every trophy is
 * computed on that game type's matches only.
 */
export class GetTrophiesUseCase {
  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly gameTypeRepository: GameTypeRepository,
    private readonly playerRepository: PlayerRepository,
  ) {}

  invoke(gameTypeId?: string): Trophy[] {
    const gameTypes = new Map(this.gameTypeRepository.getAll(true).map((gt) => [gt.id, gt]))
    const players = this.playerRepository.getAll(true)
    const names = new Map(players.map((p) => [p.id, p.name]))

    const matches = this.matchRepository
      .getAll()
      .filter((m) => gameTypeId === undefined || m.gameTypeId === gameTypeId)
      .filter((m) => gameTypes.has(m.gameTypeId))

    const matchesByPlayer = new Map<string, Match[]>()
    for (const match of matches) {
      for (const ps of match.playerScores) {
        const list = matchesByPlayer.get(ps.playerId)
        if (list) list.push(match)
        else matchesByPlayer.set(ps.playerId, [match])
      }
    }

    const longestStreak = new Map<string, number>()
    const currentStreak = new Map<string, number>()
    const streakBreaks: StreakBreak[] = []

    for (const [playerId, playerMatches] of matchesByPlayer) {
      playerMatches.sort(compareMatchesChronologically)

      let streak = 0
      let maxStreak = 0
      for (const match of playerMatches) {
        const gameType = gameTypes.get(match.gameTypeId)
        if (!gameType) continue
        const won = getWinners(match, gameType).includes(playerId)

        if (won) {
          streak += 1
          maxStreak = Math.max(maxStreak, streak)
          continue
        }

        if (streak >= 2) {
          const brokenPlayerName = names.get(playerId) ?? playerId
          for (const winnerId of getWinners(match, gameType)) {
            streakBreaks.push({ winnerId, brokenPlayerName, streakLength: streak })
          }
        }
        streak = 0
      }

      longestStreak.set(playerId, maxStreak)
      currentStreak.set(playerId, streak)
    }

    const maxBreak = streakBreaks.reduce((max, b) => Math.max(max, b.streakLength), 0)
    const streakBreakerHolders: TrophyHolder[] =
      maxBreak <= 0
        ? []
        : streakBreaks
            .filter((b) => b.streakLength === maxBreak)
            .map((b) => ({
              playerId: b.winnerId,
              name: names.get(b.winnerId) ?? b.winnerId,
              value: b.streakLength,
              detail: `Ended ${b.brokenPlayerName}'s streak`,
            }))
            .sort((a, b) => a.name.localeCompare(b.name) || (a.detail ?? '').localeCompare(b.detail ?? ''))

    return [
      {
        id: 'a1',
        title: 'The Invincible',
        description: 'Longest winning streak of all time',
        holders: topHolders(longestStreak, names),
      },
      {
        id: 'a2',
        title: 'Current Streak',
        description: 'Consecutive wins right now',
        holders: topHolders(currentStreak, names),
      },
      {
        id: 'a4',
        title: 'Streak Breaker',
        description: "Ended the biggest winning streak",
        holders: streakBreakerHolders,
      },
    ]
  }
}
