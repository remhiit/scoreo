import { describe, expect, it } from 'vitest'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { AddGameTypeUseCase } from './addGameTypeUseCase'
import { UpdateGameTypeUseCase } from './updateGameTypeUseCase'

describe('UpdateGameTypeUseCase', () => {
  it('updates game type in repository', () => {
    const repo = new InMemoryGameTypeRepository()
    const addUseCase = new AddGameTypeUseCase(repo)
    const updateUseCase = new UpdateGameTypeUseCase(repo)

    const created = addUseCase.invoke('Belote', 'HIGHEST_SCORE')
    updateUseCase.invoke({ ...created, name: 'Belote Updated' })

    expect(repo.findById(created.id)?.name).toBe('Belote Updated')
  })

  it('updates tie break rule', () => {
    const repo = new InMemoryGameTypeRepository()
    const addUseCase = new AddGameTypeUseCase(repo)
    const updateUseCase = new UpdateGameTypeUseCase(repo)

    const created = addUseCase.invoke('Golf', 'HIGHEST_SCORE')
    updateUseCase.invoke({
      ...created,
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
      tieBreakLabel: 'Handicap',
    })

    const result = repo.findById(created.id)
    expect(result?.tieBreakRule).toBe('SECONDARY_SCORE')
    expect(result?.tieBreakCondition).toBe('LOWEST_SCORE')
    expect(result?.tieBreakLabel).toBe('Handicap')
  })

  it('preserves game type id', () => {
    const repo = new InMemoryGameTypeRepository()
    const addUseCase = new AddGameTypeUseCase(repo)
    const updateUseCase = new UpdateGameTypeUseCase(repo)

    const created = addUseCase.invoke('Belote', 'HIGHEST_SCORE')
    const originalId = created.id
    updateUseCase.invoke({ ...created, name: 'Belote Updated' })

    expect(repo.findById(originalId)?.id).toBe(originalId)
  })
})
