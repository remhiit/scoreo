import { describe, expect, it } from 'vitest'
import { emptyPlayerResult } from '../../domain/model/match'
import { buildInitialState, scoreDetailReducer } from './scoreDetailReducer'

const players = [
  { id: 'p1', name: 'Alice', active: true },
  { id: 'p2', name: 'Bob', active: true },
]

describe('buildInitialState', () => {
  it('creates an empty result per player when there are no existing results', () => {
    const state = buildInitialState(players, { type: 'Create' })
    expect(state.results).toEqual([emptyPlayerResult('p1'), emptyPlayerResult('p2')])
  })

  it('reuses existing results when editing a match', () => {
    const existing = [
      { ...emptyPlayerResult('p1'), parcheminValue: 5 as const },
      emptyPlayerResult('p2'),
    ]
    const state = buildInitialState(players, { type: 'Edit', matchId: 'm1' }, existing)
    expect(state.results[0].parcheminValue).toBe(5)
  })
})

describe('scoreDetailReducer', () => {
  const initial = buildInitialState(players, { type: 'Create' })

  it('updates a single player Torī count', () => {
    const next = scoreDetailReducer(initial, {
      type: 'updateToriiCount',
      playerId: 'p1',
      color: 'red',
      count: 3,
    })
    expect(next.results[0].toriiCounts.red).toBe(3)
    expect(next.results[1].toriiCounts.red).toBe(0)
  })

  it('updates a single player Parchemin value', () => {
    const next = scoreDetailReducer(initial, { type: 'updateParchemin', playerId: 'p2', value: 4 })
    expect(next.results[1].parcheminValue).toBe(4)
  })

  it('setting the Pinceau holder clears it from every other player', () => {
    const withP1 = scoreDetailReducer(initial, { type: 'setPinceauHolder', playerId: 'p1' })
    expect(withP1.results[0].hasPinceau).toBe(true)
    expect(withP1.results[1].hasPinceau).toBe(false)

    const withP2 = scoreDetailReducer(withP1, { type: 'setPinceauHolder', playerId: 'p2' })
    expect(withP2.results[0].hasPinceau).toBe(false)
    expect(withP2.results[1].hasPinceau).toBe(true)
  })

  it('clearing the Pinceau holder removes it from everyone', () => {
    const withP1 = scoreDetailReducer(initial, { type: 'setPinceauHolder', playerId: 'p1' })
    const cleared = scoreDetailReducer(withP1, { type: 'setPinceauHolder', playerId: undefined })
    expect(cleared.results.every((r) => !r.hasPinceau)).toBe(true)
  })

  it('updates a single player Objectif points', () => {
    const next = scoreDetailReducer(initial, {
      type: 'updateObjectifPoints',
      playerId: 'p1',
      landscape: 'bamboo',
      points: 6,
    })
    expect(next.results[0].objectifPoints.bamboo).toBe(6)
  })

  it('saveSucceeded marks the state as saved', () => {
    const next = scoreDetailReducer(initial, { type: 'saveSucceeded' })
    expect(next.saved).toBe(true)
  })

  it('saveFailed records the error message', () => {
    const next = scoreDetailReducer(initial, { type: 'saveFailed', error: 'boom' })
    expect(next.error).toBe('boom')
  })
})
