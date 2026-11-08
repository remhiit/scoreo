import { describe, expect, it } from 'vitest'
import { newGameType } from '../domain/model/gameType'
import { getWinners, type Match } from '../domain/model/match'
import { findManifest } from './registry'
import { withModuleRules } from './withModuleRules'

describe('withModuleRules', () => {
  it('takes the rules of the manifest for a bound game', () => {
    const stored = newGameType('g', 'Skyjo', 'HIGHEST_SCORE', { moduleId: 'skyjo' })
    const resolved = withModuleRules(stored)
    const manifest = findManifest('skyjo')!

    expect(resolved).toEqual({
      ...stored,
      winCondition: manifest.winCondition,
      minPlayers: manifest.minPlayers,
      maxPlayers: manifest.maxPlayers,
      scoringMode: 'POINTS',
      tieBreakRule: 'MANUAL_SELECTION',
    })
    expect(resolved.winCondition).toBe('LOWEST_SCORE')
  })

  it('leaves id, name, active and moduleId alone', () => {
    const stored = newGameType('g', 'Mon Skyjo', 'HIGHEST_SCORE', { moduleId: 'skyjo', active: false })
    const resolved = withModuleRules(stored)
    expect(resolved).toMatchObject({ id: 'g', name: 'Mon Skyjo', active: false, moduleId: 'skyjo' })
  })

  it('returns the same reference for an ordinary game', () => {
    const stored = newGameType('g', 'Belote', 'HIGHEST_SCORE')
    expect(withModuleRules(stored)).toBe(stored)
  })

  it('returns the same reference when the module is no longer registered', () => {
    const stored = newGameType('g', 'Old', 'HIGHEST_SCORE', { moduleId: 'removed-module' })
    expect(withModuleRules(stored)).toBe(stored)
  })

  describe('winners of a module match once the rules are resolved', () => {
    const stored = newGameType('t', 'Torī Valley', 'HIGHEST_SCORE', { moduleId: 'tori-valley' })
    const tied: Match = {
      id: 'm',
      date: 0,
      gameTypeId: 't',
      playerScores: [
        { playerId: 'a', score: 30 },
        { playerId: 'b', score: 30 },
      ],
      manualWinners: ['b'],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    } as unknown as Match

    it('returns the winner designated by the module on a tie', () => {
      expect(getWinners(tied, stored)).toEqual(['a', 'b'])
      expect(getWinners(tied, withModuleRules(stored))).toEqual(['b'])
    })

    it('falls back to every tied player without manualWinners', () => {
      expect(getWinners({ ...tied, manualWinners: [] }, withModuleRules(stored))).toEqual(['a', 'b'])
    })
  })
})
