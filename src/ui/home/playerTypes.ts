import type { PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { Player } from '../../domain/model/player'

export interface PlayerState {
  players: Player[]
  stats: Map<string, PlayerStats>
  /** Player id -> number of trophies held. Absent id means zero. */
  trophyCounts: Map<string, number>
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
  trophyCounts: new Map(),
  inputName: '',
  error: undefined,
  deleteConfirmPlayerId: undefined,
  renamingPlayerId: undefined,
  renameInput: '',
  cleanupCandidates: [],
  showCleanupConfirm: false,
}
