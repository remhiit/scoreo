import { describe, expect, it } from 'vitest'
import type { Match } from '../domain/model/match'
import { InMemoryMatchDraftRepository } from '../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../infrastructure/testing/inMemoryPlayerRepository'
import { MergePlayersUseCase } from './mergePlayersUseCase'

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    date: 1000,
    gameTypeId: 'gt1',
    playerScores: [],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: [],
    ...overrides,
  }
}

function buildUseCase() {
  const playerRepo = new InMemoryPlayerRepository()
  const matchRepo = new InMemoryMatchRepository()
  const draftRepo = new InMemoryMatchDraftRepository()
  playerRepo.save({ id: 'dup', name: 'Jean Luc', active: true })
  playerRepo.save({ id: 'keep', name: 'Jean-Luc', active: true })
  playerRepo.save({ id: 'other', name: 'Bob', active: true })
  return {
    playerRepo,
    matchRepo,
    draftRepo,
    useCase: new MergePlayersUseCase(playerRepo, matchRepo, draftRepo),
  }
}

describe('MergePlayersUseCase', () => {
  it('rewrites playerScores, secondaryPlayerScores, rounds and manualWinners of the duplicate', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(
      buildMatch({
        playerScores: [
          { playerId: 'dup', score: 10 },
          { playerId: 'other', score: 4 },
        ],
        secondaryPlayerScores: [{ playerId: 'dup', score: 2 }],
        rounds: [
          [
            { playerId: 'dup', score: 6 },
            { playerId: 'other', score: 4 },
          ],
          [{ playerId: 'dup', score: 4 }],
        ],
        manualWinners: ['dup'],
      }),
    )

    useCase.invoke('dup', 'keep')

    expect(matchRepo.getAll()[0]).toEqual(
      buildMatch({
        playerScores: [
          { playerId: 'keep', score: 10 },
          { playerId: 'other', score: 4 },
        ],
        secondaryPlayerScores: [{ playerId: 'keep', score: 2 }],
        rounds: [
          [
            { playerId: 'keep', score: 6 },
            { playerId: 'other', score: 4 },
          ],
          [{ playerId: 'keep', score: 4 }],
        ],
        manualWinners: ['keep'],
      }),
    )
  })

  it('hard-deletes the duplicate and keeps the target', () => {
    const { playerRepo, useCase } = buildUseCase()

    useCase.invoke('dup', 'keep')

    expect(playerRepo.getAll(true).map((p) => p.id)).toEqual(['keep', 'other'])
  })

  it('leaves matches that never referenced the duplicate untouched', () => {
    const { matchRepo, useCase } = buildUseCase()
    const untouched = buildMatch({
      id: 'm2',
      playerScores: [
        { playerId: 'keep', score: 1 },
        { playerId: 'other', score: 2 },
      ],
    })
    matchRepo.save(untouched)

    useCase.invoke('dup', 'keep')

    expect(matchRepo.getAll()).toEqual([untouched])
  })

  it('refuses a merge when a match involves both players', () => {
    const { matchRepo, playerRepo, useCase } = buildUseCase()
    matchRepo.save(
      buildMatch({
        playerScores: [
          { playerId: 'dup', score: 10 },
          { playerId: 'keep', score: 4 },
        ],
      }),
    )

    expect(() => useCase.invoke('dup', 'keep')).toThrow(/face themselves/)
    expect(playerRepo.getAll(true)).toHaveLength(3)
    expect(matchRepo.getAll()[0].playerScores[0].playerId).toBe('dup')
  })

  it('refuses to merge a player into themselves', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('dup', 'dup')).toThrow('playerId: A player cannot be merged into themselves')
  })

  it('throws NotFoundError for an unknown duplicate or target', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('ghost', 'keep')).toThrow('Player ghost not found')
    expect(() => useCase.invoke('dup', 'ghost')).toThrow('Player ghost not found')
  })

  it('merges a soft-deleted duplicate, inactive players being eligible', () => {
    const { playerRepo, matchRepo, useCase } = buildUseCase()
    playerRepo.delete('dup')
    matchRepo.save(buildMatch({ playerScores: [{ playerId: 'dup', score: 10 }] }))

    useCase.invoke('dup', 'keep')

    expect(playerRepo.getAll(true).map((p) => p.id)).toEqual(['keep', 'other'])
    expect(matchRepo.getAll()[0].playerScores[0].playerId).toBe('keep')
  })

  it('reactivates a soft-deleted target when the duplicate was active', () => {
    const { playerRepo, useCase } = buildUseCase()
    playerRepo.delete('keep')

    useCase.invoke('dup', 'keep')

    expect(playerRepo.getAll(true).find((p) => p.id === 'keep')?.active).toBe(true)
  })

  it('leaves a soft-deleted target inactive when the duplicate was inactive too', () => {
    const { playerRepo, useCase } = buildUseCase()
    playerRepo.delete('dup')
    playerRepo.delete('keep')

    useCase.invoke('dup', 'keep')

    expect(playerRepo.getAll(true).find((p) => p.id === 'keep')?.active).toBe(false)
  })

  it('clears a match draft that references the duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    draftRepo.save({ gameTypeId: 'gt1', playerIds: ['dup', 'other'], rounds: [], updatedAt: 1 })

    useCase.invoke('dup', 'keep')

    expect(draftRepo.load()).toBeUndefined()
  })

  it('keeps a match draft that does not reference the duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    const draft = { gameTypeId: 'gt1', playerIds: ['keep', 'other'], rounds: [], updatedAt: 1 }
    draftRepo.save(draft)

    useCase.invoke('dup', 'keep')

    expect(draftRepo.load()).toEqual(draft)
  })

  it('preview counts the matches to rewrite and the conflicting ones', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ id: 'm1', playerScores: [{ playerId: 'dup', score: 1 }] }))
    matchRepo.save(
      buildMatch({
        id: 'm2',
        playerScores: [
          { playerId: 'dup', score: 1 },
          { playerId: 'keep', score: 2 },
        ],
      }),
    )
    matchRepo.save(buildMatch({ id: 'm3', playerScores: [{ playerId: 'other', score: 1 }] }))

    expect(useCase.preview('dup', 'keep')).toEqual({ affectedMatches: 2, conflictingMatches: 1 })
  })

  it('preview reports nothing for a player merged into themselves', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ playerScores: [{ playerId: 'dup', score: 1 }] }))

    expect(useCase.preview('dup', 'dup')).toEqual({ affectedMatches: 0, conflictingMatches: 0 })
  })

  it('treats a match naming the target only through manualWinners as a conflict', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(
      buildMatch({
        playerScores: [{ playerId: 'dup', score: 1 }],
        manualWinners: ['keep'],
      }),
    )

    expect(useCase.preview('dup', 'keep')).toEqual({ affectedMatches: 1, conflictingMatches: 1 })
    expect(() => useCase.invoke('dup', 'keep')).toThrow(/face themselves/)
  })
})
