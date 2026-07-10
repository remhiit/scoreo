import { describe, expect, it } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import type { Player } from '../domain/model/player'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { GetHeadToHeadUseCase } from './getHeadToHeadUseCase'

const ELO_INITIAL = 1200
const ELO_K = 32
const ELO_AFTER_WIN = ELO_INITIAL + Math.round(ELO_K * 0.5) // 1216
const ELO_AFTER_LOSS = ELO_INITIAL - Math.round(ELO_K * 0.5) // 1184

function player(id: string, name: string, active = true): Player {
  return { id, name, active }
}

function gameType(id: string, name: string, winCondition: GameType['winCondition']): GameType {
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

function match(id: string, date: number, gameTypeId: string, playerScores: Match['playerScores'], overrides: Partial<Match> = {}): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], ...overrides }
}

function buildUseCase(
  matchRepo = new InMemoryMatchRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
  playerRepo = new InMemoryPlayerRepository(),
) {
  return new GetHeadToHeadUseCase(matchRepo, gameTypeRepo, playerRepo)
}

describe('GetHeadToHeadUseCase', () => {
  it('empty when no matches', () => {
    expect(buildUseCase().invoke()).toEqual([])
  })

  it('returns player detail with total wins and losses', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(
      match('m1', 1000, 'gt1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ]),
    )
    const result = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()

    expect(result).toHaveLength(2)
    const alice = result.find((r) => r.playerId === 'p1')
    expect(alice?.wins).toBe(1)
    expect(alice?.losses).toBe(0)
  })

  it('leaderboard sorted by elo descending', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    playerRepo.save(player('p3', 'Charlie'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 8 }, { playerId: 'p2', score: 12 }]))
    matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p3', score: 10 }, { playerId: 'p1', score: 3 }]))

    const result = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()

    expect(result.map((r) => r.playerId)).toEqual(['p3', 'p2', 'p1'])
  })

  it('excludes players with zero matches', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    expect(buildUseCase(undefined, undefined, playerRepo).invoke()).toEqual([])
  })

  it('head to head computed correctly', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 8 }, { playerId: 'p2', score: 12 }]))
    matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 6 }]))

    const result = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()
    const alice = result.find((r) => r.playerId === 'p1')!
    const bob = result.find((r) => r.playerId === 'p2')!

    expect(alice.headToHead).toHaveLength(1)
    expect(alice.headToHead[0].wins).toBe(2)
    expect(alice.headToHead[0].losses).toBe(1)
    expect(bob.headToHead).toHaveLength(1)
    expect(bob.headToHead[0].wins).toBe(1)
    expect(bob.headToHead[0].losses).toBe(2)
  })

  it('head to head in multi player match', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    playerRepo.save(player('p3', 'Charlie'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(
      match('m1', 1000, 'gt1', [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
        { playerId: 'p3', score: 3 },
      ]),
    )

    const result = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()
    const alice = result.find((r) => r.playerId === 'p1')!
    const bob = result.find((r) => r.playerId === 'p2')!
    const charlie = result.find((r) => r.playerId === 'p3')!

    expect(alice.headToHead).toHaveLength(2)
    expect(alice.headToHead.find((h) => h.opponentId === 'p2')?.wins).toBe(1)
    expect(alice.headToHead.find((h) => h.opponentId === 'p3')?.wins).toBe(1)
    expect(bob.headToHead.find((h) => h.opponentId === 'p1')?.losses).toBe(1)
    expect(charlie.headToHead.find((h) => h.opponentId === 'p1')?.losses).toBe(1)
  })

  it('includes inactive players in results', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice', false))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

    const result = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()

    expect(result).toHaveLength(2)
    expect(result.some((r) => r.playerId === 'p1')).toBe(true)
  })

  it('elo is 1200 for players with no matches', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    expect(buildUseCase(undefined, undefined, playerRepo).invoke()).toEqual([])
  })

  it('elo changes after a match', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))

    const result = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()
    const alice = result.find((r) => r.playerId === 'p1')!
    const bob = result.find((r) => r.playerId === 'p2')!

    expect(alice.elo).toBe(ELO_AFTER_WIN)
    expect(bob.elo).toBe(ELO_AFTER_LOSS)
  })

  it('filters by gameTypeId', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Type A', 'HIGHEST_SCORE'))
    gameTypeRepo.save(gameType('gt2', 'Type B', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    matchRepo.save(match('m2', 2000, 'gt2', [{ playerId: 'p1', score: 3 }, { playerId: 'p2', score: 10 }]))
    const useCase = buildUseCase(matchRepo, gameTypeRepo, playerRepo)

    const gt1 = useCase.invoke('gt1')
    expect(gt1.find((r) => r.playerId === 'p1')?.elo).toBe(ELO_AFTER_WIN)
    expect(gt1.find((r) => r.playerId === 'p2')?.elo).toBe(ELO_AFTER_LOSS)

    const gt2 = useCase.invoke('gt2')
    expect(gt2.find((r) => r.playerId === 'p1')?.elo).toBe(ELO_AFTER_LOSS)
    expect(gt2.find((r) => r.playerId === 'p2')?.elo).toBe(ELO_AFTER_WIN)

    expect(useCase.invoke('nonexistent')).toEqual([])
  })

  it('elo with multiple matches', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save(player('p1', 'Alice'))
    playerRepo.save(player('p2', 'Bob'))
    playerRepo.save(player('p3', 'Charlie'))
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test', 'HIGHEST_SCORE'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'p1', score: 10 }, { playerId: 'p2', score: 5 }]))
    matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'p1', score: 8 }, { playerId: 'p2', score: 12 }]))
    matchRepo.save(match('m3', 3000, 'gt1', [{ playerId: 'p3', score: 10 }, { playerId: 'p1', score: 3 }]))

    const result = buildUseCase(matchRepo, gameTypeRepo, playerRepo).invoke()
    const alice = result.find((r) => r.playerId === 'p1')!
    const bob = result.find((r) => r.playerId === 'p2')!
    const charlie = result.find((r) => r.playerId === 'p3')!

    expect(alice.elo).toBeLessThan(bob.elo)
    expect(bob.elo).toBeLessThan(charlie.elo)
    expect(result.map((r) => r.playerId)).toEqual(['p3', 'p2', 'p1'])
  })
})
