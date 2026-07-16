import type { SyncConflict, SyncResult } from '../../application/syncUseCase'

export type SyncPhase = 'Disconnected' | 'Restoring' | 'Connecting' | 'Detecting' | 'Syncing' | 'Resolved' | 'Conflict'

export interface SyncState {
  phase: SyncPhase
  email: string | null
  conflict: SyncConflict | undefined
  result: SyncResult | undefined
  error: string | undefined
}

export const initialSyncState: SyncState = {
  phase: 'Disconnected',
  email: null,
  conflict: undefined,
  result: undefined,
  error: undefined,
}
