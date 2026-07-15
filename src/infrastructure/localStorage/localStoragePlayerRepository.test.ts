import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStoragePlayerRepository } from './localStoragePlayerRepository'

describe('LocalStoragePlayerRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a saved player', () => {
    const repo = new LocalStoragePlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })

    expect(repo.getAll()).toEqual([{ id: 'p1', name: 'Alice', active: true }])
  })

  it('upserts on save with same id', () => {
    const repo = new LocalStoragePlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    repo.save({ id: 'p1', name: 'Alicia', active: true })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].name).toBe('Alicia')
  })

  it('excludes inactive players by default, includes them when requested', () => {
    const repo = new LocalStoragePlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    repo.save({ id: 'p2', name: 'Bob', active: false })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll(true)).toHaveLength(2)
  })

  it('delete soft-deletes and keeps the name by default', () => {
    const repo = new LocalStoragePlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })

    repo.delete('p1')

    const all = repo.getAll(true)
    expect(all[0].active).toBe(false)
    expect(all[0].name).toBe('Alice')
  })

  it('delete with anonymize blanks the name', () => {
    const repo = new LocalStoragePlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })

    repo.delete('p1', true)

    expect(repo.getAll(true)[0].name).toBe('')
  })

  it('fails open on corrupted JSON (returns empty array)', () => {
    localStorage.setItem('scoreo_players', 'not json')
    const repo = new LocalStoragePlayerRepository()

    expect(repo.getAll(true)).toEqual([])
  })

  it('backward compat: old JSON without active field defaults to true', () => {
    localStorage.setItem('scoreo_players', JSON.stringify([{ id: 'p1', name: 'Alice' }]))
    const repo = new LocalStoragePlayerRepository()

    expect(repo.getAll(true)).toEqual([{ id: 'p1', name: 'Alice', active: true }])
  })

  it('saveAll adds multiple players in one operation', () => {
    const repo = new LocalStoragePlayerRepository()
    repo.saveAll([
      { id: 'p1', name: 'Alice', active: true },
      { id: 'p2', name: 'Bob', active: true },
    ])

    expect(repo.getAll()).toHaveLength(2)
  })

  it('deleteAll clears every player, including inactive ones', () => {
    const repo = new LocalStoragePlayerRepository()
    repo.save({ id: 'p1', name: 'Alice', active: true })
    repo.save({ id: 'p2', name: 'Bob', active: false })

    repo.deleteAll()

    expect(repo.getAll(true)).toEqual([])
  })
})
