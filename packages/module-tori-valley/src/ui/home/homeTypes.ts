import type { Player } from '../../domain/model/player'

export interface HomeState {
  players: Player[]
  inputName: string
  error: string | undefined
  selectedPlayerIds: string[]
  deleteConfirmPlayerId: string | undefined
}

export const initialHomeState: HomeState = {
  players: [],
  inputName: '',
  error: undefined,
  selectedPlayerIds: [],
  deleteConfirmPlayerId: undefined,
}
