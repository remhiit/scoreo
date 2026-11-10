import type { ScoringModuleManifest } from '@scoreboards/module-api'
import { describe, expect, it } from 'vitest'
import type { GameType } from '../domain/model/gameType'
import type { Match } from '../domain/model/match'
import { InMemoryMatchRepository } from '../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryGameTypeRepository } from '../infrastructure/testing/inMemoryGameTypeRepository'
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
    it('creates the game type from the manifest', () => {
      const repo = new InMemoryGameTypeRepository()

      const bound = new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest)

      expect(bound.name).toBe('Test Game')
      expect(bound.moduleId).toBe('test-module')
      expect(bound.winCondition).toBe('LOWEST_SCORE')
      expect(bound.active).toBe(true)
      expect(repo.getAll()).toEqual([bound])
    })

    it('creates nothing else — an empty profile stays empty until a module is played', () => {
      const repo = new InMemoryGameTypeRepository()

      expect(repo.getAll(true)).toEqual([])
    })
  })

  describe('rule 2 — a game already carries the name', () => {
    it('stamps the module onto it instead of creating a second one', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: 'Test Game' }))

      const bound = new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest)

      expect(bound.id).toBe('g1')
      expect(bound.moduleId).toBe('test-module')
      expect(repo.getAll()).toHaveLength(1)
    })

    it('matches the name case-insensitively and ignoring surrounding blanks', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: '  test game  ' }))

      expect(new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest).id).toBe(
        'g1',
      )
    })

    it('matches any alias, not only the display name', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: 'Le Jeu de Test' }))

      expect(new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest).id).toBe(
        'g1',
      )
    })

    it('keeps the existing name and rules — the module augments the game, it does not redefine it', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(
        gameType({
          id: 'g1',
          name: 'test game',
          winCondition: 'HIGHEST_SCORE',
          tieBreakRule: 'MANUAL_SELECTION',
        }),
      )

      const bound = new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest)

      expect(bound.name).toBe('test game')
      expect(bound.winCondition).toBe('HIGHEST_SCORE')
      expect(bound.tieBreakRule).toBe('MANUAL_SELECTION')
    })

    it('un-archives the game it binds to', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: 'Test Game', active: false }))

      expect(
        new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest).active,
      ).toBe(true)
      expect(repo.getAll()).toHaveLength(1)
    })
  })

  describe('rule 1 — the module is already bound', () => {
    it('reuses the bound game whatever its name has become', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: 'Renamed by the user', moduleId: 'test-module' }))

      const bound = new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest)

      expect(bound.id).toBe('g1')
      expect(bound.name).toBe('Renamed by the user')
      expect(repo.getAll()).toHaveLength(1)
    })

    it('prefers the bound game over one merely carrying the name', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: 'Test Game' }))
      repo.save(gameType({ id: 'g2', name: 'Renamed', moduleId: 'test-module' }))

      expect(new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest).id).toBe(
        'g2',
      )
    })

    it('un-archives the bound game', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: 'Test Game', moduleId: 'test-module', active: false }))

      expect(
        new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest).active,
      ).toBe(true)
    })

    it('leaves an already-active bound game untouched', () => {
      const repo = new InMemoryGameTypeRepository()
      const existing = gameType({ id: 'g1', name: 'Test Game', moduleId: 'test-module' })
      repo.save(existing)

      expect(new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest)).toEqual(
        existing,
      )
    })
  })

  describe('idempotence', () => {
    it('binds once, however many times it runs', () => {
      const repo = new InMemoryGameTypeRepository()
      const useCase = new BindModuleUseCase(repo, new InMemoryMatchRepository())

      const first = useCase.invoke(manifest)
      const second = useCase.invoke(manifest)
      const third = useCase.invoke(manifest)

      expect(second.id).toBe(first.id)
      expect(third.id).toBe(first.id)
      expect(repo.getAll(true)).toHaveLength(1)
    })

    it('does not steal a game already bound to another module', () => {
      const repo = new InMemoryGameTypeRepository()
      repo.save(gameType({ id: 'g1', name: 'Another Game', moduleId: 'other-module' }))

      const bound = new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest)

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

function match(
  id: string,
  gameTypeId: string,
  scores: [number, number],
  rounds: number[][] = [],
): Match {
  return {
    id,
    date: 1,
    gameTypeId,
    playerScores: [
      { playerId: 'p1', score: scores[0] },
      { playerId: 'p2', score: scores[1] },
    ],
    manualWinners: [],
    secondaryPlayerScores: [],
    rounds: rounds.map((r) => [
      { playerId: 'p1', score: r[0] },
      { playerId: 'p2', score: r[1] },
    ]),
    moduleData: null,
  }
}

describe('rule 2 — the homonym must respect the module rules', () => {
  it('skips a homonym counted in rounds won: rule 3 creates a new bound game', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'g1', name: 'Test Game', scoringMode: 'ROUNDS_WON' }))
    const matches = new InMemoryMatchRepository()
    matches.save(match('m1', 'g1', [2, 1]))

    expect(resolveBindingTarget(manifest, repo.getAll(true), matches.getAll())).toBeUndefined()
    const bound = new BindModuleUseCase(repo, matches).invoke(manifest)

    expect(bound.id).not.toBe('g1')
    expect(bound.moduleId).toBe('test-module')
    expect(repo.findById('g1')).toMatchObject({ moduleId: null, scoringMode: 'ROUNDS_WON' })
    expect(repo.getAll(true)).toHaveLength(2)
  })

  it('binds a homonym in points whose matches are consistent', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'g1', name: 'Test Game' }))
    const matches = new InMemoryMatchRepository()
    matches.save(
      match(
        'm1',
        'g1',
        [5, 3],
        [
          [2, 1],
          [3, 2],
        ],
      ),
    )
    matches.save(match('m2', 'g1', [4, 4]))

    expect(new BindModuleUseCase(repo, matches).invoke(manifest).id).toBe('g1')
  })

  it('skips a homonym holding a match whose rounds do not add up', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'g1', name: 'Test Game' }))
    const matches = new InMemoryMatchRepository()
    matches.save(
      match(
        'm1',
        'g1',
        [9, 3],
        [
          [2, 1],
          [3, 2],
        ],
      ),
    )

    expect(resolveBindingTarget(manifest, repo.getAll(true), matches.getAll())).toBeUndefined()
    expect(new BindModuleUseCase(repo, matches).invoke(manifest).id).not.toBe('g1')
  })

  it('still binds an archived consistent homonym', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'g1', name: 'Test Game', active: false }))
    const matches = new InMemoryMatchRepository()

    expect(new BindModuleUseCase(repo, matches).invoke(manifest)).toMatchObject({
      id: 'g1',
      active: true,
    })
  })
})

