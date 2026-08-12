import { getWinners } from '../domain/model/match'
import type { Match } from '../domain/model/match'
import type { GameType } from '../domain/model/gameType'
import type { GameTypeRepository } from '../domain/port/gameTypeRepository'
import type { MatchRepository } from '../domain/port/matchRepository'
import type { PlayerRepository } from '../domain/port/playerRepository'
import type { Trophy, TrophyHolder, TrophyPeriod } from '../domain/model/trophy'
import { EloCalculator, type EloSnapshot } from './eloCalculator'

/** B3 — The Regular is only awarded among players with at least this many matches played. */
export const REGULAR_MIN_MATCHES = 10
/** E1 — Nemesis only considers pairs who have met at least this many times. */
export const NEMESIS_MIN_MEETINGS = 5

const DAY_MS = 24 * 60 * 60 * 1000

interface StreakBreak {
  winnerId: string
  brokenPlayerName: string
  streakLength: number
}

interface RivalryTally {
  first: string
  second: string
  winsFirst: number
  winsSecond: number
  meetings: number
}

/** D1 and E1 always populate `detail` with the plain string case (a name), never the structured ones. */
function stringDetail(detail: TrophyHolder['detail']): string {
  return typeof detail === 'string' ? detail : ''
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

function bestRatioHolders(
  matchesPlayed: Map<string, number>,
  totalWins: Map<string, number>,
  names: Map<string, string>,
): TrophyHolder[] {
  let bestRatio = -1
  let candidates: { playerId: string; wins: number; played: number }[] = []
  for (const [playerId, played] of matchesPlayed) {
    if (played < REGULAR_MIN_MATCHES) continue
    const wins = totalWins.get(playerId) ?? 0
    const ratio = wins / played
    if (ratio > bestRatio) {
      bestRatio = ratio
      candidates = [{ playerId, wins, played }]
    } else if (ratio === bestRatio) {
      candidates.push({ playerId, wins, played })
    }
  }
  if (bestRatio < 0) return []

  return candidates
    .map(({ playerId, wins, played }) => ({
      playerId,
      name: names.get(playerId) ?? playerId,
      value: Math.round((wins / played) * 100) / 100,
      detail: { kind: 'ratio' as const, wins, played },
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId))
}

function gameRecordHolders(matches: Match[], gameTypes: Map<string, GameType>, names: Map<string, string>): TrophyHolder[] {
  const byGameType = new Map<string, Match[]>()
  for (const match of matches) {
    const gameType = gameTypes.get(match.gameTypeId)
    if (!gameType || gameType.winCondition === 'MANUAL') continue
    const list = byGameType.get(match.gameTypeId)
    if (list) list.push(match)
    else byGameType.set(match.gameTypeId, [match])
  }

  const holders: TrophyHolder[] = []
  for (const [gameTypeId, gtMatches] of byGameType) {
    const gameType = gameTypes.get(gameTypeId)
    if (!gameType) continue

    let best: number | undefined
    for (const match of gtMatches) {
      for (const ps of match.playerScores) {
        if (best === undefined || (gameType.winCondition === 'HIGHEST_SCORE' ? ps.score > best : ps.score < best)) {
          best = ps.score
        }
      }
    }
    if (best === undefined) continue

    const seenHolders = new Set<string>()
    for (const match of gtMatches) {
      for (const ps of match.playerScores) {
        if (ps.score !== best || seenHolders.has(ps.playerId)) continue
        seenHolders.add(ps.playerId)
        holders.push({ playerId: ps.playerId, name: names.get(ps.playerId) ?? ps.playerId, value: best, detail: gameType.name })
      }
    }
  }

  return holders.sort(
    (a, b) => stringDetail(a.detail).localeCompare(stringDetail(b.detail)) || a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId),
  )
}

function nemesisHolders(matches: Match[], gameTypes: Map<string, GameType>, names: Map<string, string>): TrophyHolder[] {
  const tallies = new Map<string, RivalryTally>()
  for (const match of matches) {
    const gameType = gameTypes.get(match.gameTypeId)
    if (!gameType) continue
    const winners = new Set(getWinners(match, gameType))
    const participants = match.playerScores.map((s) => s.playerId)

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        const a = participants[i]
        const b = participants[j]
        const [first, second] = a < b ? [a, b] : [b, a]
        const key = `${first} ${second}`
        const tally = tallies.get(key) ?? { first, second, winsFirst: 0, winsSecond: 0, meetings: 0 }
        tally.meetings += 1
        if (winners.has(a) && !winners.has(b)) {
          if (first === a) tally.winsFirst += 1
          else tally.winsSecond += 1
        }
        if (winners.has(b) && !winners.has(a)) {
          if (first === b) tally.winsFirst += 1
          else tally.winsSecond += 1
        }
        tallies.set(key, tally)
      }
    }
  }

  let bestGap = 0
  let dominants: { dominantId: string; dominatedId: string; gap: number }[] = []
  for (const { first, second, winsFirst, winsSecond, meetings } of tallies.values()) {
    if (meetings < NEMESIS_MIN_MEETINGS) continue
    const gap = Math.abs(winsFirst - winsSecond)
    if (gap === 0) continue
    const dominantId = winsFirst > winsSecond ? first : second
    const dominatedId = winsFirst > winsSecond ? second : first
    if (gap > bestGap) {
      bestGap = gap
      dominants = [{ dominantId, dominatedId, gap }]
    } else if (gap === bestGap) {
      dominants.push({ dominantId, dominatedId, gap })
    }
  }

  return dominants
    .map(({ dominantId, dominatedId, gap }) => ({
      playerId: dominantId,
      name: names.get(dominantId) ?? dominantId,
      value: gap,
      detail: names.get(dominatedId) ?? dominatedId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || stringDetail(a.detail).localeCompare(stringDetail(b.detail)))
}

/** C1 — the highest rating each player has ever reached, with the date it happened. */
function eloPeakHolders(history: EloSnapshot[], names: Map<string, string>): TrophyHolder[] {
  const peaks = new Map<string, { value: number; date: number }>()
  for (const snapshot of history) {
    for (const [playerId, rating] of snapshot.ratings) {
      const peak = peaks.get(playerId)
      if (!peak || rating > peak.value) {
        peaks.set(playerId, { value: rating, date: snapshot.date })
      }
    }
  }

  let max = -Infinity
  for (const peak of peaks.values()) {
    if (peak.value > max) max = peak.value
  }
  if (peaks.size === 0) return []

  const holders: TrophyHolder[] = []
  for (const [playerId, peak] of peaks) {
    if (peak.value === max) {
      holders.push({ playerId, name: names.get(playerId) ?? playerId, value: peak.value, detail: { kind: 'date', epochMs: peak.date } })
    }
  }
  return holders.sort((a, b) => a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId))
}

