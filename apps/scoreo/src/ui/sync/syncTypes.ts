import type { SyncConflict, SyncResult } from '../../application/syncUseCase'

export type SyncPhase = 'Disconnected' | 'Restoring' | 'Connecting' | 'Detecting' | 'Syncing' | 'Resolved' | 'Conflict'

export interface SyncState {
  phase: SyncPhase
  connected: boolean
  conflict: SyncConflict | undefined
  result: SyncResult | undefined
  error: string | undefined
}

export const initialSyncState: SyncState = {
  phase: 'Disconnected',
  connected: false,
  conflict: undefined,
  result: undefined,
  error: undefined,
}
