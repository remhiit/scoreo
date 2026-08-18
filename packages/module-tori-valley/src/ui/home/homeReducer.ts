import type { TFunction } from 'i18next'
import type { AddPlayerUseCase } from '../../application/addPlayerUseCase'
import type { DeletePlayerUseCase } from '../../application/deletePlayerUseCase'
import type { GetPlayersUseCase } from '../../application/getPlayersUseCase'
import { NotFoundError, ValidationError } from '../../domain/model/errors'
import type { Player } from '../../domain/model/player'
import type { HomeState } from './homeTypes'

export const MAX_MATCH_PLAYERS = 4

export type HomeAction =
  | { type: 'loaded'; players: Player[] }
  | { type: 'updateInput'; name: string }
  | { type: 'addSucceeded'; players: Player[] }
  | { type: 'addFailed'; error: string }
  | { type: 'togglePlayerSelection'; id: string }
  | { type: 'showDeleteConfirm'; id: string }
  | { type: 'dismissDeleteConfirm' }
  | { type: 'deleted'; players: Player[] }

export function homeReducer(state: HomeState, action: HomeAction): HomeState {
  switch (action.type) {
    case 'loaded':
      // A preselection restored from the URL may name players deleted since.
      return {
        ...state,
        players: action.players,
        selectedPlayerIds: state.selectedPlayerIds.filter((id) =>
          action.players.some((p) => p.id === id),
        ),
      }
    case 'updateInput':
      return { ...state, inputName: action.name, error: undefined }
    case 'addSucceeded':
      return { ...state, players: action.players, inputName: '', error: undefined }
    case 'addFailed':
      return { ...state, error: action.error }
    case 'togglePlayerSelection': {
      const alreadySelected = state.selectedPlayerIds.includes(action.id)
      if (alreadySelected) {
        return {
          ...state,
          selectedPlayerIds: state.selectedPlayerIds.filter((id) => id !== action.id),
        }
      }
      if (state.selectedPlayerIds.length >= MAX_MATCH_PLAYERS) return state
      return { ...state, selectedPlayerIds: [...state.selectedPlayerIds, action.id] }
    }
    case 'showDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: action.id }
    case 'dismissDeleteConfirm':
      return { ...state, deleteConfirmPlayerId: undefined }
    case 'deleted':
      return {
        ...state,
        players: action.players,
        deleteConfirmPlayerId: undefined,
        selectedPlayerIds: state.selectedPlayerIds.filter((id) =>
          action.players.some((p) => p.id === id),
        ),
      }
  }
}

function errorMessage(e: unknown, t: TFunction): string {
  if (e instanceof ValidationError && e.code) return t(e.code, e.params)
  if (e instanceof NotFoundError && e.code) return t(e.code, { id: e.id })
  return e instanceof Error ? e.message : String(e)
}

export function submitAddPlayer(
  addPlayer: AddPlayerUseCase,
  getPlayers: GetPlayersUseCase,
  state: HomeState,
  t: TFunction,
): HomeAction {
  try {
    addPlayer.invoke(state.inputName.trim())
    return { type: 'addSucceeded', players: getPlayers.invoke() }
  } catch (e) {
    return { type: 'addFailed', error: errorMessage(e, t) }
  }
}

export function submitDeletePlayer(
  deletePlayer: DeletePlayerUseCase,
  getPlayers: GetPlayersUseCase,
  id: string,
): HomeAction {
  deletePlayer.invoke(id)
  return { type: 'deleted', players: getPlayers.invoke() }
}
