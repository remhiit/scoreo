import type { ScoringModuleManifest } from '@scoreboards/module-api'
import { describe, expect, it } from 'vitest'
import { applyModuleRules, assertValidPlayerRange, newGameType } from './gameType'

// The rest of the game type rules are tested with their definition, in
// `@scoreboards/shared-domain`; this one throws the app's `ValidationError`.
describe('player range', () => {
  it('assertValidPlayerRange accepts equal bounds and refuses the rest', () => {
    expect(() => assertValidPlayerRange({ minPlayers: 3, maxPlayers: 3 })).not.toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: null, maxPlayers: null })).not.toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: 4, maxPlayers: 3 })).toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: 0, maxPlayers: null })).toThrow()
    expect(() => assertValidPlayerRange({ minPlayers: null, maxPlayers: 1.5 })).toThrow()
  })
})

describe('applyModuleRules', () => {
  const manifest: ScoringModuleManifest = {
    moduleId: 'test-module',
    displayName: 'Test Game',
    gameNames: ['Test Game'],
    winCondition: 'LOWEST_SCORE',
    minPlayers: 2,
    maxPlayers: 8,
    dataVersion: 1,
  }

  it("takes a bound game's rules from its manifest and keeps the rest", () => {
    const stored = {
      ...newGameType('g', 'Mon jeu', 'HIGHEST_SCORE', {
        moduleId: 'test-module',
        scoringMode: 'ROUNDS_WON',
      }),
      tieBreakRule: 'NONE' as const,
      minPlayers: 3,
      maxPlayers: 4,
      active: false,
    }
    expect(applyModuleRules(stored, manifest)).toEqual({
      ...stored,
      winCondition: 'LOWEST_SCORE',
      minPlayers: 2,
      maxPlayers: 8,
      scoringMode: 'POINTS',
      tieBreakRule: 'MANUAL_SELECTION',
    })
  })

  it('returns a game without a module as is, same reference', () => {
    const plain = newGameType('g', 'Belote', 'HIGHEST_SCORE')
    expect(applyModuleRules(plain, manifest)).toBe(plain)
  })

  it('returns a bound game as is when its module is not registered', () => {
    const orphan = newGameType('g', 'Old', 'HIGHEST_SCORE', { moduleId: 'gone' })
    expect(applyModuleRules(orphan, undefined)).toBe(orphan)
  })
})
