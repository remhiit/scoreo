import type {
  CloudSyncRepository,
  SyncData,
  SyncException,
  SyncStatus,
} from '../../domain/port/cloudSyncRepository'

const notAuthenticated = (): SyncException => ({ kind: 'NotAuthenticated', message: 'Not authenticated' })

export class InMemoryCloudSyncRepository implements CloudSyncRepository {
  storedData: SyncData | undefined
  connected = false
  /** Optional hook: return a SyncException to make the next push/pull throw it. */
  failNext: (() => SyncException | undefined) | undefined

  private lastSync: number | null = null
  private isOnline = true

  setOnline(online: boolean): void {
    this.isOnline = online
  }

  setLastSync(ts: number): void {
    this.lastSync = ts
  }

  async push(data: SyncData): Promise<void> {
    const failure = this.failNext?.()
    if (failure) throw failure
    if (!this.connected) throw notAuthenticated()
    this.storedData = data
    this.lastSync = data.lastModified
  }

  async pull(): Promise<SyncData> {
    const failure = this.failNext?.()
    if (failure) throw failure
    if (!this.connected) throw notAuthenticated()
    return this.storedData ?? { players: [], gameTypes: [], matches: [], lastModified: 0 }
  }

  async getStatus(): Promise<SyncStatus> {
    return {
      connected: this.connected,
      lastSync: this.lastSync,
      isOnline: this.isOnline,
    }
  }

  async login(): Promise<void> {
    this.connected = true
  }

  async logout(): Promise<void> {
    this.connected = false
  }
}