/**
 * C3 — cumulated time spent leading the ELO ranking, in days. Between two
 * consecutive snapshots, the leader of the earlier one capitalizes the gap;
 * the leader of the last snapshot capitalizes up to `now`.
 */
function kingOfTheHillHolders(history: EloSnapshot[], names: Map<string, string>, now: number): TrophyHolder[] {
  const msAtTop = new Map<string, number>()

  function creditLeaders(ratings: Map<string, number>, from: number, to: number) {
    if (ratings.size === 0 || to <= from) return
    let max = -Infinity
    for (const rating of ratings.values()) {
      if (rating > max) max = rating
    }
    const gapMs = to - from
    for (const [playerId, rating] of ratings) {
      if (rating === max) {
        msAtTop.set(playerId, (msAtTop.get(playerId) ?? 0) + gapMs)
      }
    }
  }

  for (let i = 0; i < history.length - 1; i++) {
    creditLeaders(history[i].ratings, history[i].date, history[i + 1].date)
  }
  if (history.length > 0) {
    const last = history[history.length - 1]
    creditLeaders(last.ratings, last.date, now)
  }

  const days = new Map<string, number>()
  for (const [playerId, ms] of msAtTop) {
    days.set(playerId, Math.round(ms / DAY_MS))
  }

  return topHolders(days, names)
}

function isSameLocalMonth(epochMs: number, reference: Date): boolean {
  const d = new Date(epochMs)
  return d.getFullYear() === reference.getFullYear() && d.getMonth() === reference.getMonth()
}

