import type { PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { Player } from '../../domain/model/player'

export interface PlayerState {
  players: Player[]
  stats: Map<string, PlayerStats>
  inputName: string
  error: string | undefined
  deleteConfirmPlayerId: string | undefined
  renamingPlayerId: string | undefined
  renameInput: string
  cleanupCandidates: Player[]
  showCleanupConfirm: boolean
}

export const initialPlayerState: PlayerState = {
  players: [],
  stats: new Map(),
  inputName: '',
  error: undefined,
  deleteConfirmPlayerId: undefined,
  renamingPlayerId: undefined,
  renameInput: '',
  cleanupCandidates: [],
  showCleanupConfirm: false,
}
