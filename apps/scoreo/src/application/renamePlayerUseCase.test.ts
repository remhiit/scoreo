import { describe, expect, it } from 'vitest'
import { NotFoundError, ValidationError } from '../domain/model/errors'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { RenamePlayerUseCase } from './renamePlayerUseCase'

describe('RenamePlayerUseCase', () => {
  it('renames existing player', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new RenamePlayerUseCase(repo)

    useCase.invoke('p1', 'Alicia')

    const renamed = repo.getAll()[0]
    expect(renamed.name).toBe('Alicia')
    expect(renamed.id).toBe('p1')
  })

  it('preserves player ID after rename', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new RenamePlayerUseCase(repo)

    useCase.invoke('p1', 'Bob')

    expect(repo.getAll()[0].id).toBe('p1')
  })

  it('throws when player not found', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new RenamePlayerUseCase(repo)

    expect(() => useCase.invoke('nonexistent', 'NewName')).toThrow(NotFoundError)
  })

  it('trims whitespace from new name', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new RenamePlayerUseCase(repo)

    useCase.invoke('p1', '  Bob  ')

    expect(repo.getAll()[0].name).toBe('Bob')
  })

  it('throws when new name is blank', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new RenamePlayerUseCase(repo)

    expect(() => useCase.invoke('p1', '   ')).toThrow(ValidationError)
  })

  it('throws when name exceeds 50 characters', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new RenamePlayerUseCase(repo)
    const longName = 'A'.repeat(51)

    let error: unknown
    try {
      useCase.invoke('p1', longName)
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).message).toContain('50')
  })

  it('accepts name of exactly 50 characters', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new RenamePlayerUseCase(repo)
    const name = 'A'.repeat(50)

    useCase.invoke('p1', name)

    expect(repo.getAll()[0].name).toHaveLength(50)
  })

  it('allows renaming to same name', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new RenamePlayerUseCase(repo)

    useCase.invoke('p1', 'Alice')

    expect(repo.getAll()[0].name).toBe('Alice')
  })

  it('works with inactive players', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: false })
    const useCase = new RenamePlayerUseCase(repo)

    useCase.invoke('p1', 'Bob')

    const inactive = repo.getAll(true)
    expect(inactive[0].name).toBe('Bob')
    expect(inactive[0].active).toBe(false)
  })
})
