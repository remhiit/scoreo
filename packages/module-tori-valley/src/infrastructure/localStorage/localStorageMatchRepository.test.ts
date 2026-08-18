import { beforeEach, describe, expect, it } from 'vitest'
import { emptyPlayerResult, type Match } from '../../domain/model/match'
import { LocalStorageMatchRepository } from './localStorageMatchRepository'

function makeMatch(id: string): Match {
  return {
    id,
    playedAt: 1000,
    playerIds: ['p1', 'p2'],
    results: [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
  }
}

describe('LocalStorageMatchRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips a saved match', () => {
    const repo = new LocalStorageMatchRepository()
    repo.save(makeMatch('m1'))

    expect(repo.getAll()).toEqual([makeMatch('m1')])
  })

  it('upserts on save with the same id', () => {
    const repo = new LocalStorageMatchRepository()
    repo.save(makeMatch('m1'))
    repo.save({ ...makeMatch('m1'), playedAt: 2000 })

    expect(repo.getAll()).toHaveLength(1)
    expect(repo.getAll()[0].playedAt).toBe(2000)
  })

  it('finds a match by id', () => {
    const repo = new LocalStorageMatchRepository()
    repo.save(makeMatch('m1'))

    expect(repo.findById('m1')?.id).toBe('m1')
    expect(repo.findById('missing')).toBeUndefined()
  })

  it('deletes a match', () => {
    const repo = new LocalStorageMatchRepository()
    repo.save(makeMatch('m1'))

    repo.delete('m1')

    expect(repo.getAll()).toHaveLength(0)
  })

  it('fails open on corrupted JSON (returns empty array)', () => {
    localStorage.setItem('tori_valley_matches', 'not json')
    const repo = new LocalStorageMatchRepository()

    expect(repo.getAll()).toEqual([])
  })

  it('backward compat: old JSON without results defaults to an empty array', () => {
    localStorage.setItem(
      'tori_valley_matches',
      JSON.stringify([{ id: 'm1', playedAt: 1000, playerIds: ['p1'] }]),
    )
    const repo = new LocalStorageMatchRepository()

    expect(repo.getAll()[0].results).toEqual([])
  })
})
