import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { CleanupInactivePlayersUseCase } from '../../application/cleanupInactivePlayersUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayerStatsUseCase, PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import type { Player } from '../../domain/model/player'
import type { PlayerState } from './playerTypes'

interface LoadedPlayers {
  players: Player[]
  stats: Map<string, PlayerStats>
  cleanupCandidates: Player[]
}

export type PlayerAction =
  | ({ type: 'loaded' } & LoadedPlayers)
  | { type: 'updateInput'; name: string }
  | ({ type: 'addSucceeded' } & LoadedPlayers)
  | { type: 'addFailed'; error: string }
  | { type: 'showDeleteConfirm'; id: string }
  | { type: 'dismissDeleteConfirm' }
  | ({ type: 'deleted' } & LoadedPlayers)
  | { type: 'startRename'; playerId: string }
  | { type: 'updateRenameInput'; name: string }
  | ({ type: 'renameSucceeded' } & LoadedPlayers)
  | { type: 'renameFailed'; error: string }
  | { type: 'cancelRename' }
  | { type: 'showCleanupConfirm' }
  | { type: 'dismissCleanupConfirm' }
  | ({ type: 'cleanupCompleted' } & LoadedPlayers)

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'loaded':
      return { ...state, players: action.players, stats: action.stats, cleanupCandidates: action.cleanupCandidates }
    case 'updateInput':
      return { ...state, inputName: action.name, error: undefined }
    case 'addSucceeded':
      return {
        ...state,
        players: action.players,
        stats: action.stats,
        cleanupCandidates: action.cleanupCandidates,
        inputName: '',
        error: undefined,
      }
    case 'addFailed':
      return { ...state, error: action.error }
    case 'showDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: action.id }
    case 'dismissDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: undefined }
    case 'deleted':
      return {
        ...state,
        players: action.players,
        stats: action.stats,
        cleanupCandidates: action.cleanupCandidates,
        deleteConfirmPlayerId: undefined,
      }
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
        cleanupCandidates: action.cleanupCandidates,
        renamingPlayerId: undefined,
        renameInput: '',
        error: undefined,
      }
    case 'renameFailed':
      return { ...state, error: action.error }
    case 'cancelRename':
      return { ...state, renamingPlayerId: undefined, renameInput: '' }
    case 'showCleanupConfirm':
      return { ...state, showCleanupConfirm: true }
    case 'dismissCleanupConfirm':
      return { ...state, showCleanupConfirm: false }
    case 'cleanupCompleted':
      return {
        ...state,
        players: action.players,
        stats: action.stats,
        cleanupCandidates: action.cleanupCandidates,
        showCleanupConfirm: false,
      }
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function loadPlayers(
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
  cleanupInactivePlayers: CleanupInactivePlayersUseCase,
): LoadedPlayers {
  return {
    players: getPlayers.invoke(),
    stats: getPlayerStats.invoke(),
    cleanupCandidates: cleanupInactivePlayers.preview(),
  }
}

/** Mirrors PlayerHandler's AddPlayer try/catch, using the current form input. */
export function submitAddPlayer(
  addPlayer: AddPlayerUseCase,
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
  cleanupInactivePlayers: CleanupInactivePlayersUseCase,
  state: PlayerState,
): PlayerAction {
  try {
    addPlayer.invoke(state.inputName.trim())
    return { type: 'addSucceeded', ...loadPlayers(getPlayers, getPlayerStats, cleanupInactivePlayers) }
  } catch (e) {
    return { type: 'addFailed', error: errorMessage(e) }
  }
}

export function submitDeletePlayer(
  deletePlayer: DeletePlayerUseCase,
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
  cleanupInactivePlayers: CleanupInactivePlayersUseCase,
  id: string,
  anonymize: boolean,
): PlayerAction {
  deletePlayer.invoke(id, anonymize)
  return { type: 'deleted', ...loadPlayers(getPlayers, getPlayerStats, cleanupInactivePlayers) }
}

/** Mirrors ConfirmRename's `state.renamingPlayerId ?: return` guard: undefined means no-op. */
export function submitConfirmRename(
  renamePlayerUseCase: RenamePlayerUseCase,
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
  cleanupInactivePlayers: CleanupInactivePlayersUseCase,
  state: PlayerState,
): PlayerAction | undefined {
  if (state.renamingPlayerId === undefined) return undefined
  try {
    renamePlayerUseCase.invoke(state.renamingPlayerId, state.renameInput.trim())
    return { type: 'renameSucceeded', ...loadPlayers(getPlayers, getPlayerStats, cleanupInactivePlayers) }
  } catch (e) {
    return { type: 'renameFailed', error: errorMessage(e) }
  }
}

export function submitCleanup(
  cleanupInactivePlayers: CleanupInactivePlayersUseCase,
  getPlayers: GetPlayersUseCase,
  getPlayerStats: GetPlayerStatsUseCase,
): PlayerAction {
  cleanupInactivePlayers.execute()
  return { type: 'cleanupCompleted', ...loadPlayers(getPlayers, getPlayerStats, cleanupInactivePlayers) }
}
