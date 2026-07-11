import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayerStatsUseCase, PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import type { Player } from '../../domain/model/player'
import type { PlayerState } from './playerTypes'

export type PlayerAction =
  | { type: 'loaded'; players: Player[]; stats: Map<string, PlayerStats> }
  | { type: 'updateInput'; name: string }
  | { type: 'addSucceeded'; players: Player[]; stats: Map<string, PlayerStats> }
  | { type: 'addFailed'; error: string }
  | { type: 'showDeleteConfirm'; id: string }
  | { type: 'dismissDeleteConfirm' }
  | { type: 'deleted'; players: Player[]; stats: Map<string, PlayerStats> }
  | { type: 'startRename'; playerId: string }
  | { type: 'updateRenameInput'; name: string }
  | { type: 'renameSucceeded'; players: Player[]; stats: Map<string, PlayerStats> }
  | { type: 'renameFailed'; error: string }
  | { type: 'cancelRename' }

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'loaded':
      return { ...state, players: action.players, stats: action.stats }
    case 'updateInput':
      return { ...state, inputName: action.name, error: undefined }
    case 'addSucceeded':
      return { ...state, players: action.players, stats: action.stats, inputName: '', error: undefined }
    case 'addFailed':
      return { ...state, error: action.error }
    case 'showDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: action.id }
    case 'dismissDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: undefined }
    case 'deleted':
      return { ...state, players: action.players, stats: action.stats, deleteConfirmPlayerId: undefined }
    case 'startRename': {
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player) return state
      return { ...state, renamingPlayerId: action.playerId, renameInput: player.name }
    }
    case 'updateRenameInput':
      return { ...state, renameInput: action.name }
    case 'renameSucceeded':
      return {
        ...state,
        players: action.players,
        stats: action.stats,
        renamingPlayerId: undefined,
        renameInput: '',
        error: undefined,
      }
    case 'renameFailed':
      return { ...state, error: action.error }
    case 'cancelRename':
      return { ...state, renamingPlayerId: undefined, renameInput: '' }
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function loadPlayers(
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
): { players: Player[]; stats: Map<string, PlayerStats> } {
  return { players: getPlayers.invoke(), stats: getPlayerStats.invoke() }
}

/** Mirrors PlayerHandler's AddPlayer try/catch, using the current form input. */
export function submitAddPlayer(
  addPlayer: AddPlayerUseCase,
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
  state: PlayerState,
): PlayerAction {
  try {
    addPlayer.invoke(state.inputName.trim())
    return { type: 'addSucceeded', ...loadPlayers(getPlayers, getPlayerStats) }
  } catch (e) {
    return { type: 'addFailed', error: errorMessage(e) }
  }
}

export function submitDeletePlayer(
  deletePlayer: DeletePlayerUseCase,
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
  id: string,
  anonymize: boolean,
): PlayerAction {
  deletePlayer.invoke(id, anonymize)
  return { type: 'deleted', ...loadPlayers(getPlayers, getPlayerStats) }
}

/** Mirrors ConfirmRename's `state.renamingPlayerId ?: return` guard: undefined means no-op. */
export function submitConfirmRename(
  renamePlayerUseCase: RenamePlayerUseCase,
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
  state: PlayerState,
): PlayerAction | undefined {
  if (state.renamingPlayerId === undefined) return undefined
  try {
    renamePlayerUseCase.invoke(state.renamingPlayerId, state.renameInput.trim())
    return { type: 'renameSucceeded', ...loadPlayers(getPlayers, getPlayerStats) }
  } catch (e) {
    return { type: 'renameFailed', error: errorMessage(e) }
  }
}
