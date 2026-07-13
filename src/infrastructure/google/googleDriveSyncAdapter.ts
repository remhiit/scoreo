import { GameTypeSchema } from '../../domain/model/gameType.schema'
import { MatchSchema } from '../../domain/model/match.schema'
import { PlayerSchema } from '../../domain/model/player.schema'
import type { CloudSyncRepository, SyncData, SyncException, SyncStatus } from '../../domain/port/cloudSyncRepository'
import { z } from 'zod'
import { GoogleDriveClient, type DriveClient } from './googleDriveClient'
import type { GoogleAuthService } from './googleAuthService'
import { clearSyncConfig, loadSyncConfig, saveSyncConfig } from './syncConfig'

const FILE_NAME = 'scoreo-data.json'
const FILE_VERSION = 1
const SCOPE = 'openid email https://www.googleapis.com/auth/drive.appdata'

const SyncFileSchema = z.object({
  version: z.number().default(FILE_VERSION),
  lastModified: z.number(),
  players: PlayerSchema.array(),
  gameTypes: GameTypeSchema.array(),
  matches: MatchSchema.array(),
})

function decodeJwtEmail(idToken: string): string | null {
  try {
    const base64 = idToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = JSON.parse(atob(base64)) as { email?: string }
    return json.email ?? null
  } catch {
    return null
  }
}

export class GoogleDriveSyncAdapter implements CloudSyncRepository {
  private readonly driveClient: DriveClient

  constructor(
    private readonly authService: GoogleAuthService,
    private readonly clientId: string,
    driveClient?: DriveClient,
  ) {
    this.driveClient = driveClient ?? new GoogleDriveClient(async () => this.authService.accessToken ?? undefined)
  }

  async push(data: SyncData): Promise<void> {
    await this.ensureFreshToken()
    const json = this.serializeSyncData(data)
    const result = await this.driveClient.upsertFile(FILE_NAME, json)
    if (!result.ok) throw result.error
    saveSyncConfig({ ...loadSyncConfig(), lastSyncTimestamp: data.lastModified })
  }

  async pull(): Promise<SyncData> {
    await this.ensureFreshToken()
    const fileIdResult = await this.driveClient.findFile(FILE_NAME)
    if (!fileIdResult.ok) throw fileIdResult.error
    if (!fileIdResult.value) {
      return { players: [], gameTypes: [], matches: [], lastModified: 0 }
    }
    const contentResult = await this.driveClient.readFile(fileIdResult.value)
    if (!contentResult.ok) throw contentResult.error
    saveSyncConfig({ ...loadSyncConfig(), lastSyncFileId: fileIdResult.value })
    return this.deserializeSyncData(contentResult.value)
  }

  async getStatus(): Promise<SyncStatus> {
    const config = loadSyncConfig()
    return {
      connected: this.authService.accessToken !== null || config.email !== '',
      lastSync: config.lastSyncTimestamp > 0 ? config.lastSyncTimestamp : null,
      email: config.email ? config.email : null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    }
  }

  async login(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.authService.login(this.clientId, SCOPE, (result) => {
        if (result.ok) {
          const email = this.authService.idToken ? (decodeJwtEmail(this.authService.idToken) ?? '') : ''
          saveSyncConfig({ ...loadSyncConfig(), email })
          resolve()
        } else {
          reject(result.error)
        }
      })
    })
  }

  async logout(): Promise<void> {
    this.authService.logout()
    clearSyncConfig()
  }

  /**
   * The access token is kept in memory only (never persisted, see #51). After a page reload
   * `authService.accessToken` is always null, so a previous session (marked by a saved `email`)
   * is restored here via a silent GIS refresh instead of being read back from storage.
   */
  private async ensureFreshToken(): Promise<void> {
    const config = loadSyncConfig()
    if (this.authService.accessToken === null && !config.email) {
      throw { kind: 'NotAuthenticated', message: 'Not authenticated' } satisfies SyncException
    }
    const expiresAt = this.authService.expiresAt
    const needsRefresh = this.authService.accessToken === null || expiresAt === null || Date.now() >= expiresAt - 60_000
    if (!needsRefresh) return
    try {
      await this.refreshTokenSilently()
    } catch {
      this.authService.accessToken = null
      this.authService.expiresAt = null
      clearSyncConfig()
      throw { kind: 'NotAuthenticated', message: 'Not authenticated' } satisfies SyncException
    }
  }

  private async refreshTokenSilently(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.authService.refreshToken(this.clientId, SCOPE, (result) => {
        if (result.ok) {
          resolve()
        } else {
          reject(result.error)
        }
      })
    })
  }

  private serializeSyncData(data: SyncData): string {
    return JSON.stringify({
      version: FILE_VERSION,
      lastModified: data.lastModified,
      players: data.players,
      gameTypes: data.gameTypes,
      matches: data.matches,
    })
  }

  private deserializeSyncData(json: string): SyncData {
    const file = SyncFileSchema.parse(JSON.parse(json))
    return {
      players: file.players,
      gameTypes: file.gameTypes,
      matches: file.matches,
      lastModified: file.lastModified,
    }
  }
}
