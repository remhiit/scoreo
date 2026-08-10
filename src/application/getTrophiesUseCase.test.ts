import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import type { Player } from '../domain/model/player'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { GetTrophiesUseCase, NEMESIS_MIN_MEETINGS, REGULAR_MIN_MATCHES } from './getTrophiesUseCase'

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
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [], ...overrides }
}

function buildUseCase(
  matchRepo = new InMemoryMatchRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  playerRepo = new InMemoryPlayerRepository(),
) {
  return new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo)
}

function trophy(trophies: ReturnType<GetTrophiesUseCase['invoke']>, id: string) {
  const found = trophies.find((t) => t.id === id)
  if (!found) throw new Error(`Trophy ${id} not found`)
  return found
}

describe('GetTrophiesUseCase', () => {
  it('returns all trophies with empty holders when there are no matches', () => {
    const trophies = buildUseCase().invoke()

    expect(trophies).toHaveLength(8)
    expect(trophies.map((t) => t.id)).toEqual(['a1', 'a2', 'a4', 'b2', 'b3', 'd1', 'e1', 'f2'])
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

      expect(holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 2, detail: "Ended Alice's streak" }])
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
        { playerId: 'p2', name: 'Bob', value: 2, detail: "Ended Alice's streak" },
        { playerId: 'p3', name: 'Charlie', value: 2, detail: "Ended Alice's streak" },
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

      expect(holders).toEqual([{ playerId: 'p2', name: 'Bob', value: 3, detail: "Ended Charlie's streak" }])
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

      expect(holders).toEqual([{ playerId: 'p1', name: 'Alice', value: 0.8, detail: '8/10 matches' }])
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
        { playerId: 'p1', name: 'Alice', value: 0.5, detail: '5/10 matches' },
        { playerId: 'p2', name: 'Bob', value: 0.5, detail: '5/10 matches' },
        { playerId: 'p3', name: 'Charlie', value: 0.5, detail: '10/20 matches' },
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
  })
})
