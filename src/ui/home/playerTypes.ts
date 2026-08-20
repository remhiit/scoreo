import type { PlayerStats } from '../../application/getPlayerStatsUseCase'
import type { Player } from '../../domain/model/player'

export interface PlayerState {
  players: Player[]
  /**
   * Every player, soft-deleted ones included — the merge dialog's candidate
   * list. An import can duplicate a player who was already deleted, so
   * restricting the merge to `players` would leave that duplicate unfixable.
   */
  allPlayers: Player[]
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
  showMergeDialog: boolean
  /** Player to absorb, hard-deleted once the merge succeeds. */
  mergeDuplicateId: string | undefined
  /** Player to keep, inheriting the duplicate's matches. */
  mergeKeptId: string | undefined
  /** Kept apart from `error`, which is also rendered under the add-player field. */
  mergeError: string | undefined
}

export const initialPlayerState: PlayerState = {
  players: [],
  allPlayers: [],
  stats: new Map(),
  trophyCounts: new Map(),
  inputName: '',
  error: undefined,
  deleteConfirmPlayerId: undefined,
  renamingPlayerId: undefined,
  renameInput: '',
  cleanupCandidates: [],
  showCleanupConfirm: false,
  showMergeDialog: false,
  mergeDuplicateId: undefined,
  mergeKeptId: undefined,
  mergeError: undefined,
}
