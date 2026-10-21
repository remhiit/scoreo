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
    scoringMode: 'POINTS' as const,
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

    expect(() => useCase.invoke('keep', ['keep'])).toThrow(
      'gameTypeId: A game type cannot be merged into itself',
    )
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

  it('preview reports differing rules on the scoring mode', () => {
    const { useCase } = buildUseCase({}, { scoringMode: 'ROUNDS_WON' })

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(true)
  })

  it('preview warns when a module match would move unconverted into a rounds-won game', () => {
    // Same rules on both sides, but a module's match is never rescored (#590):
    // its points would be read as rounds won, so the merge is flagged.
    const { matchRepo, useCase } = buildUseCase(
      { scoringMode: 'ROUNDS_WON' },
      { scoringMode: 'ROUNDS_WON' },
    )
    matchRepo.save(buildMatch({ moduleData: { moduleId: 'skyjo', version: 1, data: {} } }))

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(true)
  })

  it('preview warns when a module-bound duplicate is merged into a rounds-won game', () => {
    const { matchRepo, useCase } = buildUseCase(
      { moduleId: 'skyjo' },
      { scoringMode: 'ROUNDS_WON' },
    )
    matchRepo.save(buildMatch())

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(true)
  })

  it('preview does not flag a module match moved into a game scored in points', () => {
    const { matchRepo, useCase } = buildUseCase()
    matchRepo.save(buildMatch({ moduleData: { moduleId: 'skyjo', version: 1, data: {} } }))

    expect(useCase.preview('keep', ['dup']).rulesDiffer).toBe(false)
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

    expect(() => useCase.invoke('keep', [])).toThrow(
      'gameTypeId: Select at least one duplicate to merge',
    )
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

  describe('recomputing moved matches when the scoring differs', () => {
    // Raw rounds 10/2, 1/8, 9/3: 20/13 in points, 2/1 rounds won (highest wins a round).
    const rawRounds = [
      [
        { playerId: 'a', score: 10 },
        { playerId: 'b', score: 2 },
      ],
      [
        { playerId: 'a', score: 1 },
        { playerId: 'b', score: 8 },
      ],
      [
        { playerId: 'a', score: 9 },
        { playerId: 'b', score: 3 },
      ],
    ]
    const scored = (a: number, b: number, rounds = rawRounds) =>
      buildMatch({
        playerScores: [
          { playerId: 'a', score: a },
          { playerId: 'b', score: b },
        ],
        rounds,
      })
    const movedScores = (matchRepo: InMemoryMatchRepository) =>
      matchRepo.findById('m1')?.playerScores.map((ps) => ps.score)

    it('rewrites rounds won as points when merging a ROUNDS_WON duplicate into a POINTS game', () => {
      const { matchRepo, useCase } = buildUseCase({ scoringMode: 'ROUNDS_WON' })
      matchRepo.save(scored(2, 1))
      useCase.invoke('keep', ['dup'])
      expect(movedScores(matchRepo)).toEqual([20, 13])
      expect(matchRepo.findById('m1')?.gameTypeId).toBe('keep')
      expect(matchRepo.findById('m1')?.rounds).toEqual(rawRounds)
    })

    it('rewrites points as rounds won when merging into a ROUNDS_WON game', () => {
      const { matchRepo, useCase } = buildUseCase({}, { scoringMode: 'ROUNDS_WON' })
      matchRepo.save(scored(20, 13))
      useCase.invoke('keep', ['dup'])
      expect(movedScores(matchRepo)).toEqual([2, 1])
    })

    it('turns a POINTS match without detail into a single round when merging into a ROUNDS_WON game', () => {
      // Skyjo: lowest wins. Alice (a) 40, Bob (b) 90, no detail.
      const { matchRepo, useCase } = buildUseCase(
        { winCondition: 'LOWEST_SCORE' },
        { winCondition: 'LOWEST_SCORE', scoringMode: 'ROUNDS_WON' },
      )
      matchRepo.save(scored(40, 90, []))
      useCase.invoke('keep', ['dup'])
      expect(movedScores(matchRepo)).toEqual([1, 0])
      expect(matchRepo.findById('m1')?.rounds).toEqual([
        [
          { playerId: 'a', score: 40 },
          { playerId: 'b', score: 90 },
        ],
      ])
    })

    it('never recomputes the matches of a module-bound duplicate', () => {
      const { matchRepo, useCase } = buildUseCase(
        { moduleId: 'skyjo' },
        { scoringMode: 'ROUNDS_WON' },
      )
      matchRepo.save(scored(20, 13))
      matchRepo.save({ ...scored(40, 90, []), id: 'm2' })
      useCase.invoke('keep', ['dup'])
      const stored = (id: string) => matchRepo.findById(id)
      expect(stored('m1')?.playerScores.map((ps) => ps.score)).toEqual([20, 13])
      expect(stored('m1')?.rounds).toEqual(rawRounds)
      expect(stored('m2')?.playerScores.map((ps) => ps.score)).toEqual([40, 90])
      expect(stored('m2')?.rounds).toEqual([])
      expect(stored('m1')?.gameTypeId).toBe('keep')
    })

    it('never recomputes a match carrying module data', () => {
      const { matchRepo, useCase } = buildUseCase({}, { scoringMode: 'ROUNDS_WON' })
      matchRepo.save({
        ...scored(20, 13),
        moduleData: { moduleId: 'skyjo', version: 1, data: {} },
      })
      useCase.invoke('keep', ['dup'])
      expect(movedScores(matchRepo)).toEqual([20, 13])
    })

    it('recounts the rounds won when the win condition differs in ROUNDS_WON', () => {
      const { matchRepo, useCase } = buildUseCase(
        { scoringMode: 'ROUNDS_WON' },
        { scoringMode: 'ROUNDS_WON', winCondition: 'LOWEST_SCORE' },
      )
      matchRepo.save(scored(2, 1))
      useCase.invoke('keep', ['dup'])
      expect(movedScores(matchRepo)).toEqual([1, 2])
    })

    it('keeps the stored scores without detail, with inconsistent detail, or with the same scoring', () => {
      const { matchRepo, useCase } = buildUseCase(
        { scoringMode: 'ROUNDS_WON' },
        {},
        { winCondition: 'LOWEST_SCORE' },
      )
      matchRepo.save({ ...scored(2, 1, []), id: 'm1' })
      matchRepo.save({ ...scored(5, 4), id: 'm2' })
      matchRepo.save({ ...scored(20, 13), id: 'm3', gameTypeId: 'dup2' })
      useCase.invoke('keep', ['dup', 'dup2'])
      const scoresOf = (id: string) => matchRepo.findById(id)?.playerScores.map((ps) => ps.score)
      expect(scoresOf('m1')).toEqual([2, 1])
      expect(scoresOf('m2')).toEqual([5, 4])
      // POINTS → POINTS: a points sum does not depend on the win condition.
      expect(scoresOf('m3')).toEqual([20, 13])
    })
  })
})
