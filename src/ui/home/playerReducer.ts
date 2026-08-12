import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { CleanupInactivePlayersUseCase } from '../../application/cleanupInactivePlayersUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayerStatsUseCase, PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import type { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import { groupTrophiesByPlayer } from '../../application/groupTrophiesByPlayer'
import type { RenamePlayerUseCase } from '../../application/renamePlayerUseCase'
import type { Player } from '../../domain/model/player'
import type { PlayerState } from './playerTypes'

/**
 * The read-side use cases every `load*`/`submit*` helper needs to rebuild the
 * screen after a mutation. Bundled rather than passed one by one: they always
 * travel together, and each new derived column (stats, then trophies) would
 * otherwise add a positional parameter to all five helpers.
 */
export interface PlayerDataSources {
  getPlayers: GetPlayersUseCase
  getPlayerStats: GetPlayerStatsUseCase
  cleanupInactivePlayers: CleanupInactivePlayersUseCase
  getTrophies: GetTrophiesUseCase
}

interface LoadedPlayers {
  players: Player[]
  stats: Map<string, PlayerStats>
  trophyCounts: Map<string, number>
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

function withLoaded(state: PlayerState, loaded: LoadedPlayers): PlayerState {
  return {
    ...state,
    players: loaded.players,
    stats: loaded.stats,
    trophyCounts: loaded.trophyCounts,
    cleanupCandidates: loaded.cleanupCandidates,
  }
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'loaded':
      return withLoaded(state, action)
    case 'updateInput':
      return { ...state, inputName: action.name, error: undefined }
    case 'addSucceeded':
      return { ...withLoaded(state, action), inputName: '', error: undefined }
    case 'addFailed':
      return { ...state, error: action.error }
    case 'showDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: action.id }
    case 'dismissDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: undefined }
    case 'deleted':
      return { ...withLoaded(state, action), deleteConfirmPlayerId: undefined }
    case 'startRename': {
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player) return state
      return { ...state, renamingPlayerId: action.playerId, renameInput: player.name }
    }
    case 'updateRenameInput':
      return { ...state, renameInput: action.name }
    case 'renameSucceeded':
      return {
        ...withLoaded(state, action),
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
      return { ...withLoaded(state, action), showCleanupConfirm: false }
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

/**
 * Home only shows how many trophies a player holds, not which ones — the
 * badge detail (title, value, unit) stays on the Stats player detail. Counting
 * reuses `groupTrophiesByPlayer()`, so ex aequo holders count like sole
 * holders and a doubly-held id (D1 per game type) counts twice.
 */
function countTrophiesByPlayer(getTrophies: GetTrophiesUseCase): Map<string, number> {
  const counts = new Map<string, number>()
  for (const [playerId, badges] of groupTrophiesByPlayer(getTrophies.invoke())) {
    counts.set(playerId, badges.length)
  }
  return counts
}

export function loadPlayers(sources: PlayerDataSources): LoadedPlayers {
  return {
    players: sources.getPlayers.invoke(),
    stats: sources.getPlayerStats.invoke(),
    trophyCounts: countTrophiesByPlayer(sources.getTrophies),
    cleanupCandidates: sources.cleanupInactivePlayers.preview(),
  }
}

/** Mirrors PlayerHandler's AddPlayer try/catch, using the current form input. */
export function submitAddPlayer(
  addPlayer: AddPlayerUseCase,
  sources: PlayerDataSources,
  state: PlayerState,
): PlayerAction {
  try {
    addPlayer.invoke(state.inputName.trim())
    return { type: 'addSucceeded', ...loadPlayers(sources) }
  } catch (e) {
    return { type: 'addFailed', error: errorMessage(e) }
  }
}

export function submitDeletePlayer(
  deletePlayer: DeletePlayerUseCase,
  sources: PlayerDataSources,
  id: string,
  anonymize: boolean,
): PlayerAction {
  deletePlayer.invoke(id, anonymize)
  return { type: 'deleted', ...loadPlayers(sources) }
}

/** Mirrors ConfirmRename's `state.renamingPlayerId ?: return` guard: undefined means no-op. */
export function submitConfirmRename(
  renamePlayerUseCase: RenamePlayerUseCase,
  sources: PlayerDataSources,
  state: PlayerState,
): PlayerAction | undefined {
  if (state.renamingPlayerId === undefined) return undefined
  try {
    renamePlayerUseCase.invoke(state.renamingPlayerId, state.renameInput.trim())
    return { type: 'renameSucceeded', ...loadPlayers(sources) }
  } catch (e) {
    return { type: 'renameFailed', error: errorMessage(e) }
  }
}

export function submitCleanup(sources: PlayerDataSources): PlayerAction {
  sources.cleanupInactivePlayers.execute()
  return { type: 'cleanupCompleted', ...loadPlayers(sources) }
}
