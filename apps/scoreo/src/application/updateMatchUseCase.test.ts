import { describe, expect, it } from 'vitest'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { UpdateMatchUseCase } from './updateMatchUseCase'

describe('UpdateMatchUseCase', () => {
  it('updates an existing match', () => {
    const repo = new InMemoryMatchRepository()
    const useCase = new UpdateMatchUseCase(repo)
    const original = {
      id: 'm1',
      gameTypeId: 'g1',
      date: 1000,
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    }
    repo.save(original)

    useCase.invoke({ ...original, playerScores: [{ playerId: 'p1', score: 20 }] })

    expect(repo.findById('m1')?.playerScores[0].score).toBe(20)
  })

  it('preserves match id', () => {
    const repo = new InMemoryMatchRepository()
    const useCase = new UpdateMatchUseCase(repo)
    const original = {
      id: 'm1',
      gameTypeId: 'g1',
      date: 1000,
      playerScores: [],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    }
    repo.save(original)

    useCase.invoke({ ...original, playerScores: [{ playerId: 'p1', score: 5 }] })

    expect(repo.getAll()[0].id).toBe('m1')
  })

  it('preserves date', () => {
    const repo = new InMemoryMatchRepository()
    const useCase = new UpdateMatchUseCase(repo)
    const original = {
      id: 'm1',
      gameTypeId: 'g1',
      date: 1000,
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
    }
    repo.save(original)

    useCase.invoke({ ...original, playerScores: [{ playerId: 'p1', score: 20 }] })

    expect(repo.findById('m1')?.date).toBe(1000)
  })
})
