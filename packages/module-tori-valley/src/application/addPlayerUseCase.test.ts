import { describe, expect, it } from 'vitest'
import { ValidationError } from '../domain/model/errors'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { AddPlayerUseCase } from './addPlayerUseCase'

describe('AddPlayerUseCase', () => {
  it('adds a player to the repository', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    useCase.invoke('Alice')

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].name).toBe('Alice')
  })

  it('trims whitespace from the name', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    useCase.invoke('  Bob  ')

    expect(repo.getAll()[0].name).toBe('Bob')
  })

  it('gives each player a unique id', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    useCase.invoke('Alice')
    useCase.invoke('Bob')

    const ids = repo.getAll().map((p) => p.id)
    expect(ids[0]).not.toBe(ids[1])
  })

  it('rejects a blank name', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    expect(() => useCase.invoke('   ')).toThrow(ValidationError)
  })

  it('rejects a name exceeding 50 characters', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    expect(() => useCase.invoke('A'.repeat(51))).toThrow(ValidationError)
  })

  it('accepts a name of exactly 50 characters', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new AddPlayerUseCase(repo)

    const player = useCase.invoke('A'.repeat(50))

    expect(player.name).toHaveLength(50)
  })
})
