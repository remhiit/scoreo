import { describe, expect, it } from 'vitest'
import { ValidationError } from '../domain/model/errors'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { AddPlayerUseCase } from './addPlayerUseCase'

describe('AddPlayerUseCase', () => {
  it('adds player to repository', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    useCase.invoke('Alice')

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].name).toBe('Alice')
  })

  it('trims whitespace from name', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    useCase.invoke('  Bob  ')

    expect(repo.getAll()[0].name).toBe('Bob')
  })

  it('each player gets a unique id', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    useCase.invoke('Alice')
    useCase.invoke('Bob')

    const ids = repo.getAll().map((p) => p.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('multiple players are all saved', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    useCase.invoke('Alice')
    useCase.invoke('Bob')
    useCase.invoke('Charlie')

    expect(repo.getAll()).toHaveLength(3)
  })

  it('rejects name exceeding 50 characters', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)
    const longName = 'A'.repeat(51)

    let error: unknown
    try {
      useCase.invoke(longName)
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).message).toContain('50')
  })

  it('accepts name of exactly 50 characters', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)
    const name = 'A'.repeat(50)

    const player = useCase.invoke(name)

    expect(player.name).toHaveLength(50)
  })
})
