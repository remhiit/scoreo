import type { GameType } from '../model/gameType'
import type { Match } from '../model/match'
import type { Player } from '../model/player'

export interface SyncData {
  players: Player[]
  gameTypes: GameType[]
  matches: Match[]
  lastModified: number
}

export interface SyncStatus {
  connected: boolean
  lastSync: number | null
  email: string | null
  isOnline: boolean
}

export type SyncException =
  | { kind: 'NotAuthenticated'; message: string }
  | { kind: 'NetworkError' }
  | { kind: 'ApiError'; code: number; message: string }
  | { kind: 'Conflict' }
  | { kind: 'RateLimited' }

export interface CloudSyncRepository {
  push(data: SyncData): Promise<void>
  pull(): Promise<SyncData>
  getStatus(): Promise<SyncStatus>
  login(): Promise<void>
  logout(): Promise<void>
}
