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
  playerRepo.save({ id: 'keep', name: 'Jean-Luc', active: true })
  playerRepo.save({ id: 'dup', name: 'Jean Luc', active: true })
  playerRepo.save({ id: 'dup2', name: 'JeanLuc', active: true })
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

    useCase.invoke('keep', ['dup'])

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

  it('folds several duplicates into the kept player in one pass', () => {
    const { playerRepo, matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ id: 'm1', playerScores: [{ playerId: 'dup', score: 10 }] }))
    matchRepo.save(buildMatch({ id: 'm2', playerScores: [{ playerId: 'dup2', score: 7 }] }))

    useCase.invoke('keep', ['dup', 'dup2'])

    expect(playerRepo.getAll(true).map((p) => p.id)).toEqual(['keep', 'other'])
    expect(matchRepo.getAll().map((m) => m.playerScores[0].playerId)).toEqual(['keep', 'keep'])
  })

  it('hard-deletes the duplicate and keeps the target', () => {
    const { playerRepo, useCase } = buildUseCase()

    useCase.invoke('keep', ['dup'])

    expect(playerRepo.getAll(true).map((p) => p.id)).toEqual(['keep', 'dup2', 'other'])
  })

  it('leaves matches that never referenced a duplicate untouched', () => {
    const { matchRepo, useCase } = buildUseCase()
    const untouched = buildMatch({
      id: 'm2',
      playerScores: [
        { playerId: 'keep', score: 1 },
        { playerId: 'other', score: 2 },
      ],
    })
    matchRepo.save(untouched)

    useCase.invoke('keep', ['dup'])

    expect(matchRepo.getAll()).toEqual([untouched])
  })

  it('refuses a merge when a match involves the duplicate and the kept player', () => {
    const { matchRepo, playerRepo, useCase } = buildUseCase()
    matchRepo.save(
      buildMatch({
        playerScores: [
          { playerId: 'dup', score: 10 },
          { playerId: 'keep', score: 4 },
        ],
      }),
    )

    expect(() => useCase.invoke('keep', ['dup'])).toThrow(/face themselves/)
    expect(playerRepo.getAll(true)).toHaveLength(4)
    expect(matchRepo.getAll()[0].playerScores[0].playerId).toBe('dup')
  })

  it('refuses a merge when a match involves two duplicates of the same group', () => {
    const { matchRepo, playerRepo, useCase } = buildUseCase()
    matchRepo.save(
      buildMatch({
        playerScores: [
          { playerId: 'dup', score: 10 },
          { playerId: 'dup2', score: 4 },
        ],
      }),
    )

    expect(() => useCase.invoke('keep', ['dup', 'dup2'])).toThrow(/face themselves/)
    expect(playerRepo.getAll(true)).toHaveLength(4)
  })

  it('allows merging one of two players who faced each other when the other stays out of the group', () => {
    const { playerRepo, matchRepo, useCase } = buildUseCase()
    matchRepo.save(
      buildMatch({
        playerScores: [
          { playerId: 'dup', score: 10 },
          { playerId: 'dup2', score: 4 },
        ],
      }),
    )

    useCase.invoke('keep', ['dup'])

    expect(playerRepo.getAll(true).map((p) => p.id)).toEqual(['keep', 'dup2', 'other'])
    expect(matchRepo.getAll()[0].playerScores.map((s) => s.playerId)).toEqual(['keep', 'dup2'])
  })

  it('refuses to merge a player into themselves', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('keep', ['keep'])).toThrow(
      'playerId: A player cannot be merged into themselves',
    )
  })

  it('refuses a merge with no duplicate selected', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('keep', [])).toThrow('playerId: Select at least one duplicate to merge')
  })

  it('throws NotFoundError for an unknown kept player or duplicate', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('ghost', ['dup'])).toThrow('Player ghost not found')
    expect(() => useCase.invoke('keep', ['ghost'])).toThrow('Player ghost not found')
  })

  it('writes nothing when one duplicate of the group is unknown', () => {
    const { playerRepo, matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ playerScores: [{ playerId: 'dup', score: 10 }] }))

    expect(() => useCase.invoke('keep', ['dup', 'ghost'])).toThrow('Player ghost not found')
    expect(playerRepo.getAll(true)).toHaveLength(4)
    expect(matchRepo.getAll()[0].playerScores[0].playerId).toBe('dup')
  })

  it('merges a soft-deleted duplicate, inactive players being eligible', () => {
    const { playerRepo, matchRepo, useCase } = buildUseCase()
    playerRepo.delete('dup')
    matchRepo.save(buildMatch({ playerScores: [{ playerId: 'dup', score: 10 }] }))

    useCase.invoke('keep', ['dup'])

    expect(playerRepo.getAll(true).map((p) => p.id)).toEqual(['keep', 'dup2', 'other'])
    expect(matchRepo.getAll()[0].playerScores[0].playerId).toBe('keep')
  })

  it('reactivates a soft-deleted target when a duplicate was active', () => {
    const { playerRepo, useCase } = buildUseCase()
    playerRepo.delete('keep')

    useCase.invoke('keep', ['dup'])

    expect(playerRepo.getAll(true).find((p) => p.id === 'keep')?.active).toBe(true)
  })

  it('leaves a soft-deleted target inactive when every duplicate was inactive too', () => {
    const { playerRepo, useCase } = buildUseCase()
    playerRepo.delete('keep')
    playerRepo.delete('dup')
    playerRepo.delete('dup2')

    useCase.invoke('keep', ['dup', 'dup2'])

    expect(playerRepo.getAll(true).find((p) => p.id === 'keep')?.active).toBe(false)
  })

  it('clears a match draft that references a duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    draftRepo.save({ gameTypeId: 'gt1', playerIds: ['dup2', 'other'], rounds: [], updatedAt: 1 })

    useCase.invoke('keep', ['dup', 'dup2'])

    expect(draftRepo.load()).toBeUndefined()
  })

  it('keeps a match draft that references no duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    const draft = { gameTypeId: 'gt1', playerIds: ['keep', 'other'], rounds: [], updatedAt: 1 }
    draftRepo.save(draft)

    useCase.invoke('keep', ['dup'])

    expect(draftRepo.load()).toEqual(draft)
  })

  it('preview counts the matches to rewrite and the conflicting ones across the whole group', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ id: 'm1', playerScores: [{ playerId: 'dup', score: 1 }] }))
    matchRepo.save(
      buildMatch({
        id: 'm2',
        playerScores: [
          { playerId: 'dup2', score: 1 },
          { playerId: 'keep', score: 2 },
        ],
      }),
    )
    matchRepo.save(buildMatch({ id: 'm3', playerScores: [{ playerId: 'other', score: 1 }] }))

    expect(useCase.preview('keep', ['dup', 'dup2'])).toEqual({ affectedMatches: 2, conflictingMatches: 1 })
  })

  it('preview reports nothing when no duplicate is selected', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ playerScores: [{ playerId: 'dup', score: 1 }] }))

    expect(useCase.preview('keep', [])).toEqual({ affectedMatches: 0, conflictingMatches: 0 })
  })

  it('preview ignores the kept player appearing among the duplicates', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ playerScores: [{ playerId: 'keep', score: 1 }] }))

    expect(useCase.preview('keep', ['keep'])).toEqual({ affectedMatches: 0, conflictingMatches: 0 })
  })

  it('treats a match naming the kept player only through manualWinners as a conflict', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(
      buildMatch({
        playerScores: [{ playerId: 'dup', score: 1 }],
        manualWinners: ['keep'],
      }),
    )

    expect(useCase.preview('keep', ['dup'])).toEqual({ affectedMatches: 1, conflictingMatches: 1 })
    expect(() => useCase.invoke('keep', ['dup'])).toThrow(/face themselves/)
  })
})
