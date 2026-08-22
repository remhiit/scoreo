import { describe, expect, it } from 'vitest'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { CleanupInactivePlayersUseCase } from './cleanupInactivePlayersUseCase'

describe('CleanupInactivePlayersUseCase', () => {
  it('preview returns an inactive player with no recorded match', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: false })
    const matchRepo = new InMemoryMatchRepository()
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    expect(useCase.preview()).toEqual([{ id: 'p1', name: 'Alice', active: false }])
  })

  it('preview excludes an active player even with no recorded match', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const matchRepo = new InMemoryMatchRepository()
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    expect(useCase.preview()).toEqual([])
  })

  it('preview excludes an inactive player referenced in playerScores', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: false })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    })
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    expect(useCase.preview()).toEqual([])
  })

  it('preview excludes an inactive player referenced only in secondaryPlayerScores', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: false })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [],
      manualWinners: [],
      secondaryPlayerScores: [{ playerId: 'p1', score: 10 }],
      rounds: [],
      moduleData: null,
    })
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    expect(useCase.preview()).toEqual([])
  })

  it('preview has no side effect on the repository', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: false })
    const matchRepo = new InMemoryMatchRepository()
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    useCase.preview()

    expect(playerRepo.getAll(true)).toHaveLength(1)
  })

  it('execute hard-deletes every eligible player and returns the deleted list', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: false })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    const matchRepo = new InMemoryMatchRepository()
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    const deleted = useCase.execute()

    expect(deleted).toEqual([{ id: 'p1', name: 'Alice', active: false }])
    expect(playerRepo.getAll(true)).toEqual([{ id: 'p2', name: 'Bob', active: true }])
  })

  it('execute never deletes an active player', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const matchRepo = new InMemoryMatchRepository()
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    useCase.execute()

    expect(playerRepo.getAll(true)).toEqual([{ id: 'p1', name: 'Alice', active: true }])
  })

  it('execute never deletes an inactive player referenced in a match', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: false })
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    })
    const useCase = new CleanupInactivePlayersUseCase(playerRepo, matchRepo)

    useCase.execute()

    expect(playerRepo.getAll(true)).toEqual([{ id: 'p1', name: 'Alice', active: false }])
  })
})
