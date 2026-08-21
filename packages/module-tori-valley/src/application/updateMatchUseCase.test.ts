import { describe, expect, it } from 'vitest'
import { NotFoundError, ValidationError } from '../domain/model/errors'
import { emptyPlayerResult } from '../domain/model/match'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { CreateMatchUseCase } from './createMatchUseCase'
import { UpdateMatchUseCase } from './updateMatchUseCase'

describe('UpdateMatchUseCase', () => {
  it('updates the results of an existing match', () => {
    const repo = new InMemoryMatchRepository()
    const match = new CreateMatchUseCase(repo).invoke(
      ['p1', 'p2'],
      [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
      1000,
    )

    const updated = new UpdateMatchUseCase(repo).invoke(match.id, [
      { ...emptyPlayerResult('p1'), parcheminValue: 5 },
      emptyPlayerResult('p2'),
    ])

    expect(updated.results[0].parcheminValue).toBe(5)
    expect(repo.findById(match.id)?.results[0].parcheminValue).toBe(5)
  })

  it('throws when the match does not exist', () => {
    const useCase = new UpdateMatchUseCase(new InMemoryMatchRepository())
    expect(() => useCase.invoke('missing', [])).toThrow(NotFoundError)
  })

  it('rejects results that do not match the match players', () => {
    const repo = new InMemoryMatchRepository()
    const match = new CreateMatchUseCase(repo).invoke(
      ['p1', 'p2'],
      [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
      1000,
    )

    expect(() => new UpdateMatchUseCase(repo).invoke(match.id, [emptyPlayerResult('p1')])).toThrow(
      ValidationError,
    )
  })
})
