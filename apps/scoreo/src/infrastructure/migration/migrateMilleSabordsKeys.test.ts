import { beforeEach, describe, expect, it } from 'vitest'
import { migrateMilleSabordsKeys } from './migrateMilleSabordsKeys'

/** A Storage that throws on the operation named, and behaves normally otherwise. */
function throwingStorage(on: 'getItem' | 'setItem' | 'removeItem'): Storage {
  const values = new Map<string, string>([['partie', '{"manche":3}']])
  const fail = () => {
    throw new DOMException('quota', 'QuotaExceededError')
  }
  return {
    get length() {
      return values.size
    },
    clear: () => values.clear(),
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: on === 'getItem' ? fail : (key: string) => values.get(key) ?? null,
    setItem: on === 'setItem' ? fail : (key: string, value: string) => void values.set(key, value),
    removeItem: on === 'removeItem' ? fail : (key: string) => void values.delete(key),
  } as Storage
}

describe('migrateMilleSabordsKeys', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('moves each unprefixed 1kSaBord key under sabords_', () => {
    localStorage.setItem('partie', '{"manche":3}')
    localStorage.setItem('joueurs_connus', '["Alice"]')
    localStorage.setItem('historique_parties', '[]')
    localStorage.setItem('theme', 'sombre')

    expect(migrateMilleSabordsKeys(localStorage)).toBe(4)

    expect(localStorage.getItem('sabords_partie')).toBe('{"manche":3}')
    expect(localStorage.getItem('sabords_joueurs_connus')).toBe('["Alice"]')
    expect(localStorage.getItem('sabords_historique_parties')).toBe('[]')
    expect(localStorage.getItem('sabords_theme')).toBe('sombre')

    expect(localStorage.getItem('partie')).toBeNull()
    expect(localStorage.getItem('joueurs_connus')).toBeNull()
    expect(localStorage.getItem('historique_parties')).toBeNull()
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('does nothing on a profile that never used the standalone app', () => {
    localStorage.setItem('scoreo_players', '[]')

    expect(migrateMilleSabordsKeys(localStorage)).toBe(0)
    expect(localStorage.getItem('scoreo_players')).toBe('[]')
    expect(localStorage.length).toBe(1)
  })

  // The whole point of running this at every start: it must cost nothing once
  // it has run once.
  it('is idempotent', () => {
    localStorage.setItem('partie', '{"manche":3}')

    expect(migrateMilleSabordsKeys(localStorage)).toBe(1)
    expect(migrateMilleSabordsKeys(localStorage)).toBe(0)
    expect(localStorage.getItem('sabords_partie')).toBe('{"manche":3}')
  })

  it('leaves Scoreo’s own keys alone, prefix collisions included', () => {
    localStorage.setItem('scoreo_theme', 'mocha')
    localStorage.setItem('theme', 'sombre')

    migrateMilleSabordsKeys(localStorage)

    expect(localStorage.getItem('scoreo_theme')).toBe('mocha')
    expect(localStorage.getItem('sabords_theme')).toBe('sombre')
  })

  it('never overwrites a target that already holds something else', () => {
    localStorage.setItem('partie', 'ancienne')
    localStorage.setItem('sabords_partie', 'récente')

    expect(migrateMilleSabordsKeys(localStorage)).toBe(0)
    expect(localStorage.getItem('sabords_partie')).toBe('récente')
    // The source stays: dropping it would destroy the only copy of that value.
    expect(localStorage.getItem('partie')).toBe('ancienne')
  })

  // A move is two writes; a crash between them leaves both copies behind.
  it('finishes a move whose removal never landed', () => {
    localStorage.setItem('partie', '{"manche":3}')
    localStorage.setItem('sabords_partie', '{"manche":3}')

    expect(migrateMilleSabordsKeys(localStorage)).toBe(1)
    expect(localStorage.getItem('partie')).toBeNull()
    expect(localStorage.getItem('sabords_partie')).toBe('{"manche":3}')
  })

  // A tidy-up is never worth a blank page.
  it.each(['getItem', 'setItem', 'removeItem'] as const)(
    'survives a storage that throws on %s',
    (operation) => {
      expect(() => migrateMilleSabordsKeys(throwingStorage(operation))).not.toThrow()
    },
  )
})
