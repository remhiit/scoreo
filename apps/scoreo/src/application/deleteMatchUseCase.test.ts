import { describe, expect, it } from 'vitest'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { DeleteMatchUseCase } from './deleteMatchUseCase'

describe('DeleteMatchUseCase', () => {
  it('deletes an existing match', () => {
    const repo = new InMemoryMatchRepository()
    const useCase = new DeleteMatchUseCase(repo)
    repo.save({ id: 'm1', gameTypeId: 'g1', date: 1000, playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null })

    useCase.invoke('m1')

    expect(repo.getAll()).toHaveLength(0)
  })

  it('does not throw when deleting a non-existent match', () => {
    const repo = new InMemoryMatchRepository()
    const useCase = new DeleteMatchUseCase(repo)

    useCase.invoke('nonexistent')

    expect(repo.getAll()).toHaveLength(0)
  })

  it('does not affect other matches', () => {
    const repo = new InMemoryMatchRepository()
    const useCase = new DeleteMatchUseCase(repo)
    repo.save({ id: 'm1', gameTypeId: 'g1', date: 1000, playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null })
    repo.save({ id: 'm2', gameTypeId: 'g1', date: 2000, playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null })

    useCase.invoke('m1')

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].id).toBe('m2')
  })
})
