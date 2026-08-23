import { describe, expect, it } from 'vitest'
import { MODULE_MANIFESTS, findManifest, findManifestByGameName } from './registry'

describe('module registry', () => {
  it('lists the Torī Valley module', () => {
    expect(MODULE_MANIFESTS.map((m) => m.moduleId)).toContain('tori-valley')
  })

  it('lists the 1000 Sabords module', () => {
    expect(MODULE_MANIFESTS.map((m) => m.moduleId)).toContain('mille-sabords')
  })

  // A duplicate id would make `GameType.moduleId` ambiguous, and every binding
  // with it.
  it('gives every module a distinct moduleId', () => {
    const ids = MODULE_MANIFESTS.map((m) => m.moduleId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every module at least one game name, none blank', () => {
    for (const manifest of MODULE_MANIFESTS) {
      expect(manifest.gameNames.length).toBeGreaterThan(0)
      for (const name of manifest.gameNames) expect(name.trim()).not.toBe('')
    }
  })

  it('gives every module a player range Scoreo can satisfy', () => {
    for (const manifest of MODULE_MANIFESTS) {
      // Scoreo's home screen cannot start a match with fewer than two players.
      expect(manifest.minPlayers).toBeGreaterThanOrEqual(2)
      expect(manifest.maxPlayers).toBeGreaterThanOrEqual(manifest.minPlayers)
    }
  })

  it('never lets two modules claim the same game name', () => {
    const names = MODULE_MANIFESTS.flatMap((m) => m.gameNames.map((n) => n.toLowerCase()))
    expect(new Set(names).size).toBe(names.length)
  })

  describe('findManifest', () => {
    it('finds a module by its id', () => {
      expect(findManifest('tori-valley')?.displayName).toBe('La Vallée des Torī')
    })

    it('finds the 1000 Sabords module by its id', () => {
      expect(findManifest('mille-sabords')?.displayName).toBe('1000 Sabords')
    })

    it('returns undefined for an unknown id', () => {
      expect(findManifest('no-such-module')).toBeUndefined()
    })
  })

  describe('findManifestByGameName', () => {
    it('finds a module by the game name a v1.1 import would have created', () => {
      expect(findManifestByGameName('La Vallée des Torī')?.moduleId).toBe('tori-valley')
    })

    // The exact string the Kotlin app wrote in every export it ever produced:
    // a history imported from it must bind to the module, not spawn a second
    // game type beside it.
    it('finds the module behind the game name 1kSaBord exported', () => {
      expect(findManifestByGameName('1000 Sabords')?.moduleId).toBe('mille-sabords')
    })

    it('ignores case and surrounding blanks', () => {
      expect(findManifestByGameName('  la vallée des torī  ')?.moduleId).toBe('tori-valley')
    })

    it('returns undefined for a game no module counts', () => {
      expect(findManifestByGameName('Belote')).toBeUndefined()
    })
  })
})
