import { describe, expect, it } from 'vitest'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { GetPlayerStatsUseCase } from './getPlayerStatsUseCase'

describe('GetPlayerStatsUseCase', () => {
  it('returns empty stats when no matches', () => {
    const stats = new GetPlayerStatsUseCase(new InMemoryMatchRepository(), new InMemoryGameTypeRepository()).invoke()
    expect(stats.size).toBe(0)
  })

  it('counts wins for highest score winner', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Game',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })
    matchRepo.save({
      id: 'm1',
      date: 1767225600000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const stats = new GetPlayerStatsUseCase(matchRepo, gameTypeRepo).invoke()

    expect(stats.get('alice')?.wins).toBe(1)
    expect(stats.get('alice')?.losses).toBe(0)
    expect(stats.get('bob')?.wins).toBe(0)
    expect(stats.get('bob')?.losses).toBe(1)
  })

  it('both players counted as winners on ex-aequo', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Game',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })
    matchRepo.save({
      id: 'm1',
      date: 1767225600000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 10 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const stats = new GetPlayerStatsUseCase(matchRepo, gameTypeRepo).invoke()

    expect(stats.get('alice')?.wins).toBe(1)
    expect(stats.get('bob')?.wins).toBe(1)
    expect(stats.get('alice')?.losses).toBe(0)
    expect(stats.get('bob')?.losses).toBe(0)
  })

  it('accumulates stats across multiple matches', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Game',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })
    matchRepo.save({
      id: 'm1',
      date: 1767225600000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })
    matchRepo.save({
      id: 'm2',
      date: 1767312000000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'alice', score: 3 },
        { playerId: 'bob', score: 8 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const stats = new GetPlayerStatsUseCase(matchRepo, gameTypeRepo).invoke()

    expect(stats.get('alice')?.wins).toBe(1)
    expect(stats.get('alice')?.losses).toBe(1)
    expect(stats.get('bob')?.wins).toBe(1)
    expect(stats.get('bob')?.losses).toBe(1)
  })

  it('ignores matches with unknown game type', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'unknown_gt',
      playerScores: [{ playerId: 'alice', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const stats = new GetPlayerStatsUseCase(matchRepo, gameTypeRepo).invoke()

    expect(stats.size).toBe(0)
  })

  it('uses manual winners for MANUAL condition', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Game',
      winCondition: 'MANUAL',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })
    matchRepo.save({
      id: 'm1',
      date: 1767225600000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'alice', score: 10 },
        { playerId: 'bob', score: 5 },
      ],
      manualWinners: ['bob'],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const stats = new GetPlayerStatsUseCase(matchRepo, gameTypeRepo).invoke()

    expect(stats.get('bob')?.wins).toBe(1)
    expect(stats.get('alice')?.losses).toBe(1)
  })

  it('counts wins for lowest score winner', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Game',
      winCondition: 'LOWEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'alice', score: 3 },
        { playerId: 'bob', score: 10 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const stats = new GetPlayerStatsUseCase(matchRepo, gameTypeRepo).invoke()

    expect(stats.get('alice')?.wins).toBe(1)
    expect(stats.get('alice')?.losses).toBe(0)
    expect(stats.get('bob')?.wins).toBe(0)
    expect(stats.get('bob')?.losses).toBe(1)
  })

  it('both winners on lowest score tie', () => {
    const gameTypeRepo = new InMemoryGameTypeRepository()
    const matchRepo = new InMemoryMatchRepository()
    gameTypeRepo.save({
      id: 'gt1',
      name: 'Game',
      winCondition: 'LOWEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [
        { playerId: 'alice', score: 5 },
        { playerId: 'bob', score: 5 },
        { playerId: 'charlie', score: 10 },
      ],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    })

    const stats = new GetPlayerStatsUseCase(matchRepo, gameTypeRepo).invoke()

    expect(stats.get('alice')?.wins).toBe(1)
    expect(stats.get('bob')?.wins).toBe(1)
    expect(stats.get('charlie')?.wins).toBe(0)
    expect(stats.get('charlie')?.losses).toBe(1)
  })
})
