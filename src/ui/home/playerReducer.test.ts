import { describe, expect, it } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import { GetPlayerStatsUseCase } from '../../application/getPlayerStatsUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import {
  loadPlayers,
  playerReducer,
  submitAddPlayer,
  submitConfirmRename,
  submitDeletePlayer,
} from './playerReducer'
import { initialPlayerState, type PlayerState } from './playerTypes'

function gameType(id: string, name: string): GameType {
  return {
    id,
    name,
    winCondition: 'HIGHEST_SCORE',
    tieBreakRule: 'NONE',
    tieBreakCondition: 'HIGHEST_SCORE',
    tieBreakLabel: null,
    active: true,
  }
}

function match(id: string, date: number, gameTypeId: string, playerScores: Match['playerScores']): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [] }
}

function buildUseCases(
  playerRepo = new InMemoryPlayerRepository(),
  matchRepo = new InMemoryMatchRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
) {
  return {
    playerRepo,
    addPlayer: new AddPlayerUseCase(playerRepo),
    getPlayers: new GetPlayersUseCase(playerRepo),
    getPlayerStats: new GetPlayerStatsUseCase(matchRepo, gameTypeRepo),
    deletePlayer: new DeletePlayerUseCase(playerRepo),
    renamePlayerUseCase: new RenamePlayerUseCase(playerRepo),
  }
}

function add(state: PlayerState, uc: ReturnType<typeof buildUseCases>, name: string): PlayerState {
  const withInput = playerReducer(state, { type: 'updateInput', name })
  return playerReducer(withInput, submitAddPlayer(uc.addPlayer, uc.getPlayers, uc.getPlayerStats, withInput))
}

