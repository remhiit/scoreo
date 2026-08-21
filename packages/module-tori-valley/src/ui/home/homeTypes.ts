import type { Player } from '../../domain/model/player'

export interface HomeState {
  players: Player[]
  inputName: string
  error: string | undefined
  selectedPlayerIds: string[]
  deleteConfirmPlayerId: string | undefined
}

export function buildInitialHomeState(selectedPlayerIds: string[] = []): HomeState {
  return {
    players: [],
    inputName: '',
    error: undefined,
    selectedPlayerIds,
    deleteConfirmPlayerId: undefined,
  }
}

export const initialHomeState: HomeState = buildInitialHomeState()
