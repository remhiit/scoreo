import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../domain/model/errors'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { ArchiveGameTypeUseCase } from './archiveGameTypeUseCase'

describe('ArchiveGameTypeUseCase', () => {
  it('archive game type sets active to false', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new ArchiveGameTypeUseCase(repo)

    repo.save({
      id: 'g1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })

    useCase.invoke('g1')

    expect(repo.findById('g1')?.active).toBe(false)
  })

  it('archive preserves game type id and name', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new ArchiveGameTypeUseCase(repo)

    repo.save({
      id: 'g1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      moduleId: null,
      active: true,
    })

    useCase.invoke('g1')

    const archived = repo.findById('g1')
    expect(archived?.id).toBe('g1')
    expect(archived?.name).toBe('Belote')
  })

  it('archive non-existent game type throws', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new ArchiveGameTypeUseCase(repo)

    expect(() => useCase.invoke('nonexistent')).toThrow(NotFoundError)
  })
})
