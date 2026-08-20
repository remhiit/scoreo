import { describe, expect, it } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { MergeGameTypesUseCase } from './mergeGameTypesUseCase'

function buildGameType(overrides: Partial<GameType> = {}): GameType {
  return {
    id: 'gt1',
    name: 'Belote',
    winCondition: 'HIGHEST_SCORE',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    active: true,
    ...overrides,
  }
}

function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'm1',
    date: 1000,
    gameTypeId: 'dup',
    playerScores: [{ playerId: 'p1', score: 10 }],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: [],
    ...overrides,
  }
}

function buildUseCase(sourceOverrides: Partial<GameType> = {}, targetOverrides: Partial<GameType> = {}) {
  const gameTypeRepo = new InMemoryGameTypeRepository()
  const matchRepo = new InMemoryMatchRepository()
  const draftRepo = new InMemoryMatchDraftRepository()
  gameTypeRepo.save(buildGameType({ id: 'dup', name: 'Belote ', ...sourceOverrides }))
  gameTypeRepo.save(buildGameType({ id: 'keep', name: 'Belote', ...targetOverrides }))
  return {
    gameTypeRepo,
    matchRepo,
    draftRepo,
    useCase: new MergeGameTypesUseCase(gameTypeRepo, matchRepo, draftRepo),
  }
}

describe('MergeGameTypesUseCase', () => {
  it('moves the duplicate matches to the kept game type', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ id: 'm1' }))
    matchRepo.save(buildMatch({ id: 'm2' }))

    useCase.invoke('dup', 'keep')

    expect(matchRepo.getAll().map((m) => m.gameTypeId)).toEqual(['keep', 'keep'])
  })

  it('hard-deletes the duplicate and keeps the target', () => {
    const { gameTypeRepo, useCase } = buildUseCase()

    useCase.invoke('dup', 'keep')

    expect(gameTypeRepo.getAll(true).map((gt) => gt.id)).toEqual(['keep'])
  })

  it('leaves matches of other game types untouched', () => {
    const { matchRepo, useCase } = buildUseCase()
    const untouched = buildMatch({ id: 'm2', gameTypeId: 'gt-other' })
    matchRepo.save(untouched)

    useCase.invoke('dup', 'keep')

    expect(matchRepo.getAll()).toEqual([untouched])
  })

  it('merges a game type with no match at all', () => {
    const { gameTypeRepo, matchRepo, useCase } = buildUseCase()

    useCase.invoke('dup', 'keep')

    expect(gameTypeRepo.getAll(true).map((gt) => gt.id)).toEqual(['keep'])
    expect(matchRepo.getAll()).toEqual([])
  })

  it('refuses to merge a game type into itself', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('dup', 'dup')).toThrow('gameTypeId: A game type cannot be merged into itself')
  })

  it('throws NotFoundError for an unknown duplicate or target', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('ghost', 'keep')).toThrow('GameType ghost not found')
    expect(() => useCase.invoke('dup', 'ghost')).toThrow('GameType ghost not found')
  })

  it('merges an archived duplicate, archived game types being eligible', () => {
    const { gameTypeRepo, matchRepo, useCase } = buildUseCase({ active: false })
    matchRepo.save(buildMatch())

    useCase.invoke('dup', 'keep')

    expect(gameTypeRepo.getAll(true).map((gt) => gt.id)).toEqual(['keep'])
    expect(matchRepo.getAll()[0].gameTypeId).toBe('keep')
  })

  it('unarchives the target when the duplicate was active', () => {
    const { gameTypeRepo, useCase } = buildUseCase({}, { active: false })

    useCase.invoke('dup', 'keep')

    expect(gameTypeRepo.findById('keep')?.active).toBe(true)
  })

  it('leaves an archived target archived when the duplicate was archived too', () => {
    const { gameTypeRepo, useCase } = buildUseCase({ active: false }, { active: false })

    useCase.invoke('dup', 'keep')

    expect(gameTypeRepo.findById('keep')?.active).toBe(false)
  })

  it('clears a match draft that references the duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    draftRepo.save({ gameTypeId: 'dup', playerIds: ['p1', 'p2'], rounds: [], updatedAt: 1 })

    useCase.invoke('dup', 'keep')

    expect(draftRepo.load()).toBeUndefined()
  })

  it('keeps a match draft that does not reference the duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    const draft = { gameTypeId: 'keep', playerIds: ['p1', 'p2'], rounds: [], updatedAt: 1 }
    draftRepo.save(draft)

    useCase.invoke('dup', 'keep')

    expect(draftRepo.load()).toEqual(draft)
  })

  it('preview counts the matches to move and reports identical rules', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ id: 'm1' }))
    matchRepo.save(buildMatch({ id: 'm2', gameTypeId: 'keep' }))

    expect(useCase.preview('dup', 'keep')).toEqual({ affectedMatches: 1, rulesDiffer: false })
  })

  it('preview reports differing rules on the win condition', () => {
    const { useCase } = buildUseCase({}, { winCondition: 'LOWEST_SCORE' })

    expect(useCase.preview('dup', 'keep').rulesDiffer).toBe(true)
  })

  it('preview reports differing rules on the tie-break rule', () => {
    const { useCase } = buildUseCase({}, { tieBreakRule: 'MANUAL_SELECTION' })

    expect(useCase.preview('dup', 'keep').rulesDiffer).toBe(true)
  })

  it('preview ignores tieBreakCondition when neither game type breaks ties on a secondary score', () => {
    const { useCase } = buildUseCase({}, { tieBreakCondition: 'LOWEST_SCORE' })

    expect(useCase.preview('dup', 'keep').rulesDiffer).toBe(false)
  })

  it('preview reports differing rules on tieBreakCondition under SECONDARY_SCORE', () => {
    const { useCase } = buildUseCase(
      { tieBreakRule: 'SECONDARY_SCORE' },
      { tieBreakRule: 'SECONDARY_SCORE', tieBreakCondition: 'LOWEST_SCORE' },
    )

    expect(useCase.preview('dup', 'keep').rulesDiffer).toBe(true)
  })

  it('preview reports nothing for a game type merged into itself', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch())

    expect(useCase.preview('dup', 'dup')).toEqual({ affectedMatches: 0, rulesDiffer: false })
  })
})