/** F3 — one holder per completed calendar month with at least one win; the current month is excluded (that's F2's job). */
function monthlyChampionHolders(matches: Match[], gameTypes: Map<string, GameType>, names: Map<string, string>, now: Date): TrophyHolder[] {
  const winsByMonth = new Map<string, Map<string, number>>()

  for (const match of matches) {
    const d = new Date(match.date)
    if (isSameLocalMonth(match.date, now)) continue
    const gameType = gameTypes.get(match.gameTypeId)
    if (!gameType) continue

    const key = `${d.getFullYear()}-${d.getMonth()}`
    let wins = winsByMonth.get(key)
    if (!wins) {
      wins = new Map()
      winsByMonth.set(key, wins)
    }
    for (const winnerId of getWinners(match, gameType)) {
      wins.set(winnerId, (wins.get(winnerId) ?? 0) + 1)
    }
  }

  const holders: TrophyHolder[] = []
  for (const [key, wins] of winsByMonth) {
    const [year, month] = key.split('-').map(Number)
    let max = 0
    for (const value of wins.values()) {
      if (value > max) max = value
    }
    if (max <= 0) continue

    for (const [playerId, value] of wins) {
      if (value === max) {
        holders.push({ playerId, name: names.get(playerId) ?? playerId, value, period: { kind: 'month', year, month } })
      }
    }
  }

  return holders.sort((a, b) => {
    const pa = a.period as TrophyPeriod
    const pb = b.period as TrophyPeriod
    return pb.year - pa.year || pb.month - pa.month || a.name.localeCompare(b.name) || a.playerId.localeCompare(b.playerId)
  })
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
    private readonly eloCalculator: EloCalculator = new EloCalculator(),
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
    const totalWins = new Map<string, number>()
    const matchesPlayed = new Map<string, number>()
    const streakBreaks: StreakBreak[] = []

    for (const [playerId, playerMatches] of matchesByPlayer) {
      playerMatches.sort(compareMatchesChronologically)
      matchesPlayed.set(playerId, playerMatches.length)

      let wins = 0
      let streak = 0
      let maxStreak = 0
      for (const match of playerMatches) {
        const gameType = gameTypes.get(match.gameTypeId)
        if (!gameType) continue
        const won = getWinners(match, gameType).includes(playerId)

        if (won) {
          wins += 1
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

      totalWins.set(playerId, wins)
      longestStreak.set(playerId, maxStreak)
      currentStreak.set(playerId, streak)
    }

    const now = new Date()
    const monthWins = new Map<string, number>()
    for (const match of matches) {
      if (!isSameLocalMonth(match.date, now)) continue
      const gameType = gameTypes.get(match.gameTypeId)
      if (!gameType) continue
      for (const winnerId of getWinners(match, gameType)) {
        monthWins.set(winnerId, (monthWins.get(winnerId) ?? 0) + 1)
      }
    }

    const eloHistory = this.eloCalculator.computeHistory(matches, gameTypes)

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
              detail: { kind: 'streakBroken' as const, brokenPlayerName: b.brokenPlayerName },
            }))
            .sort((a, b) => a.name.localeCompare(b.name) || a.detail.brokenPlayerName.localeCompare(b.detail.brokenPlayerName))

    return [
      {
        id: 'a1',
        holders: topHolders(longestStreak, names),
      },
      {
        id: 'a2',
        holders: topHolders(currentStreak, names),
      },
      {
        id: 'a4',
        holders: streakBreakerHolders,
      },
      {
        id: 'b2',
        holders: topHolders(totalWins, names),
      },
      {
        id: 'b3',
        holders: bestRatioHolders(matchesPlayed, totalWins, names),
      },
      {
        id: 'c1',
        holders: eloPeakHolders(eloHistory, names),
        unit: 'elo',
      },
      {
        id: 'c3',
        holders: kingOfTheHillHolders(eloHistory, names, now.getTime()),
        unit: 'days',
      },
      {
        id: 'd1',
        holders: gameRecordHolders(matches, gameTypes, names),
      },
      {
        id: 'e1',
        holders: nemesisHolders(matches, gameTypes, names),
      },
      {
        id: 'f2',
        holders: topHolders(monthWins, names),
      },
      {
        id: 'f3',
        holders: monthlyChampionHolders(matches, gameTypes, names, now),
      },
    ]
  }
}
