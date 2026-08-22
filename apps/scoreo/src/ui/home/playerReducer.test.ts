import { describe, expect, it } from 'vitest'
import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import { CleanupInactivePlayersUseCase } from '../../application/cleanupInactivePlayersUseCase'
import { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import { GetPlayerStatsUseCase } from '../../application/getPlayerStatsUseCase'
import { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import { MergePlayersUseCase } from '../../application/mergePlayersUseCase'
import { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import { InMemoryGameTypeRepository } from '../../infrastructure/testing/inMemoryGameTypeRepository'
import { InMemoryMatchDraftRepository } from '../../infrastructure/testing/inMemoryMatchDraftRepository'
import { InMemoryMatchRepository } from '../../infrastructure/testing/inMemoryMatchRepository'
import { InMemoryPlayerRepository } from '../../infrastructure/testing/inMemoryPlayerRepository'
import {
  loadPlayers,
  playerReducer,
  submitAddPlayer,
  submitConfirmRename,
  submitDeletePlayer,
  submitMergePlayers,
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
    moduleId: null,
    active: true,
  }
}

function match(id: string, date: number, gameTypeId: string, playerScores: Match['playerScores']): Match {
  return { id, date, gameTypeId, playerScores, manualWinners: [], secondaryPlayerScores: [], rounds: [] }
}

function buildUseCases(
  playerRepo = new InMemoryPlayerRepository(),
  matchRepo = new InMemoryMatchRepository(),
  gameTypeRepo = new InMemoryGameTypeRepository(),
) {
  return {
    playerRepo,
    matchRepo,
    addPlayer: new AddPlayerUseCase(playerRepo),
    deletePlayer: new DeletePlayerUseCase(playerRepo),
    renamePlayerUseCase: new RenamePlayerUseCase(playerRepo),
    mergePlayersUseCase: new MergePlayersUseCase(playerRepo, matchRepo, new InMemoryMatchDraftRepository()),
    sources: {
      getPlayers: new GetPlayersUseCase(playerRepo),
      getPlayerStats: new GetPlayerStatsUseCase(matchRepo, gameTypeRepo),
      cleanupInactivePlayers: new CleanupInactivePlayersUseCase(playerRepo, matchRepo),
      getTrophies: new GetTrophiesUseCase(matchRepo, gameTypeRepo, playerRepo),
    },
  }
}

function add(state: PlayerState, uc: ReturnType<typeof buildUseCases>, name: string): PlayerState {
  const withInput = playerReducer(state, { type: 'updateInput', name })
  return playerReducer(withInput, submitAddPlayer(uc.addPlayer, uc.sources, withInput))
}

describe('playerReducer', () => {
  it('initial state has empty player list and empty input', () => {
    expect(initialPlayerState.players).toEqual([])
    expect(initialPlayerState.inputName).toBe('')
    expect(initialPlayerState.error).toBeUndefined()
  })

  it('updateInput updates inputName and clears the error', () => {
    const uc = buildUseCases()
    let state = playerReducer(initialPlayerState, submitAddPlayer(uc.addPlayer, uc.sources, initialPlayerState))
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
    const state = playerReducer(initialPlayerState, submitAddPlayer(uc.addPlayer, uc.sources, initialPlayerState))

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
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

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
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'showDeleteConfirm', id: 'p1' })

    state = playerReducer(
      state,
      submitDeletePlayer(uc.deletePlayer, uc.sources, 'p1', false),
    )

    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Bob')
    expect(state.deleteConfirmPlayerId).toBeUndefined()
  })

  it('deleting with anonymize blanks the name', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

    state = playerReducer(state, submitDeletePlayer(uc.deletePlayer, uc.sources, 'p1', true))

    expect(state.players).toEqual([])
    const all = uc.playerRepo.getAll(true)
    expect(all).toHaveLength(1)
    expect(all[0].name).toBe('')
    expect(all[0].active).toBe(false)
  })

  it('deleting without anonymize keeps the name', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

    state = playerReducer(state, submitDeletePlayer(uc.deletePlayer, uc.sources, 'p1', false))

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
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc2.sources) })

    state = playerReducer(state, submitDeletePlayer(uc2.deletePlayer, uc2.sources, 'p1', false))

    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Bob')
    expect(state.stats.get('p2')?.losses).toBe(1)
  })

  it('loading counts the trophies held by each player, and omits players holding none', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const uc = buildUseCases(playerRepo, matchRepo, gameTypeRepo)

    const state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

    // Alice holds every record this single (long-past) match can award:
    // longest streak, current streak, most wins, ELO peak, king of the hill,
    // game record, and — since its month is long completed — the monthly
    // champion badge (F3) for that month.
    expect(state.trophyCounts.get('p1')).toBe(7)
    expect(state.trophyCounts.get('p2')).toBeUndefined()
  })

  it('trophy count grows by one per completed month won (F3), same rule as a trophy held twice', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    for (let month = 0; month < 5; month++) {
      matchRepo.save(match(`m${month}`, new Date(2020, month, 15).getTime(), 'gt1', [
        { playerId: 'p1', score: 10 },
      ]))
    }
    const uc = buildUseCases(playerRepo, matchRepo, gameTypeRepo)

    const state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

    const f3Count = uc.sources.getTrophies.invoke().find((t) => t.id === 'f3')!.holders.length
    expect(f3Count).toBe(5)
    expect(state.trophyCounts.get('p1')).toBeGreaterThanOrEqual(5)
  })

  it('trophy counts are recomputed after a player mutation', () => {
    const playerRepo = new InMemoryPlayerRepository()
    playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    playerRepo.save({ id: 'p2', name: 'Bob', active: true })
    const gameTypeRepo = new InMemoryGameTypeRepository()
    gameTypeRepo.save(gameType('gt1', 'Test'))
    const matchRepo = new InMemoryMatchRepository()
    matchRepo.save(match('m1', 1000, 'gt1', [
      { playerId: 'p1', score: 10 },
      { playerId: 'p2', score: 5 },
    ]))
    const uc = buildUseCases(playerRepo, matchRepo, gameTypeRepo)
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

    state = add(state, uc, 'Chloé')

    expect(state.trophyCounts.get('p1')).toBe(7)
    expect(state.trophyCounts.get(state.players[state.players.length - 1].id)).toBeUndefined()
  })

  it('startRename populates renamingPlayerId and renameInput with the current name', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

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
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })

    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    expect(state.renameInput).toBe('Alicia')
  })

  it('confirming a rename calls the use case and updates the players list', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.sources, state)!
    state = playerReducer(state, action)

    expect(state.players[0].name).toBe('Alicia')
  })

  it('confirming a rename clears the rename state after success', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.sources, state)!
    state = playerReducer(state, action)

    expect(state.renamingPlayerId).toBeUndefined()
    expect(state.renameInput).toBe('')
    expect(state.error).toBeUndefined()
  })

  it('confirming a rename with an empty name sets an error and does not save', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: '   ' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.sources, state)!
    state = playerReducer(state, action)

    expect(state.error).toBe('name: Player name must not be blank')
    expect(state.players[0].name).toBe('Alice')
    expect(state.renamingPlayerId).toBe('p1')
  })

  it('cancelRename discards changes and clears state', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
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
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    const originalId = state.players[0].id
    state = playerReducer(state, { type: 'startRename', playerId: 'p1' })
    state = playerReducer(state, { type: 'updateRenameInput', name: 'Alicia' })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.sources, state)!
    state = playerReducer(state, action)

    expect(state.players[0].id).toBe(originalId)
  })

  it('confirming a rename without a prior startRename is a no-op', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    const state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

    const action = submitConfirmRename(uc.renamePlayerUseCase, uc.sources, state)

    expect(action).toBeUndefined()
    expect(state.players[0].name).toBe('Alice')
    expect(state.renamingPlayerId).toBeUndefined()
  })
  it('loading also exposes soft-deleted players as merge candidates', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'p1', name: 'Alice', active: true })
    uc.playerRepo.save({ id: 'p2', name: 'Alicia', active: false })

    const state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })

    expect(state.players.map((p) => p.id)).toEqual(['p1'])
    expect(state.allPlayers.map((p) => p.id)).toEqual(['p1', 'p2'])
  })

  it('showMergeDialog opens the dialog with nothing picked', () => {
    let state = playerReducer(initialPlayerState, { type: 'toggleMergeDuplicate', id: 'stale' })
    state = playerReducer(state, { type: 'showMergeDialog' })

    expect(state.showMergeDialog).toBe(true)
    expect(state.mergeKeptId).toBeUndefined()
    expect(state.mergeDuplicateIds).toEqual([])
  })

  it('dismissMergeDialog closes the dialog and drops the selection', () => {
    let state = playerReducer(initialPlayerState, { type: 'showMergeDialog' })
    state = playerReducer(state, { type: 'selectMergeKept', id: 'p1' })
    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'p2' })
    state = playerReducer(state, { type: 'dismissMergeDialog' })

    expect(state.showMergeDialog).toBe(false)
    expect(state.mergeKeptId).toBeUndefined()
    expect(state.mergeDuplicateIds).toEqual([])
  })

  it('toggleMergeDuplicate ticks and unticks a duplicate, keeping the others', () => {
    let state = playerReducer(initialPlayerState, { type: 'toggleMergeDuplicate', id: 'p2' })
    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'p3' })
    expect(state.mergeDuplicateIds).toEqual(['p2', 'p3'])

    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'p2' })
    expect(state.mergeDuplicateIds).toEqual(['p3'])
  })

  it('picking an already ticked duplicate as the kept player unticks it', () => {
    let state = playerReducer(initialPlayerState, { type: 'toggleMergeDuplicate', id: 'p2' })
    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'p3' })
    state = playerReducer(state, { type: 'selectMergeKept', id: 'p2' })

    expect(state.mergeKeptId).toBe('p2')
    expect(state.mergeDuplicateIds).toEqual(['p3'])
  })

  it('merging moves the matches, drops every duplicate and closes the dialog', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'keep', name: 'Jean-Luc', active: true })
    uc.playerRepo.save({ id: 'dup', name: 'Jean Luc', active: true })
    uc.playerRepo.save({ id: 'dup2', name: 'JeanLuc', active: true })
    uc.matchRepo.save(match('m1', 1000, 'gt1', [{ playerId: 'dup', score: 10 }]))
    uc.matchRepo.save(match('m2', 2000, 'gt1', [{ playerId: 'dup2', score: 7 }]))
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'showMergeDialog' })
    state = playerReducer(state, { type: 'selectMergeKept', id: 'keep' })
    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'dup' })
    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'dup2' })

    state = playerReducer(state, submitMergePlayers(uc.mergePlayersUseCase, uc.sources, state)!)

    expect(state.players.map((p) => p.id)).toEqual(['keep'])
    expect(uc.matchRepo.getAll().map((m) => m.playerScores[0].playerId)).toEqual(['keep', 'keep'])
    expect(state.showMergeDialog).toBe(false)
    expect(state.mergeError).toBeUndefined()
  })

  it('a refused merge keeps the dialog open and reports the reason', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'dup', name: 'Jean Luc', active: true })
    uc.playerRepo.save({ id: 'keep', name: 'Jean-Luc', active: true })
    uc.matchRepo.save(
      match('m1', 1000, 'gt1', [
        { playerId: 'dup', score: 10 },
        { playerId: 'keep', score: 4 },
      ]),
    )
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'showMergeDialog' })
    state = playerReducer(state, { type: 'selectMergeKept', id: 'keep' })
    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'dup' })

    state = playerReducer(state, submitMergePlayers(uc.mergePlayersUseCase, uc.sources, state)!)

    expect(state.showMergeDialog).toBe(true)
    expect(state.mergeError).toMatch(/face themselves/)
    expect(state.players).toHaveLength(2)
  })

  it('confirming a merge with no duplicate ticked is a no-op', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'keep', name: 'Jean-Luc', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'selectMergeKept', id: 'keep' })

    expect(submitMergePlayers(uc.mergePlayersUseCase, uc.sources, state)).toBeUndefined()
  })

  it('confirming a merge with no kept player picked is a no-op', () => {
    const uc = buildUseCases()
    uc.playerRepo.save({ id: 'dup', name: 'Jean Luc', active: true })
    let state = playerReducer(initialPlayerState, { type: 'loaded', ...loadPlayers(uc.sources) })
    state = playerReducer(state, { type: 'toggleMergeDuplicate', id: 'dup' })

    expect(submitMergePlayers(uc.mergePlayersUseCase, uc.sources, state)).toBeUndefined()
  })
})
