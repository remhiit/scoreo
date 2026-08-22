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
    moduleId: null,
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
    moduleData: null,
    ...overrides,
  }
}

function buildUseCase(
  duplicateOverrides: Partial<GameType> = {},
  keptOverrides: Partial<GameType> = {},
  secondDuplicateOverrides: Partial<GameType> = {},
) {
  const gameTypeRepo = new InMemoryGameTypeRepository()
  const matchRepo = new InMemoryMatchRepository()
  const draftRepo = new InMemoryMatchDraftRepository()
  gameTypeRepo.save(buildGameType({ id: 'keep', name: 'Belote', ...keptOverrides }))
  gameTypeRepo.save(buildGameType({ id: 'dup', name: 'Belote ', ...duplicateOverrides }))
  gameTypeRepo.save(buildGameType({ id: 'dup2', name: 'belote', ...secondDuplicateOverrides }))
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

    useCase.invoke('keep', ['dup'])

    expect(matchRepo.getAll().map((m) => m.gameTypeId)).toEqual(['keep', 'keep'])
  })

  it('hard-deletes the duplicate and keeps the target', () => {
    const { gameTypeRepo, useCase } = buildUseCase()

    useCase.invoke('keep', ['dup'])

    expect(gameTypeRepo.getAll(true).map((gt) => gt.id)).toEqual(['keep', 'dup2'])
  })

  it('leaves matches of other game types untouched', () => {
    const { matchRepo, useCase } = buildUseCase()
    const untouched = buildMatch({ id: 'm2', gameTypeId: 'gt-other' })
    matchRepo.save(untouched)

    useCase.invoke('keep', ['dup'])

    expect(matchRepo.getAll()).toEqual([untouched])
  })

  it('merges a game type with no match at all', () => {
    const { gameTypeRepo, matchRepo, useCase } = buildUseCase()

    useCase.invoke('keep', ['dup'])

    expect(gameTypeRepo.getAll(true).map((gt) => gt.id)).toEqual(['keep', 'dup2'])
    expect(matchRepo.getAll()).toEqual([])
  })

  it('refuses to merge a game type into itself', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('keep', ['keep'])).toThrow('gameTypeId: A game type cannot be merged into itself')
  })

  it('throws NotFoundError for an unknown duplicate or target', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('ghost', ['dup'])).toThrow('GameType ghost not found')
    expect(() => useCase.invoke('keep', ['ghost'])).toThrow('GameType ghost not found')
  })

  it('merges an archived duplicate, archived game types being eligible', () => {
    const { gameTypeRepo, matchRepo, useCase } = buildUseCase({ active: false })
    matchRepo.save(buildMatch())

    useCase.invoke('keep', ['dup'])

    expect(gameTypeRepo.getAll(true).map((gt) => gt.id)).toEqual(['keep', 'dup2'])
    expect(matchRepo.getAll()[0].gameTypeId).toBe('keep')
  })

  it('unarchives the target when the duplicate was active', () => {
    const { gameTypeRepo, useCase } = buildUseCase({}, { active: false })

    useCase.invoke('keep', ['dup'])

    expect(gameTypeRepo.findById('keep')?.active).toBe(true)
  })

  it('leaves an archived target archived when the duplicate was archived too', () => {
    const { gameTypeRepo, useCase } = buildUseCase({ active: false }, { active: false })

    useCase.invoke('keep', ['dup'])

    expect(gameTypeRepo.findById('keep')?.active).toBe(false)
  })

  it('clears a match draft that references the duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    draftRepo.save({ gameTypeId: 'dup', playerIds: ['p1', 'p2'], rounds: [], updatedAt: 1 })

    useCase.invoke('keep', ['dup'])

    expect(draftRepo.load()).toBeUndefined()
  })

  it('keeps a match draft that does not reference the duplicate', () => {
    const { draftRepo, useCase } = buildUseCase()
    const draft = { gameTypeId: 'keep', playerIds: ['p1', 'p2'], rounds: [], updatedAt: 1 }
    draftRepo.save(draft)

    useCase.invoke('keep', ['dup'])

    expect(draftRepo.load()).toEqual(draft)
  })

  it('preview counts the matches to move and reports identical rules', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ id: 'm1' }))
    matchRepo.save(buildMatch({ id: 'm2', gameTypeId: 'keep' }))

    expect(useCase.preview('keep', ['dup'])).toEqual({ affectedMatches: 1, rulesDiffer: false })
  })

  it('preview reports differing rules on the win condition', () => {
    const { useCase } = buildUseCase({}, { winCondition: 'LOWEST_SCORE' })

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(true)
  })

  it('preview reports differing rules on the tie-break rule', () => {
    const { useCase } = buildUseCase({}, { tieBreakRule: 'MANUAL_SELECTION' })

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(true)
  })

  it('preview ignores tieBreakCondition when neither game type breaks ties on a secondary score', () => {
    const { useCase } = buildUseCase({}, { tieBreakCondition: 'LOWEST_SCORE' })

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(false)
  })

  it('preview reports differing rules on tieBreakCondition under SECONDARY_SCORE', () => {
    const { useCase } = buildUseCase(
      { tieBreakRule: 'SECONDARY_SCORE' },
      { tieBreakRule: 'SECONDARY_SCORE', tieBreakCondition: 'LOWEST_SCORE' },
    )

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(true)
  })

  it('preview reports nothing when no duplicate is selected', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch())

    expect(useCase.preview('keep', [])).toEqual({ affectedMatches: 0, rulesDiffer: false })
  })

  it('preview ignores the kept game type appearing among the duplicates', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ gameTypeId: 'keep' }))

    expect(useCase.preview('keep', ['keep'])).toEqual({ affectedMatches: 0, rulesDiffer: false })
  })

  it('folds several duplicates into the kept game type in one pass', () => {
    const { gameTypeRepo, matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ id: 'm1', gameTypeId: 'dup' }))
    matchRepo.save(buildMatch({ id: 'm2', gameTypeId: 'dup2' }))

    useCase.invoke('keep', ['dup', 'dup2'])

    expect(gameTypeRepo.getAll(true).map((gt) => gt.id)).toEqual(['keep'])
    expect(matchRepo.getAll().map((m) => m.gameTypeId)).toEqual(['keep', 'keep'])
  })

  it('refuses a merge with no duplicate selected', () => {
    const { useCase } = buildUseCase()

    expect(() => useCase.invoke('keep', [])).toThrow('gameTypeId: Select at least one duplicate to merge')
  })

  it('writes nothing when one duplicate of the group is unknown', () => {
    const { gameTypeRepo, matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch())

    expect(() => useCase.invoke('keep', ['dup', 'ghost'])).toThrow('GameType ghost not found')
    expect(gameTypeRepo.getAll(true)).toHaveLength(3)
    expect(matchRepo.getAll()[0].gameTypeId).toBe('dup')
  })

  it('preview reports differing rules when any one duplicate scores differently', () => {
    const { useCase } = buildUseCase({}, {}, { winCondition: 'LOWEST_SCORE' })

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(false)
    expect(useCase.preview('keep', ['dup', 'dup2']).rulesDiffer).toBe(true)
  })
})
