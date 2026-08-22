import { describe, expect, it } from 'vitest'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { GetGameTypesUseCase } from './getGameTypesUseCase'

function gt(id: string, name: string, winCondition: 'HIGHEST_SCORE' | 'LOWEST_SCORE', active = true) {
  return {
    id,
    name,
    winCondition,
    tieBreakRule: 'NONE' as const,
    tieBreakCondition: 'HIGHEST_SCORE' as const,
    tieBreakLabel: null,
    moduleId: null,
    active,
  }
}

describe('GetGameTypesUseCase', () => {
  it('returns empty list when no game types saved', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new GetGameTypesUseCase(repo)
    expect(useCase.invoke()).toHaveLength(0)
  })

  it('returns all saved game types', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gt('1', 'Belote', 'HIGHEST_SCORE'))
    repo.save(gt('2', 'Golf', 'LOWEST_SCORE'))
    const useCase = new GetGameTypesUseCase(repo)
    const result = useCase.invoke()
    expect(result).toHaveLength(2)
    expect(result.map((g) => g.name)).toEqual(['Belote', 'Golf'])
  })

  it('excludes inactive game types by default', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gt('1', 'Belote', 'HIGHEST_SCORE', true))
    repo.save(gt('2', 'Golf', 'LOWEST_SCORE', false))
    repo.save(gt('3', 'Bridge', 'HIGHEST_SCORE', true))
    const useCase = new GetGameTypesUseCase(repo)
    const result = useCase.invoke()
    expect(result).toHaveLength(2)
    expect(result.map((g) => g.name)).toEqual(['Belote', 'Bridge'])
  })

  it('findById includes inactive games', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gt('1', 'Archived', 'HIGHEST_SCORE', false))

    const found = repo.findById('1')
    expect(found?.name).toBe('Archived')
    expect(found?.active).toBe(false)
  })

  it('getAll with includeInactive true returns all games', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gt('1', 'Belote', 'HIGHEST_SCORE', true))
    repo.save(gt('2', 'Golf', 'LOWEST_SCORE', false))
    repo.save(gt('3', 'Bridge', 'HIGHEST_SCORE', true))
    const result = repo.getAll(true)
    expect(result).toHaveLength(3)
    expect(result.map((g) => g.name)).toEqual(['Belote', 'Golf', 'Bridge'])
  })
})
