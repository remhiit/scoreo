import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import type { Player } from '../domain/model/player'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { EloCalculator, type EloSnapshot } from './eloCalculator'
import { GetTrophiesUseCase, NEMESIS_MIN_MEETINGS, REGULAR_MIN_MATCHES } from './getTrophiesUseCase'

class FakeEloCalculator extends EloCalculator {
  constructor(private readonly snapshots: EloSnapshot[]) {
    super()
  }

  override computeHistory(): EloSnapshot[] {
    return this.snapshots
  }
}

function player(id: string, name: string, active = true): Player {
  return { id, name, active }
}

function gameType(id: string, name: string, winCondition: GameType['winCondition'] = 'HIGHEST_SCORE'): GameType {
  return {
    id,
    name,
    winCondition,
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
  }
}

function match(
  id: string,
  date: number,
  gameTypeId: string,
  playerScores: Match['playerScores'],
  overrides: Partial<Match> = {},
): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null, ...overrides }
}

function buildUseCase(
  matchRepo = new InMemoryMatchRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  playerRepo = new InMemoryPlayerRepository(),
  eloCalculator: EloCalculator = new EloCalculator(),
) {
  return new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo, eloCalculator)
}

function trophy(trophies: ReturnType<GetTrophiesUseCase['invoke']>, id: string) {
  const found = trophies.find((t) => t.id === id)
  if (!found) throw new Error(`Trophy ${id} not found`)
  return found
}

