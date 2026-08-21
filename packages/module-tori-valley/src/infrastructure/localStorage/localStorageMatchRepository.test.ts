import { beforeEach, describe, expect, it } from 'vitest'
import { defaultObjectifCardSelection } from '../../domain/model/landscape'
import { emptyPlayerResult, scorePlayerResult, type Match } from '../../domain/model/match'
import { emptyObjectifInputs, emptyObjectifManual } from '../../domain/model/objectifCard'
import { LocalStorageMatchRepository } from './localStorageMatchRepository'

function makeMatch(id: string): Match {
  return {
    id,
    playedAt: 1000,
    playerIds: ['p1', 'p2'],
    results: [emptyPlayerResult('p1'), emptyPlayerResult('p2')],
    objectifCards: defaultObjectifCardSelection(),
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

  it('backward compat: a match stored before card selection existed still loads', () => {
    localStorage.setItem(
      'tori_valley_matches',
      JSON.stringify([
        {
          id: 'm1',
          playedAt: 1000,
          playerIds: ['p1'],
          results: [
            {
              playerId: 'p1',
              toriiCounts: { green: 1, red: 1, blue: 0, yellow: 0, purple: 0 },
              parcheminValue: 3,
              hasPinceau: true,
              objectifPoints: {
                bamboo: 4,
                cherryBlossom: 0,
                mountain: 0,
                water: 0,
                village: 0,
              },
            },
          ],
        },
      ]),
    )
    const repo = new LocalStorageMatchRepository()

    const loaded = repo.getAll()[0]
    expect(loaded.objectifCards).toEqual(defaultObjectifCardSelection())
    // the pre-existing result must survive untouched
    expect(loaded.results[0].objectifPoints.bamboo).toBe(4)
    expect(loaded.results[0].parcheminValue).toBe(3)
  })

  it('backward compat: a result stored before guided entry keeps its hand-entered totals', () => {
    localStorage.setItem(
      'tori_valley_matches',
      JSON.stringify([
        {
          id: 'm1',
          playedAt: 1000,
          playerIds: ['p1'],
          objectifCards: {
            bamboo: 'B',
            cherryBlossom: 'A',
            mountain: 'A',
            water: 'A',
            village: 'A',
          },
          results: [
            {
              playerId: 'p1',
              toriiCounts: { green: 0, red: 0, blue: 0, yellow: 0, purple: 0 },
              parcheminValue: 0,
              hasPinceau: false,
              objectifPoints: {
                bamboo: 12,
                cherryBlossom: 0,
                mountain: 0,
                water: 0,
                village: 7,
              },
            },
          ],
        },
      ]),
    )
    const repo = new LocalStorageMatchRepository()

    const result = repo.getAll()[0].results[0]
    // No inputs were ever entered, and nothing is flagged as overridden — but
    // the totals the player typed back then are still the totals.
    expect(result.objectifInputs).toEqual(emptyObjectifInputs())
    expect(result.objectifManual).toEqual(emptyObjectifManual())
    expect(result.objectifPoints.bamboo).toBe(12)
    expect(result.objectifPoints.village).toBe(7)
    expect(scorePlayerResult(result)).toBe(19)
  })
})