describe('playerReducer', () => {
  it('initial state has empty player list and empty input', () => {
    expect(initialPlayerState.players).toEqual([])
    expect(initialPlayerState.inputName).toBe('')
    expect(initialPlayerState.error).toBeUndefined()
  })

  it('updateInput updates inputName and clears the error', () => {
    const uc = buildUseCases()
    let state = playerReducer(initialPlayerState, submitAddPlayer(uc.addPlayer, uc.getPlayers, uc.getPlayerStats, initialPlayerState))
    state = playerReducer(state, { type: 'updateInput', name: 'Alice' })

    expect(state.inputName).toBe('Alice')
    expect(state.error).toBeUndefined()
  })

  it('adding a valid name adds the player and clears the input', () => {
    const uc = buildUseCases()
    const state = add(initialPlayerState, uc, 'Alice')

    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Alice')
    expect(state.inputName).toBe('')
    expect(state.error).toBeUndefined()
  })

  it('adding a blank name sets an error and does not add a player', () => {
    const uc = buildUseCases()
    const state = add(initialPlayerState, uc, '   ')

    expect(state.players).toEqual([])
    expect(state.error).toBe('name: Player name must not be blank')
  })

  it('adding with an empty input sets an error', () => {
    const uc = buildUseCases()
    const state = playerReducer(initialPlayerState, submitAddPlayer(uc.addPlayer, uc.getPlayers, uc.getPlayerStats, initialPlayerState))

    expect(state.players).toEqual([])
    expect(state.error).toBe('name: Player name must not be blank')
  })

  it('adding multiple players accumulates in state', () => {
    const uc = buildUseCases()
    let state = add(initialPlayerState, uc, 'Alice')
    state = add(state, uc, 'Bob')

    expect(state.players).toHaveLength(2)
  })

  it('showDeleteConfirm sets deleteConfirmPlayerId', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })

    state = playerReducer(state, { type: 'showDeleteConfirm', id: 'p1' })

    expect(state.deleteConfirmPlayerId).toBe('p1')
  })

  it('dismissDeleteConfirm clears deleteConfirmPlayerId', () => {
    let state = playerReducer(initialPlayerState, { type: 'showDeleteConfirm', id: 'p1' })
    state = playerReducer(state, { type: 'dismissDeleteConfirm' })

    expect(state.deleteConfirmPlayerId).toBeUndefined()
  })

  it('deleting a player removes it from the active list', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    uc.playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })
    state = playerReducer(state, { type: 'showDeleteConfirm', id: 'p1' })

    state = playerReducer(
      state,
      submitDeletePlayer(uc.deletePlayer, uc.getPlayers, uc.getPlayerStats, 'p1', false),
    )

    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Bob')
    expect(state.deleteConfirmPlayerId).toBeUndefined()
  })

  it('deleting with anonymize blanks the name', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })

    state = playerReducer(state, submitDeletePlayer(uc.deletePlayer, uc.getPlayers, uc.getPlayerStats, 'p1', true))

    expect(state.players).toEqual([])
    const all = uc.playerRepo.getAll(true)
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('')
    expect(all[0].active).toBe(false)
  })

  it('deleting without anonymize keeps the name', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })

    state = playerReducer(state, submitDeletePlayer(uc.deletePlayer, uc.getPlayers, uc.getPlayerStats, 'p1', false))

    expect(state.players).toEqual([])
    const all = uc.playerRepo.getAll(true)
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('Alice')
    expect(all[0].active).toBe(false)
  })

  it('deleting a player keeps stats for the remaining players', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    uc.playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const uc2 = buildUseCases(uc.playerRepo, matchRepo, gameTypeRepo)
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc2.getPlayers, uc2.getPlayerStats) })

    state = playerReducer(state, submitDeletePlayer(uc2.deletePlayer, uc2.getPlayers, uc2.getPlayerStats, 'p1', false))

    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Bob')
    expect(state.stats.get('p2')?.losses).toBe(1)
  })

  it('startRename populates renamingPlayerId and renameInput with the current name', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })

    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })

    expect(state.renamingPlayerId).toBe('p1')
    expect(state.renameInput).toBe('Alice')
  })

  it('startRename with a nonexistent player does not update state', () => {
    const state = playerReducer(initialPlayerState, { type: 'startRename', playerId: 'nonexistent' })

    expect(state.renamingPlayerId).toBeUndefined()
    expect(state.renameInput).toBe('')
  })

  it('updateRenameInput updates the renameInput field', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })

    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    expect(state.renameInput).toBe('Alicia')
  })

  it('confirming a rename calls the use case and updates the players list', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.getPlayers, uc.getPlayerStats, state)!
    state = playerReducer(state, action)

    expect(state.players[0].name).toBe('Alicia')
  })

  it('confirming a rename clears the rename state after success', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.getPlayers, uc.getPlayerStats, state)!
    state = playerReducer(state, action)

    expect(state.renamingPlayerId).toBeUndefined()
    expect(state.renameInput).toBe('')
    expect(state.error).toBeUndefined()
  })

  it('confirming a rename with an empty name sets an error and does not save', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: '   ' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.getPlayers, uc.getPlayerStats, state)!
    state = playerReducer(state, action)

    expect(state.error).toBe('name: Player name must not be blank')
    expect(state.players[0].name).toBe('Alice')
    expect(state.renamingPlayerId).toBe('p1')
  })

  it('cancelRename discards changes and clears state', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: 'Bob' })

    state = playerReducer(state, { type: 'cancelRename' })

    expect(state.renamingPlayerId).toBeUndefined()
    expect(state.renameInput).toBe('')
    expect(state.players[0].name).toBe('Alice')
  })

  it('renaming preserves the player id (tied to stats)', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })
    const originalId = state.players[0].id
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.getPlayers, uc.getPlayerStats, state)!
    state = playerReducer(state, action)

    expect(state.players[0].id).toBe(originalId)
  })

  it('confirming a rename without a prior startRename is a no-op', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.getPlayers, uc.getPlayerStats) })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.getPlayers, uc.getPlayerStats, state)

    expect(action).toBeUndefined()
    expect(state.players[0].name).toBe('Alice')
    expect(state.renamingPlayerId).toBeUndefined()
  })
})
