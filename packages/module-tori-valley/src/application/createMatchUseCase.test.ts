import { describe, expect, it } from 'vitest'
import { ValidationError } from '../domain/model/errors'
import { emptyPlayerResult } from '../domain/model/match'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { CreateMatchUseCase } from './createMatchUseCase'

describe('CreateMatchUseCase', () => {
  it('creates and saves a match', () => {
    const repo = new InMemoryMatchRepository()
    const useCase = new CreateMatchUseCase(repo)

    const match = useCase.invoke(
      ['p1', 'p2'],
      [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
      1000,
    )

    expect(repo.getAll()).toHaveLength(1)
    expect(match.playerIds).toEqual(['p1', 'p2'])
    expect(match.playedAt).toBe(1000)
  })

  it('rejects fewer than 1 player', () => {
    const useCase = new CreateMatchUseCase(new InMemoryMatchRepository())
    expect(() => useCase.invoke([], [], 1000)).toThrow(ValidationError)
  })

  it('rejects more than 4 players', () => {
    const useCase = new CreateMatchUseCase(new InMemoryMatchRepository())
    const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5']
    const results = playerIds.map(emptyPlayerResult)
    expect(() => useCase.invoke(playerIds, results, 1000)).toThrow(ValidationError)
  })

  it('rejects duplicate player ids', () => {
    const useCase = new CreateMatchUseCase(new InMemoryMatchRepository())
    expect(() =>
      useCase.invoke(['p1', 'p1'], [emptyPlayerResult('p1'), emptyPlayerResult('p1')], 1000),
    ).toThrow(ValidationError)
  })

  it('rejects results that do not cover every player', () => {
    const useCase = new CreateMatchUseCase(new InMemoryMatchRepository())
    expect(() => useCase.invoke(['p1', 'p2'], [emptyPlayerResult('p1')], 1000)).toThrow(
      ValidationError,
    )
  })
})
