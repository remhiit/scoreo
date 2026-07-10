import { describe, expect, it } from 'vitest'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { DeletePlayerUseCase } from './deletePlayerUseCase'

describe('DeletePlayerUseCase', () => {
  it('delete marks player as inactive', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new DeletePlayerUseCase(repo)

    useCase.invoke('p1')

    const all = repo.getAll(true)
    expect(all).toHaveLength(1)
    expect(all[0].active).toBe(false)
  })

  it('delete keeps name by default', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new DeletePlayerUseCase(repo)

    useCase.invoke('p1')

    expect(repo.getAll(true)[0].name).toBe('Alice')
  })

  it('delete with anonymize blanks name', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new DeletePlayerUseCase(repo)

    useCase.invoke('p1', true)

    expect(repo.getAll(true)[0].name).toBe('')
  })

  it('active players excluded by default after delete', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    repo.save({ id: 'p2', name: 'Bob', active: true })
    const useCase = new DeletePlayerUseCase(repo)

    useCase.invoke('p1')

    const active = repo.getAll()
    expect(active).toHaveLength(1)
    expect(active[0].name).toBe('Bob')
  })

  it('delete non-existent id does not throw', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new DeletePlayerUseCase(repo)

    expect(() => useCase.invoke('non_existent')).not.toThrow()
  })

  it('delete is idempotent', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    const useCase = new DeletePlayerUseCase(repo)

    useCase.invoke('p1')
    useCase.invoke('p1')

    const all = repo.getAll(true)
    expect(all).toHaveLength(1)
    expect(all[0].active).toBe(false)
  })
})
