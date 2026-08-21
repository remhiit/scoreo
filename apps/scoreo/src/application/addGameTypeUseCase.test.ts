import { describe, expect, it } from 'vitest'
import { ValidationError } from '../domain/model/errors'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { AddGameTypeUseCase } from './addGameTypeUseCase'

describe('AddGameTypeUseCase', () => {
  it('adds game type to repository', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Belote', 'HIGHEST_SCORE')
    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].name).toBe('Belote')
  })

  it('trims whitespace from name', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('  Golf  ', 'LOWEST_SCORE')
    expect(repo.getAll()[0].name).toBe('Golf')
  })

  it('each game type gets a unique id', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Belote', 'HIGHEST_SCORE')
    useCase.invoke('Golf', 'LOWEST_SCORE')
    const ids = repo.getAll().map((g) => g.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('returns the created game type', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    const result = useCase.invoke('Belote', 'HIGHEST_SCORE')
    expect(result.id).toBeTruthy()
    expect(result.name).toBe('Belote')
    expect(result.winCondition).toBe('HIGHEST_SCORE')
  })

  it('stores winCondition correctly', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Golf', 'LOWEST_SCORE')
    expect(repo.getAll()[0].winCondition).toBe('LOWEST_SCORE')
  })

  it('multiple game types are all saved', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('A', 'HIGHEST_SCORE')
    useCase.invoke('B', 'LOWEST_SCORE')
    useCase.invoke('C', 'MANUAL')
    expect(repo.getAll()).toHaveLength(3)
  })

  it('rejects name exceeding 50 characters', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    const longName = 'A'.repeat(51)
    let error: unknown
    try {
      useCase.invoke(longName, 'HIGHEST_SCORE')
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).message).toContain('50')
  })

  it('accepts name of exactly 50 characters', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    const name = 'A'.repeat(50)
    const gameType = useCase.invoke(name, 'HIGHEST_SCORE')
    expect(gameType.name).toHaveLength(50)
  })

  it('stores tie break rule correctly', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Golf', 'HIGHEST_SCORE', { tieBreakRule: 'SECONDARY_SCORE' })
    expect(repo.getAll()[0].tieBreakRule).toBe('SECONDARY_SCORE')
  })

  it('stores tie break condition correctly', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Golf', 'HIGHEST_SCORE', {
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
    })
    expect(repo.getAll()[0].tieBreakCondition).toBe('LOWEST_SCORE')
  })

  it('stores tie break label correctly', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Golf', 'HIGHEST_SCORE', {
      tieBreakRule: 'SECONDARY_SCORE',
      tieBreakCondition: 'LOWEST_SCORE',
      tieBreakLabel: 'Handicap',
    })
    expect(repo.getAll()[0].tieBreakLabel).toBe('Handicap')
  })

  it('defaults tie break rule to NONE', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Belote', 'HIGHEST_SCORE')
    expect(repo.getAll()[0].tieBreakRule).toBe('NONE')
  })

  it('defaults tie break label to null', () => {
    const repo = new InMemoryGameTypeRepository()
    const useCase = new AddGameTypeUseCase(repo)
    useCase.invoke('Belote', 'HIGHEST_SCORE')
    expect(repo.getAll()[0].tieBreakLabel).toBeNull()
  })
})
