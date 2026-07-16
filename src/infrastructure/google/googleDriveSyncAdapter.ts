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

  /**
   * Connected state is decided purely by the presence of an access token — in memory, or
   * obtained here via a silent GIS refresh. After a page reload `authService.accessToken` is
   * always null (never persisted, see #51), so this attempt is what lets a still-valid Google
   * session survive an F5 instead of falling back to "Connect with Google" every time.
   */
  async getStatus(): Promise<SyncStatus> {
    const config = loadSyncConfig()
    try {
      await this.ensureFreshToken()
    } catch {
      // No active Google session (or it could not be silently refreshed) — stays disconnected.
    }
    return {
      connected: this.authService.accessToken !== null,
      lastSync: config.lastSyncTimestamp > 0 ? config.lastSyncTimestamp : null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    }
  }

  async login(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.authService.login(this.clientId, SCOPE, (result) => {
        if (result.ok) {
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
   * Always attempts a silent GIS refresh when there's no fresh in-memory token, regardless of
   * any persisted signal — there is none to depend on (see getStatus doc above).
   */
  private async ensureFreshToken(): Promise<void> {
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
