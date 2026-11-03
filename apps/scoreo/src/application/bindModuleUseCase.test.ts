import type { ScoringModuleManifest } from '@scoreboards/module-api'
import { describe, expect, it, vi } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import {
  BindModuleUseCase,
  manifestClaimsGameName,
  resolveBindingTarget,
} from './bindModuleUseCase'

const manifest: ScoringModuleManifest = {
  moduleId: 'test-module',
  displayName: 'Test Game',
  gameNames: ['Test Game', 'Le Jeu de Test'],
  winCondition: 'LOWEST_SCORE',
  minPlayers: 2,
  maxPlayers: 4,
  dataVersion: 1,
}

function setup() {
  const repo = new InMemoryGameTypeRepository()
  const matches = new InMemoryMatchRepository()
  return { repo, matches, useCase: new BindModuleUseCase(repo, matches) }
}

// Raw rounds 10/2, 1/8, 9/3: 20/13 in points, 2/1 rounds won (highest wins a round).
function match(id: string, gameTypeId: string, a: number, b: number, detail = true): Match {
  return {
    id,
    date: 0,
    gameTypeId,
    playerScores: [
      { playerId: 'a', score: a },
      { playerId: 'b', score: b },
    ],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: detail
      ? [
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
      : [],
    moduleData: null,
  }
}

function gameType(overrides: Partial<GameType> & Pick<GameType, 'id' | 'name'>): GameType {
  return {
    winCondition: 'HIGHEST_SCORE',
    scoringMode: 'POINTS' as const,
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    moduleId: null,
    minPlayers: null,
    maxPlayers: null,
    active: true,
    ...overrides,
  }
}

describe('BindModuleUseCase', () => {
  describe('rule 3 — nothing to bind to', () => {
    it('creates the game type from the manifest, rules included', () => {
      const { repo, useCase } = setup()

      const { gameType, rulesChange } = useCase.invoke({ ...manifest, scoringMode: 'ROUNDS_WON' })

      expect(gameType).toMatchObject({
        name: 'Test Game',
        moduleId: 'test-module',
        winCondition: 'LOWEST_SCORE',
        scoringMode: 'ROUNDS_WON',
        minPlayers: 2,
        maxPlayers: 4,
        active: true,
      })
      expect(repo.getAll()).toEqual([gameType])
      expect(rulesChange).toBeUndefined()
    })

    it('defaults to POINTS when the manifest declares no mode', () => {
      expect(setup().useCase.invoke(manifest).gameType.scoringMode).toBe('POINTS')
    })

    it('creates nothing else — an empty profile stays empty until a module is played', () => {
      expect(setup().repo.getAll(true)).toEqual([])
    })
  })

  describe('rule 2 — a game already carries the name', () => {
    it('stamps the module onto it instead of creating a second one', () => {
      const { repo, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game' }))

      const { gameType: bound } = useCase.invoke(manifest)

      expect(bound.id).toBe('g1')
      expect(bound.moduleId).toBe('test-module')
      expect(repo.getAll()).toHaveLength(1)
    })

    it('matches the name case-insensitively, ignoring blanks, and on any alias', () => {
      const a = setup()
      a.repo.save(gameType({ id: 'g1', name: '  test game  ' }))
      expect(a.useCase.invoke(manifest).gameType.id).toBe('g1')

      const b = setup()
      b.repo.save(gameType({ id: 'g1', name: 'Le Jeu de Test' }))
      expect(b.useCase.invoke(manifest).gameType.id).toBe('g1')
    })

    it('keeps the name and tie-break, aligns the rules on the module', () => {
      const { repo, useCase } = setup()
      repo.save(
        gameType({
          id: 'g1',
          name: 'test game',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'MANUAL_SELECTION',
          minPlayers: 3,
          maxPlayers: null,
        }),
      )

      const { gameType: bound, rulesChange } = useCase.invoke(manifest)

      expect(bound).toMatchObject({
        name: 'test game',
        tieBreakRule: 'MANUAL_SELECTION',
        winCondition: 'LOWEST_SCORE',
        minPlayers: 2,
        maxPlayers: 4,
      })
      expect(repo.findById('g1')).toEqual(bound)
      expect(rulesChange?.before).toMatchObject({ winCondition: 'HIGHEST_SCORE', minPlayers: 3 })
      expect(rulesChange?.after).toMatchObject({ winCondition: 'LOWEST_SCORE', minPlayers: 2 })
    })

    it('turns an imported rounds-won game into points and rescores its matches from the detail', () => {
      const { repo, matches, useCase } = setup()
      repo.save(
        gameType({
          id: 'g1',
          name: 'Test Game',
          winCondition: 'LOWEST_SCORE',
          scoringMode: 'ROUNDS_WON',
        }),
      )
      // Lowest wins a round: a wins round 2 only (1 < 8), b wins rounds 1 and 3.
      matches.save(match('m1', 'g1', 1, 2))
      matches.save(match('other', 'g2', 1, 2))

      const { gameType: bound, rulesChange } = useCase.invoke(manifest)

      expect(bound.scoringMode).toBe('POINTS')
      expect(matches.findById('m1')?.playerScores.map((p) => p.score)).toEqual([20, 13])
      expect(matches.findById('other')?.playerScores.map((p) => p.score)).toEqual([1, 2])
      expect(rulesChange).toMatchObject({ rescoredMatches: 1, affectsHistory: true })
    })

    it('keeps the scores of a match without detail when going to points', () => {
      const { repo, matches, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', scoringMode: 'ROUNDS_WON' }))
      matches.save(match('m1', 'g1', 2, 1, false))

      const { rulesChange } = useCase.invoke(manifest)

      expect(matches.findById('m1')?.playerScores.map((p) => p.score)).toEqual([2, 1])
      expect(rulesChange).toMatchObject({ rescoredMatches: 0, affectsHistory: true })
    })

    it('keeps the scores and detail of a match whose detail disagrees with its scores', () => {
      const { repo, matches, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', scoringMode: 'ROUNDS_WON' }))
      matches.save(match('m1', 'g1', 7, 7))

      useCase.invoke(manifest)

      expect(matches.findById('m1')).toEqual(match('m1', 'g1', 7, 7))
    })

    it('turns points into rounds won for a rounds-won module', () => {
      const { repo, matches, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', winCondition: 'HIGHEST_SCORE' }))
      matches.save(match('m1', 'g1', 20, 13))
      matches.save(match('m2', 'g1', 5, 5, false))

      const { rulesChange } = useCase.invoke({
        ...manifest,
        winCondition: 'HIGHEST_SCORE',
        scoringMode: 'ROUNDS_WON',
      })

      expect(matches.findById('m1')?.playerScores.map((p) => p.score)).toEqual([2, 1])
      // No detail: a single round holding the scores, then counted in rounds won.
      expect(matches.findById('m2')?.playerScores.map((p) => p.score)).toEqual([1, 1])
      expect(rulesChange?.rescoredMatches).toBe(2)
    })

    it('reports a win condition change without rewriting scores in points', () => {
      const { repo, matches, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', winCondition: 'HIGHEST_SCORE' }))
      matches.save(match('m1', 'g1', 20, 13))

      const { rulesChange } = useCase.invoke(manifest)

      expect(matches.findById('m1')?.playerScores.map((p) => p.score)).toEqual([20, 13])
      expect(rulesChange).toMatchObject({ rescoredMatches: 0, affectsHistory: true })
    })

    it('does not flag a history change when only the player range differs', () => {
      const { repo, matches, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', winCondition: 'LOWEST_SCORE' }))
      matches.save(match('m1', 'g1', 20, 13))

      const { gameType: bound, rulesChange } = useCase.invoke(manifest)

      expect(bound).toMatchObject({ minPlayers: 2, maxPlayers: 4 })
      expect(rulesChange).toBeDefined()
      expect(rulesChange?.affectsHistory).toBe(false)
    })

    it('does not flag a history change for a game without matches', () => {
      const { repo, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', winCondition: 'HIGHEST_SCORE' }))

      expect(useCase.invoke(manifest).rulesChange?.affectsHistory).toBe(false)
    })

    it('writes the rescored matches before the game type', () => {
      const { repo, matches, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', scoringMode: 'ROUNDS_WON' }))
      matches.save(match('m1', 'g1', 2, 1))
      matches.saveAll = () => {
        throw new Error('quota')
      }

      expect(() => useCase.invoke(manifest)).toThrow('quota')
      expect(repo.findById('g1')).toMatchObject({ moduleId: null, scoringMode: 'ROUNDS_WON' })
    })

    it('un-archives the game it binds to', () => {
      const { repo, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game', active: false }))

      expect(useCase.invoke(manifest).gameType.active).toBe(true)
      expect(repo.getAll()).toHaveLength(1)
    })
  })

  describe('rule 1 — the module is already bound', () => {
    const aligned = (overrides: Partial<GameType> = {}) =>
      gameType({
        id: 'g1',
        name: 'Test Game',
        moduleId: 'test-module',
        winCondition: 'LOWEST_SCORE',
        minPlayers: 2,
        maxPlayers: 4,
        ...overrides,
      })

    it('reuses the bound game whatever its name has become', () => {
      const { repo, useCase } = setup()
      repo.save(aligned({ name: 'Renamed by the user' }))

      const { gameType: bound } = useCase.invoke(manifest)

      expect(bound.id).toBe('g1')
      expect(bound.name).toBe('Renamed by the user')
      expect(repo.getAll()).toHaveLength(1)
    })

    it('prefers the bound game over one merely carrying the name', () => {
      const { repo, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Test Game' }))
      repo.save(aligned({ id: 'g2', name: 'Renamed' }))

      expect(useCase.invoke(manifest).gameType.id).toBe('g2')
    })

    it('un-archives the bound game', () => {
      const { repo, useCase } = setup()
      repo.save(aligned({ active: false }))

      expect(useCase.invoke(manifest).gameType.active).toBe(true)
    })

    it('writes nothing, rescores nothing and reports nothing when already aligned', () => {
      const { repo, matches, useCase } = setup()
      const existing = aligned()
      repo.save(existing)
      matches.save(match('m1', 'g1', 20, 13))
      const saveGame = vi.spyOn(repo, 'save')
      const saveMatches = vi.spyOn(matches, 'saveAll')

      const result = useCase.invoke(manifest)

      expect(result).toEqual({ gameType: existing })
      expect(saveGame).not.toHaveBeenCalled()
      expect(saveMatches).not.toHaveBeenCalled()
    })

    it('realigns a drifted game, then goes quiet', () => {
      const { repo, matches, useCase } = setup()
      repo.save(aligned({ winCondition: 'HIGHEST_SCORE', scoringMode: 'ROUNDS_WON' }))
      matches.save(match('m1', 'g1', 2, 1))

      const first = useCase.invoke(manifest)
      const second = useCase.invoke(manifest)

      expect(first.gameType).toMatchObject({ winCondition: 'LOWEST_SCORE', scoringMode: 'POINTS' })
      expect(first.rulesChange).toMatchObject({ rescoredMatches: 1, affectsHistory: true })
      expect(second.rulesChange).toBeUndefined()
    })

    it('reports a range-only alignment without a history change', () => {
      const { repo, useCase } = setup()
      repo.save(aligned({ minPlayers: null, maxPlayers: null }))

      const { gameType: bound, rulesChange } = useCase.invoke(manifest)

      expect(bound).toMatchObject({ minPlayers: 2, maxPlayers: 4 })
      expect(rulesChange?.affectsHistory).toBe(false)
    })
  })

  describe('idempotence', () => {
    it('binds once, however many times it runs', () => {
      const { repo, useCase } = setup()

      const first = useCase.invoke(manifest).gameType
      const second = useCase.invoke(manifest).gameType
      const third = useCase.invoke(manifest).gameType

      expect(second.id).toBe(first.id)
      expect(third.id).toBe(first.id)
      expect(repo.getAll(true)).toHaveLength(1)
    })

    it('does not steal a game already bound to another module', () => {
      const { repo, useCase } = setup()
      repo.save(gameType({ id: 'g1', name: 'Another Game', moduleId: 'other-module' }))

      const { gameType: bound } = useCase.invoke(manifest)

      expect(bound.id).not.toBe('g1')
      expect(repo.findById('g1')?.moduleId).toBe('other-module')
      expect(repo.getAll(true)).toHaveLength(2)
    })
  })
})

describe('manifestClaimsGameName', () => {
  it('matches every alias, case-insensitive, ignoring surrounding blanks', () => {
    expect(manifestClaimsGameName(manifest, 'Test Game')).toBe(true)
    expect(manifestClaimsGameName(manifest, '  le jeu de TEST ')).toBe(true)
    expect(manifestClaimsGameName(manifest, 'Test  Game')).toBe(false)
    expect(manifestClaimsGameName(manifest, 'Another Game')).toBe(false)
  })
})

describe('resolveBindingTarget', () => {
  it('returns the game already bound to the module, before any name match (rule 1)', () => {
    const byName = gameType({ id: 'g1', name: 'Test Game' })
    const bound = gameType({ id: 'g2', name: 'Renamed', moduleId: 'test-module', active: false })

    expect(resolveBindingTarget(manifest, [byName, bound])).toEqual({
      kind: 'bound',
      gameType: bound,
    })
  })

  it('returns the first name match, archived games included (rule 2)', () => {
    const archived = gameType({ id: 'g1', name: 'Test Game', active: false })
    const active = gameType({ id: 'g2', name: 'test game' })

    expect(resolveBindingTarget(manifest, [archived, active])).toEqual({
      kind: 'byName',
      gameType: archived,
    })
  })

  it('returns undefined when the binding would create a game (rule 3)', () => {
    expect(resolveBindingTarget(manifest, [])).toBeUndefined()
  })

  it('previews exactly the game type invoke() binds', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'g1', name: 'Le Jeu de Test', active: false }))
    repo.save(gameType({ id: 'g2', name: 'Test Game' }))

    const preview = resolveBindingTarget(manifest, repo.getAll(true))
    const { gameType: bound } = new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(
      manifest,
    )

    expect(preview?.gameType.id).toBe(bound.id)
  })
})
