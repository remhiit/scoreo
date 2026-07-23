import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryDataChangeNotifier } from '../events/inMemoryDataChangeNotifier'
import { LocalStorageGameTypeRepository } from './localStorageGameTypeRepository'

describe('LocalStorageGameTypeRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a saved game type', () => {
    const repo = new LocalStorageGameTypeRepository()
    repo.save({
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].name).toBe('Belote')
  })

  it('upserts on save with same id', () => {
    const repo = new LocalStorageGameTypeRepository()
    const gt = {
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE' as const,
      tieBreakRule: 'NONE' as const,
      tieBreakCondition: 'HIGHEST_SCORE' as const,
      tieBreakLabel: null,
      active: true,
    }
    repo.save(gt)
    repo.save({ ...gt, name: 'Belote Updated' })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].name).toBe('Belote Updated')
  })

  it('excludes inactive game types by default, includes them when requested', () => {
    const repo = new LocalStorageGameTypeRepository()
    repo.save({
      id: 'gt1',
      name: 'Active',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })
    repo.save({
      id: 'gt2',
      name: 'Archived',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: false,
    })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll(true)).toHaveLength(2)
  })

  it('findById includes inactive game types', () => {
    const repo = new LocalStorageGameTypeRepository()
    repo.save({
      id: 'gt1',
      name: 'Archived',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: false,
    })

    expect(repo.findById('gt1')?.name).toBe('Archived')
  })

  it('fails open on corrupted JSON (returns empty array)', () => {
    localStorage.setItem('scoreo_gametypes', '{not valid')
    const repo = new LocalStorageGameTypeRepository()

    expect(repo.getAll(true)).toEqual([])
  })

  it('backward compat: old JSON without tie-break fields defaults correctly', () => {
    localStorage.setItem(
      'scoreo_gametypes',
      JSON.stringify([{ id: 'gt1', name: 'Classic', winCondition: 'HIGHEST_SCORE' }]),
    )
    const repo = new LocalStorageGameTypeRepository()

    expect(repo.getAll(true)).toEqual([
      {
        id: 'gt1',
        name: 'Classic',
        winCondition: 'HIGHEST_SCORE',
        tieBreakRule: 'NONE',
        tieBreakCondition: 'HIGHEST_SCORE',
        tieBreakLabel: null,
        active: true,
      },
    ])
  })

  it('deleteAll clears every stored game type', () => {
    const repo = new LocalStorageGameTypeRepository()
    repo.save({
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE',
      tieBreakRule: 'NONE',
      tieBreakCondition: 'HIGHEST_SCORE',
      tieBreakLabel: null,
      active: true,
    })

    repo.deleteAll()

    expect(repo.getAll(true)).toEqual([])
  })

  it('notifies the notifier after each mutation, but not on reads', () => {
    const notifier = new InMemoryDataChangeNotifier()
    const listener = vi.fn()
    notifier.subscribe(listener)
    const repo = new LocalStorageGameTypeRepository(notifier)
    const gt = {
      id: 'gt1',
      name: 'Belote',
      winCondition: 'HIGHEST_SCORE' as const,
      tieBreakRule: 'NONE' as const,
      tieBreakCondition: 'HIGHEST_SCORE' as const,
      tieBreakLabel: null,
      active: true,
    }

    repo.save(gt)
    expect(listener).toHaveBeenCalledTimes(1)

    repo.saveAll([{ ...gt, id: 'gt2' }])
    expect(listener).toHaveBeenCalledTimes(2)

    repo.deleteAll()
    expect(listener).toHaveBeenCalledTimes(3)

    repo.getAll(true)
    repo.findById('gt1')
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
