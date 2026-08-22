import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryDataChangeNotifier } from '../events/inMemoryDataChangeNotifier'
import { LocalStorageMatchRepository } from './localStorageMatchRepository'

describe('LocalStorageMatchRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a saved match', () => {
    const repo = new LocalStorageMatchRepository()
    repo.save({
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.findById('m1')?.date).toBe(1000)
  })

  it('upserts on save with same id', () => {
    const repo = new LocalStorageMatchRepository()
    const match = {
      id: 'm1',
      date: 1000,
      gameTypeId: 'gt1',
      playerScores: [{ playerId: 'p1', score: 10 }],
      manualWinners: [],
      secondaryPlayerScores: [],
      rounds: [],
      moduleData: null,
    }
    repo.save(match)
    repo.save({ ...match, date: 2000 })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].date).toBe(2000)
  })

  it('delete removes the match', () => {
    const repo = new LocalStorageMatchRepository()
    repo.save({ id: 'm1', date: 1000, gameTypeId: 'gt1', playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null })
    repo.save({ id: 'm2', date: 2000, gameTypeId: 'gt1', playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null })

    repo.delete('m1')

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].id).toBe('m2')
  })

  it('fails open on corrupted JSON (returns empty array)', () => {
    localStorage.setItem('scoreo_matches', 'not json')
    const repo = new LocalStorageMatchRepository()

    expect(repo.getAll()).toEqual([])
  })

  it('migrates legacy string-date/non-uuid-id matches on first getAll()', () => {
    localStorage.setItem(
      'scoreo_matches',
      JSON.stringify([
        { id: 'old-id-123', date: '2024-01-15', gameTypeId: 'gt1', playerScores: [], manualWinners: [] },
      ]),
    )
    const repo = new LocalStorageMatchRepository()

    const matches = repo.getAll()

    expect(matches).toHaveLength(1)
    expect(matches[0].date).toBe(1705276800000)
    expect(matches[0].id).not.toBe('old-id-123')
    expect(matches[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('migration is idempotent across repository instances', () => {
    localStorage.setItem(
      'scoreo_matches',
      JSON.stringify([
        { id: 'old-id-123', date: '2024-01-15', gameTypeId: 'gt1', playerScores: [], manualWinners: [] },
      ]),
    )
    const first = new LocalStorageMatchRepository()
    const migratedId = first.getAll()[0].id

    const second = new LocalStorageMatchRepository()
    expect(second.getAll()[0].id).toBe(migratedId)
  })

  it('deleteAll clears every stored match', () => {
    const repo = new LocalStorageMatchRepository()
    repo.save({ id: 'm1', date: 1000, gameTypeId: 'gt1', playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null })
    repo.save({ id: 'm2', date: 2000, gameTypeId: 'gt1', playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null })

    repo.deleteAll()

    expect(repo.getAll()).toEqual([])
  })

  it('backward compat: old JSON without secondaryPlayerScores defaults to empty array', () => {
    localStorage.setItem(
      'scoreo_matches',
      JSON.stringify([
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          date: 1000000,
          gameTypeId: 'gt1',
          playerScores: [{ playerId: 'p1', score: 10 }],
          manualWinners: [],
        },
      ]),
    )
    const repo = new LocalStorageMatchRepository()

    expect(repo.getAll()[0].secondaryPlayerScores).toEqual([])
  })

  it('notifies the notifier after each mutation, but not on reads', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    notifier.subscribe(listener)
    const repo = new LocalStorageMatchRepository(notifier)
    const match = { id: 'm1', date: 1000, gameTypeId: 'gt1', playerScores: [], manualWinners: [], secondaryPlayerScores: [], rounds: [], moduleData: null }

    repo.save(match)
    expect(listener).toHaveBeenCalledTimes(1)

    repo.saveAll([{ ...match, id: 'm2' }])
    expect(listener).toHaveBeenCalledTimes(2)

    repo.delete('m1')
    expect(listener).toHaveBeenCalledTimes(3)

    repo.deleteAll()
    expect(listener).toHaveBeenCalledTimes(4)

    repo.getAll()
    repo.findById('m2')
    expect(listener).toHaveBeenCalledTimes(4)
  })
})
