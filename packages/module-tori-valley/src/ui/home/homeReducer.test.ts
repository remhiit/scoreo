import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../domain/model/errors'
import i18n from '../../i18n/standalone'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { homeReducer, submitAddPlayer, submitDeletePlayer } from './homeReducer'
import { buildInitialHomeState, initialHomeState } from './homeTypes'

describe('buildInitialHomeState', () => {
  it('starts with nothing selected by default', () => {
    expect(buildInitialHomeState().selectedPlayerIds).toEqual([])
  })

  it('restores a player preselection, so coming back from match setup keeps it', () => {
    expect(buildInitialHomeState(['p1', 'p2']).selectedPlayerIds).toEqual(['p1', 'p2'])
  })
})

describe('homeReducer', () => {
  it('drops preselected players that no longer exist once the list loads', () => {
    const state = buildInitialHomeState(['p1', 'gone'])

    const next = homeReducer(state, {
      type: 'loaded',
      players: [{ id: 'p1', name: 'Alice', active: true }],
    })

    expect(next.selectedPlayerIds).toEqual(['p1'])
  })

  it('updates the input name', () => {
    const next = homeReducer(initialHomeState, { type: 'updateInput', name: 'Alice' })
    expect(next.inputName).toBe('Alice')
  })

  it('toggles a player selection on and off', () => {
    const selected = homeReducer(initialHomeState, { type: 'togglePlayerSelection', id: 'p1' })
    expect(selected.selectedPlayerIds).toEqual(['p1'])
    const deselected = homeReducer(selected, { type: 'togglePlayerSelection', id: 'p1' })
    expect(deselected.selectedPlayerIds).toEqual([])
  })

  it('caps selection at 4 players', () => {
    let state = initialHomeState
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) {
      state = homeReducer(state, { type: 'togglePlayerSelection', id })
    }
    expect(state.selectedPlayerIds).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('deleted drops the player from the current selection', () => {
    const selected = homeReducer(initialHomeState, { type: 'togglePlayerSelection', id: 'p1' })
    const next = homeReducer(selected, { type: 'deleted', players: [] })
    expect(next.selectedPlayerIds).toEqual([])
  })
})

describe('submitAddPlayer', () => {
  it('adds the trimmed input name and reloads players', () => {
    const repo = new InMemoryPlayerRepository()
    const state = { ...initialHomeState, inputName: '  Alice  ' }
    const action = submitAddPlayer(
      new AddPlayerUseCase(repo),
      new GetPlayersUseCase(repo),
      state,
      i18n.t,
    )
    expect(action).toEqual({ type: 'addSucceeded', players: repo.getAll() })
    expect(repo.getAll()[0].name).toBe('Alice')
  })

  it('returns addFailed on a blank name', () => {
    const repo = new InMemoryPlayerRepository()
    const state = { ...initialHomeState, inputName: '   ' }
    const action = submitAddPlayer(
      new AddPlayerUseCase(repo),
      new GetPlayersUseCase(repo),
      state,
      i18n.t,
    )
    expect(action.type).toBe('addFailed')
    expect((action as { error: string }).error).toContain(new ValidationError('name', '').field)
  })
})

describe('submitDeletePlayer', () => {
  it('deletes the player and reloads the active list', () => {
    const repo = new InMemoryPlayerRepository()
    const player = new AddPlayerUseCase(repo).invoke('Alice')
    const action = submitDeletePlayer(
      new DeletePlayerUseCase(repo),
      new GetPlayersUseCase(repo),
      player.id,
    )
    expect(action).toEqual({ type: 'deleted', players: [] })
  })
})