describe('GetTrophiesUseCase', () => {
  it('returns all trophies with empty holders when there are no matches', () => {
    const trophies = buildUseCase().invoke()

    expect(trophies).toHaveLength(11)
    expect(trophies.map((t) => t.id)).toEqual(['a1', 'a2', 'a4', 'b2', 'b3', 'c1', 'c3', 'd1', 'e1', 'f2', 'f3'])
    for (const t of trophies) {
      expect(t.holders).toEqual([])
    }
  })

  describe('A1 — The Invincible', () => {
    it('crowns the longest all-time winning streak, ignoring a more recent break', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // Alice wins m1, m2, m3 (streak of 3), then loses m4 (streak resets to 0)
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m4', 4000, 'gt1', [{ playerId: 'p1', score: 5 }, { playerId: 'p2', score: 10 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a1').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 3 }])
    })

    it('produces multiple holders on a tie', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      playerRepo.save(player('p3', 'Charlie'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // Alice: 2-win streak vs Charlie; Bob: 2-win streak vs Charlie
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p3', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p3', score: 5 }]))
      matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p3', score: 5 }]))
      matchRepo.save(match('m4', 4000, 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p3', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a1').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 2 },
        { playerId: 'p2', name: 'Bob', value: 2 },
      ])
    })

    it('orders matches by date then id at equal dates, deterministically', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // Same date, saved out of id order: sorting must still resolve 'ma' before 'mb'
      // so Alice's streak is 2 (both wins), not reset in between.
      matchRepo.save(match('mb', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('ma', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a1').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2 }])
    })
  })

  describe('A2 — Current Streak', () => {
    it('is 0 when the last match is a loss, even after a past streak', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // Alice wins m1, m2 (streak of 2), then loses m3 to Bob.
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p1', score: 5 }, { playerId: 'p2', score: 10 }]))

      const trophies = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()

      // Alice's all-time streak (A1) was 2, but her current streak (A2) is 0
      // after the loss — so she is not a holder, only Bob (who just won) is.
      expect(trophy(trophies, 'a1').holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2 }])
      expect(trophy(trophies, 'a2').holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 1 }])
    })

    it('counts the streak up to the last match, even if a shorter streak happened earlier', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 5 }, { playerId: 'p2', score: 10 }]))
      matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m4', 4000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a2').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2 }])
    })
  })

  describe('A4 — Streak Breaker', () => {
    it('credits the winner with the broken streak length and names the broken player', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p1', score: 5 }, { playerId: 'p2', score: 10 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a4').holders

      expect(holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 2, detail: { kind: 'streakBroken', brokenPlayerName: 'Alice' } }])
    })

    it('is empty when no streak of 2 or more is ever broken', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // Alice wins once (streak 1) then loses — 1 < 2, no break credited
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 5 }, { playerId: 'p2', score: 10 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a4').holders

      expect(holders).toEqual([])
    })

    it('credits every winner of the breaking match on a tied win', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      playerRepo.save(player('p3', 'Charlie'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(
        match('m1', 1000, 'gt1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 1 },
          { playerId: 'p3', score: 1 },
        ]),
      )
      matchRepo.save(
        match('m2', 2000, 'gt1', [
          { playerId: 'p1', score: 10 },
          { playerId: 'p2', score: 1 },
          { playerId: 'p3', score: 1 },
        ]),
      )
      // Alice loses to a tie between Bob and Charlie -> both credited with 2
      matchRepo.save(
        match('m3', 3000, 'gt1', [
          { playerId: 'p1', score: 1 },
          { playerId: 'p2', score: 10 },
          { playerId: 'p3', score: 10 },
        ]),
      )

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a4').holders

      expect(holders).toEqual([
        { playerId: 'p2', name: 'Bob', value: 2, detail: { kind: 'streakBroken', brokenPlayerName: 'Alice' } },
        { playerId: 'p3', name: 'Charlie', value: 2, detail: { kind: 'streakBroken', brokenPlayerName: 'Alice' } },
      ])
    })

    it('the trophy goes to the largest broken streak across all players', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      playerRepo.save(player('p3', 'Charlie'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // Alice's 2-win streak broken by Bob
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 1 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 1 }]))
      matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p1', score: 1 }, { playerId: 'p2', score: 10 }]))
      // Charlie's 3-win streak broken by Bob
      matchRepo.save(match('m4', 4000, 'gt1', [{ playerId: 'p3', score: 10 }, { playerId: 'p2', score: 1 }]))
      matchRepo.save(match('m5', 5000, 'gt1', [{ playerId: 'p3', score: 10 }, { playerId: 'p2', score: 1 }]))
      matchRepo.save(match('m6', 6000, 'gt1', [{ playerId: 'p3', score: 10 }, { playerId: 'p2', score: 1 }]))
      matchRepo.save(match('m7', 7000, 'gt1', [{ playerId: 'p3', score: 1 }, { playerId: 'p2', score: 10 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a4').holders

      expect(holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 3, detail: { kind: 'streakBroken', brokenPlayerName: 'Charlie' } }])
    })
  })

  describe('B2 — The Collector', () => {
    it('crowns the player with the most wins in absolute value', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m4', 4000, 'gt1', [{ playerId: 'p1', score: 5 }, { playerId: 'p2', score: 10 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'b2').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 3 }])
    })

    it('produces multiple holders on a tie', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'b2').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1 },
        { playerId: 'p2', name: 'Bob', value: 1 },
      ])
    })

    it('is empty when there are no matches', () => {
      const holders = trophy(buildUseCase().invoke(), 'b2').holders

      expect(holders).toEqual([])
    })
  })

  describe('B3 — The Regular', () => {
    function seedMatches(matchRepo: InMemoryMatchRepository, playerId: string, opponentId: string, wins: number, total: number) {
      for (let i = 0; i < total; i++) {
        const playerWins = i < wins
        matchRepo.save(
          match(`${playerId}-${i}`, 1000 + i, 'gt1', [
            { playerId, score: playerWins ? 10 : 5 },
            { playerId: opponentId, score: playerWins ? 5 : 10 },
          ]),
        )
      }
    }

    it('crowns the best win ratio among players with at least the minimum matches', () => {
      expect(REGULAR_MIN_MATCHES).toBe(10)

      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      seedMatches(matchRepo, 'p1', 'p2', 8, 10)

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'b3').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 0.8, detail: { kind: 'ratio', wins: 8, played: 10 } }])
    })

    it('produces multiple holders on a tied ratio', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      playerRepo.save(player('p3', 'Charlie'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      seedMatches(matchRepo, 'p1', 'p3', 5, 10)
      seedMatches(matchRepo, 'p2', 'p3', 5, 10)

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'b3').holders

      // Charlie played both batches (10 against each), so he ties too: 10/20 = 0.5.
      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 0.5, detail: { kind: 'ratio', wins: 5, played: 10 } },
        { playerId: 'p2', name: 'Bob', value: 0.5, detail: { kind: 'ratio', wins: 5, played: 10 } },
        { playerId: 'p3', name: 'Charlie', value: 0.5, detail: { kind: 'ratio', wins: 10, played: 20 } },
      ])
    })

    it('has no holder when nobody reaches the minimum matches, even at a 100% win rate', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      seedMatches(matchRepo, 'p1', 'p2', 9, 9)

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'b3').holders

      expect(holders).toEqual([])
    })
  })

  describe('C1 — The Peak', () => {
    it('crowns the highest ELO ever reached, which can exceed the current rating', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // Alice climbs to her peak (1231) on m2, then loses m3, ending at 1212 — below her peak.
      matchRepo.save(match('m1', new Date(2026, 0, 10).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', new Date(2026, 0, 15).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', new Date(2026, 0, 20).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'c1').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1231, detail: { kind: 'date', epochMs: new Date(2026, 0, 15).getTime() } },
      ])
    })

    it('uses the single match rating when there is only one match', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 0, 10).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'c1').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1216, detail: { kind: 'date', epochMs: new Date(2026, 0, 10).getTime() } },
      ])
    })

    it('recomputes the ELO history only from the selected game type matches', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Chess'))
      gameTypeRepo.save(gameType('gt2', 'Darts'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 0, 10).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', new Date(2026, 0, 20).getTime(), 'gt2', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

      expect(trophy(useCase.invoke('gt1'), 'c1').holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1216, detail: { kind: 'date', epochMs: new Date(2026, 0, 10).getTime() } },
      ])
      expect(trophy(useCase.invoke('gt2'), 'c1').holders).toEqual([
        { playerId: 'p2', name: 'Bob', value: 1216, detail: { kind: 'date', epochMs: new Date(2026, 0, 20).getTime() } },
      ])
    })
  })

  describe('C3 — King of the Hill', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('credits the earlier leader for the gap between snapshots, and the new leader up to today', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 31))

      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const snapshots: EloSnapshot[] = [
        { matchId: 'm1', date: new Date(2026, 0, 1).getTime(), ratings: new Map([['p1', 1300], ['p2', 1200]]) },
        { matchId: 'm2', date: new Date(2026, 0, 11).getTime(), ratings: new Map([['p1', 1150], ['p2', 1200]]) },
      ]

      const useCase = buildUseCase(new InMemoryMatchRepository(), new InMemoryGameTypeRepository(), playerRepo, new FakeEloCalculator(snapshots))

      // Alice led from Jan 1 to Jan 11 (10 days), then Bob took over and leads up to "today" (Jan 31, 20 days).
      const holders = trophy(useCase.invoke(), 'c3').holders

      expect(holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 20 }])
    })

    it('splits credit between every tied leader at a snapshot', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 7))

      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      playerRepo.save(player('p3', 'Charlie'))
      const snapshots: EloSnapshot[] = [
        { matchId: 'm1', date: new Date(2026, 0, 1).getTime(), ratings: new Map([['p1', 1220], ['p2', 1220], ['p3', 1150]]) },
      ]

      const useCase = buildUseCase(new InMemoryMatchRepository(), new InMemoryGameTypeRepository(), playerRepo, new FakeEloCalculator(snapshots))

      const holders = trophy(useCase.invoke(), 'c3').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 6 },
        { playerId: 'p2', name: 'Bob', value: 6 },
      ])
    })

    it('credits the sole leader up to today when there is only one match', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 0, 16))

      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 0, 1).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'c3').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 15 }])
    })
  })

  describe('D1 — Game Record', () => {
    it('crowns the highest score for a HIGHEST_SCORE game type', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Chess', 'HIGHEST_SCORE'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 42 }, { playerId: 'p2', score: 10 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 8 }, { playerId: 'p2', score: 30 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'd1').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 42, detail: 'Chess' }])
    })

    it('crowns the lowest score for a LOWEST_SCORE game type', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Golf', 'LOWEST_SCORE'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 72 }, { playerId: 'p2', score: 68 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 90 }, { playerId: 'p2', score: 80 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'd1').holders

      expect(holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 68, detail: 'Golf' }])
    })

    it('produces multiple holders on a tied record', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Chess', 'HIGHEST_SCORE'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 42 }, { playerId: 'p2', score: 10 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 8 }, { playerId: 'p2', score: 42 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'd1').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 42, detail: 'Chess' },
        { playerId: 'p2', name: 'Bob', value: 42, detail: 'Chess' },
      ])
    })

    it('lists one record per game type under the "All games" filter, and excludes MANUAL game types', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Chess', 'HIGHEST_SCORE'))
      gameTypeRepo.save(gameType('gt2', 'Golf', 'LOWEST_SCORE'))
      gameTypeRepo.save(gameType('gt3', 'Poker', 'MANUAL'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 42 }, { playerId: 'p2', score: 10 }]))
      matchRepo.save(match('m2', 2000, 'gt2', [{ playerId: 'p1', score: 72 }, { playerId: 'p2', score: 68 }]))
      matchRepo.save(
        match('m3', 3000, 'gt3', [{ playerId: 'p1', score: 0 }, { playerId: 'p2', score: 0 }], {
          manualWinners: ['p1'],
        }),
      )

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'd1').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 42, detail: 'Chess' },
        { playerId: 'p2', name: 'Bob', value: 68, detail: 'Golf' },
      ])
    })

    it('is empty when the only played game type is MANUAL', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Poker', 'MANUAL'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(
        match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 0 }, { playerId: 'p2', score: 0 }], {
          manualWinners: ['p1'],
        }),
      )

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'd1').holders

      expect(holders).toEqual([])
    })
  })

  describe('E1 — Nemesis', () => {
    function seedRivalry(matchRepo: InMemoryMatchRepository, dominantId: string, dominatedId: string, dominantWins: number, meetings: number) {
      for (let i = 0; i < meetings; i++) {
        const dominantWon = i < dominantWins
        matchRepo.save(
          match(`${dominantId}-${dominatedId}-${i}`, 1000 + i, 'gt1', [
            { playerId: dominantId, score: dominantWon ? 10 : 5 },
            { playerId: dominatedId, score: dominantWon ? 5 : 10 },
          ]),
        )
      }
    }

    it('crowns the pair with the biggest wins-minus-losses gap, among pairs with the minimum meetings', () => {
      expect(NEMESIS_MIN_MEETINGS).toBe(5)

      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      seedRivalry(matchRepo, 'p1', 'p2', 5, 5)

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'e1').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 5, detail: 'Bob' }])
    })

    it('produces multiple holders when two rivalries share the same gap', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      playerRepo.save(player('p3', 'Charlie'))
      playerRepo.save(player('p4', 'Dana'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      seedRivalry(matchRepo, 'p1', 'p2', 5, 5)
      seedRivalry(matchRepo, 'p3', 'p4', 5, 5)

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'e1').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 5, detail: 'Bob' },
        { playerId: 'p3', name: 'Charlie', value: 5, detail: 'Dana' },
      ])
    })

    it('is empty when no pair has met the minimum number of times', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      seedRivalry(matchRepo, 'p1', 'p2', 4, 4)

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'e1').holders

      expect(holders).toEqual([])
    })
  })

  describe('F2 — Player of the Month', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 7, 15))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('crowns the player with the most wins in the current calendar month', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // 2 wins this month for Alice, 1 for Bob; an older win for Bob is out of scope.
      matchRepo.save(match('m1', new Date(2026, 6, 20).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
      matchRepo.save(match('m2', new Date(2026, 7, 2).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', new Date(2026, 7, 10).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m4', new Date(2026, 7, 12).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f2').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2 }])
    })

    it('produces multiple holders on a tie', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 7, 2).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', new Date(2026, 7, 10).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f2').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1 },
        { playerId: 'p2', name: 'Bob', value: 1 },
      ])
    })

    it('is legitimately empty when there is no win yet this month', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 6, 20).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f2').holders

      expect(holders).toEqual([])
    })
  })

  describe('F3 — Monthly Champions', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 7, 15))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('crowns the winner of each completed month, excluding the current month', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // July 2026: Alice wins twice, Bob once.
      matchRepo.save(match('m1', new Date(2026, 6, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', new Date(2026, 6, 10).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', new Date(2026, 6, 15).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
      // August 2026 is the current month — excluded from f3.
      matchRepo.save(match('m4', new Date(2026, 7, 2).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f3').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2, period: { kind: 'month', year: 2026, month: 6 } }])
    })

    it('produces multiple holders on a tie within the same month', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 6, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', new Date(2026, 6, 10).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f3').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1, period: { kind: 'month', year: 2026, month: 6 } },
        { playerId: 'p2', name: 'Bob', value: 1, period: { kind: 'month', year: 2026, month: 6 } },
      ])
    })

    it('orders holders from the most recent completed month to the oldest', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // June 2026: Bob wins.
      matchRepo.save(match('m1', new Date(2026, 5, 5).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
      // July 2026: Alice wins.
      matchRepo.save(match('m2', new Date(2026, 6, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f3').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1, period: { kind: 'month', year: 2026, month: 6 } },
        { playerId: 'p2', name: 'Bob', value: 1, period: { kind: 'month', year: 2026, month: 5 } },
      ])
    })

    it('treats December and January of different years as two distinct periods', () => {
      vi.setSystemTime(new Date(2026, 1, 15))
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      // December 2025: Bob wins.
      matchRepo.save(match('m1', new Date(2025, 11, 20).getTime(), 'gt1', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
      // January 2026: Alice wins.
      matchRepo.save(match('m2', new Date(2026, 0, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f3').holders

      expect(holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1, period: { kind: 'month', year: 2026, month: 0 } },
        { playerId: 'p2', name: 'Bob', value: 1, period: { kind: 'month', year: 2025, month: 11 } },
      ])
    })

    it('is empty when no month has ever been completed with a win', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 7, 2).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f3').holders

      expect(holders).toEqual([])
    })

    it('follows the game type filter, like every other trophy', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Chess'))
      gameTypeRepo.save(gameType('gt2', 'Darts'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 6, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', new Date(2026, 6, 10).getTime(), 'gt2', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

      expect(trophy(useCase.invoke('gt1'), 'f3').holders).toEqual([
        { playerId: 'p1', name: 'Alice', value: 1, period: { kind: 'month', year: 2026, month: 6 } },
      ])
      expect(trophy(useCase.invoke('gt2'), 'f3').holders).toEqual([
        { playerId: 'p2', name: 'Bob', value: 1, period: { kind: 'month', year: 2026, month: 6 } },
      ])
    })
  })

  describe('game type filter', () => {
    it('computes trophies only from the selected game type matches', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Chess'))
      gameTypeRepo.save(gameType('gt2', 'Darts'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m3', 3000, 'gt2', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
      matchRepo.save(match('m4', 4000, 'gt2', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))
      matchRepo.save(match('m5', 5000, 'gt2', [{ playerId: 'p2', score: 10 }, { playerId: 'p1', score: 5 }]))

      const useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

      expect(trophy(useCase.invoke('gt1'), 'a1').holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2 }])
      expect(trophy(useCase.invoke('gt2'), 'a1').holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 3 }])
      expect(trophy(useCase.invoke('gt1'), 'b2').holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2 }])
      expect(trophy(useCase.invoke('gt2'), 'b2').holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 3 }])
    })
  })

  describe('robustness', () => {
    // Scoped like C3/F2/F3 above: releasing the clock on the last line of a test
    // means a failing assertion leaves every later test frozen at that date, and
    // the cause hidden behind the failures it causes.
    afterEach(() => {
      vi.useRealTimers()
    })

    it('ignores matches referencing a non-existent game type', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice'))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'ghost', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const trophies = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()

      for (const t of trophies) {
        expect(t.holders).toEqual([])
      }
    })

    it('inactive players remain eligible for a trophy already earned', () => {
      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice', false))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
      matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'a1').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 2 }])
    })

    it('inactive players remain eligible for a past monthly title (f3)', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date(2026, 7, 15))

      const playerRepo = new InMemoryPlayerRepository()
      playerRepo.save(player('p1', 'Alice', false))
      playerRepo.save(player('p2', 'Bob'))
      const gameTypeRepo = new InMemoryGameTypeRepository()
      gameTypeRepo.save(gameType('gt1', 'Test'))
      const matchRepo = new InMemoryMatchRepository()
      matchRepo.save(match('m1', new Date(2026, 6, 5).getTime(), 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

      const holders = trophy(buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke(), 'f3').holders

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 1, period: { kind: 'month', year: 2026, month: 6 } }])
    })
  })
})
