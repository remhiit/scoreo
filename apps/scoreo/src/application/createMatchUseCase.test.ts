import { describe, expect, it } from 'vitest'
import type { WinCondition } from '../domain/model/enums'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { CreateMatchUseCase } from './createMatchUseCase'

function setup(winCondition: WinCondition) {
  const gameTypeRepo = new InMemoryGameTypeRepository()
  const matchRepo = new InMemoryMatchRepository()
  gameTypeRepo.save({
    id: 'gt1',
    name: 'TestGame',
    winCondition,
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    active: true,
  })
  const useCase = new CreateMatchUseCase(matchRepo, gameTypeRepo)
  return { useCase, matchRepo }
}

describe('CreateMatchUseCase', () => {
  it('creates match with valid data', () => {
    const { useCase, matchRepo } = setup('HIGHEST_SCORE')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      1767225600000,
    )
    expect(result.ok).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
  })

  it('fails when game type not found', () => {
    const { useCase } = setup('HIGHEST_SCORE')
    const result = useCase.invoke('unknown', [{ playerId: 'p1', score: 10 }], 1767225600000)
    expect(result.ok).toBe(false)
  })

  it('stores manual winners when MANUAL condition', () => {
    const { useCase, matchRepo } = setup('MANUAL')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      1767225600000,
      { manualWinners: ['p1'] },
    )
    expect(result.ok).toBe(true)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['p1'])
  })

  it('passes when manualWinners provided with non-MANUAL win condition (tie-break)', () => {
    const { useCase, matchRepo } = setup('HIGHEST_SCORE')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 10 },
      ],
      1767225600000,
      { manualWinners: ['p1'] },
    )
    expect(result.ok).toBe(true)
    expect(matchRepo.getAll()[0].manualWinners).toEqual(['p1'])
  })

  it('fails when manualWinners not a subset of playerScores', () => {
    const { useCase } = setup('HIGHEST_SCORE')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      1767225600000,
      { manualWinners: ['unknown'] },
    )
    expect(result.ok).toBe(false)
  })

  it('stores secondaryPlayerScores when provided', () => {
    const { useCase, matchRepo } = setup('HIGHEST_SCORE')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 10 },
      ],
      1767225600000,
      {
        secondaryPlayerScores: [
          { playerId: 'p1', score: 50 },
          { playerId: 'p2', score: 75 },
        ],
      },
    )
    expect(result.ok).toBe(true)
    expect(matchRepo.getAll()[0].secondaryPlayerScores).toHaveLength(2)
  })

  it('fails when secondaryPlayerScores has unknown playerId', () => {
    const { useCase } = setup('HIGHEST_SCORE')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      1767225600000,
      { secondaryPlayerScores: [{ playerId: 'unknown', score: 50 }] },
    )
    expect(result.ok).toBe(false)
  })

  it('stores rounds when provided', () => {
    const { useCase, matchRepo } = setup('HIGHEST_SCORE')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 13 },
        { playerId: 'p2', score: 12 },
      ],
      1767225600000,
      {
        rounds: [
          [
            { playerId: 'p1', score: 10 },
            { playerId: 'p2', score: 5 },
          ],
          [
            { playerId: 'p1', score: 3 },
            { playerId: 'p2', score: 7 },
          ],
        ],
      },
    )
    expect(result.ok).toBe(true)
    expect(matchRepo.getAll()[0].rounds).toHaveLength(2)
  })

  it('defaults rounds to an empty array when not provided', () => {
    const { useCase, matchRepo } = setup('HIGHEST_SCORE')
    useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      1767225600000,
    )
    expect(matchRepo.getAll()[0].rounds).toEqual([])
  })

  it('passes when manualWinners empty with non-MANUAL win condition', () => {
    const { useCase, matchRepo } = setup('HIGHEST_SCORE')
    const result = useCase.invoke(
      'gt1',
      [
        { playerId: 'p1', score: 10 },
        { playerId: 'p2', score: 5 },
      ],
      1767225600000,
    )
    expect(result.ok).toBe(true)
    expect(matchRepo.getAll()).toHaveLength(1)
  })
})
