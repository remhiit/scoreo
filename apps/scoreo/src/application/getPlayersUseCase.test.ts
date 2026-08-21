import { describe, expect, it } from 'vitest'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { GetPlayersUseCase } from './getPlayersUseCase'

describe('GetPlayersUseCase', () => {
  it('returns empty list when no players saved', () => {
    const repo = new InMemoryPlayerRepository()
    const useCase = new GetPlayersUseCase(repo)

    expect(useCase.invoke()).toHaveLength(0)
  })

  it('returns all saved players', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: '1', name: 'Alice', active: true })
    repo.save({ id: '2', name: 'Bob', active: true })
    const useCase = new GetPlayersUseCase(repo)

    const result = useCase.invoke()

    expect(result).toHaveLength(2)
    expect(result.map((p) => p.name)).toEqual(['Alice', 'Bob'])
  })

  it('excludes inactive players by default', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: '1', name: 'Alice', active: true })
    repo.save({ id: '2', name: 'Bob', active: false })
    const useCase = new GetPlayersUseCase(repo)

    const result = useCase.invoke()

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Alice')
  })

  it('includes inactive players when requested', () => {
    const repo = new InMemoryPlayerRepository()
    repo.save({ id: '1', name: 'Alice', active: true })
    repo.save({ id: '2', name: 'Bob', active: false })
    const useCase = new GetPlayersUseCase(repo)

    const result = useCase.invoke(true)

    expect(result).toHaveLength(2)
  })
})