describe('resolveBindingTarget', () => {
  it('returns the game already bound to the module, before any name match (rule 1)', () => {
    const byName = gameType({ id: 'g1', name: 'Test Game' })
    const bound = gameType({ id: 'g2', name: 'Renamed', moduleId: 'test-module', active: false })

    expect(resolveBindingTarget(manifest, [byName, bound], [])).toEqual({
      kind: 'bound',
      gameType: bound,
    })
  })

  it('returns the first name match, archived games included (rule 2)', () => {
    const archived = gameType({ id: 'g1', name: 'Test Game', active: false })
    const active = gameType({ id: 'g2', name: 'test game' })

    expect(resolveBindingTarget(manifest, [archived, active], [])).toEqual({
      kind: 'byName',
      gameType: archived,
    })
  })

  it('returns undefined when the binding would create a game (rule 3)', () => {
    expect(resolveBindingTarget(manifest, [], [])).toBeUndefined()
  })

  it('previews exactly the game type invoke() binds', () => {
    const repo = new InMemoryGameTypeRepository()
    repo.save(gameType({ id: 'g1', name: 'Le Jeu de Test', active: false }))
    repo.save(gameType({ id: 'g2', name: 'Test Game' }))

    const preview = resolveBindingTarget(manifest, repo.getAll(true), [])
    const bound = new BindModuleUseCase(repo, new InMemoryMatchRepository()).invoke(manifest)

    expect(preview?.gameType.id).toBe(bound.id)
  })
})
