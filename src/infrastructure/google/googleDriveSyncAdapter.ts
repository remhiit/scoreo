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

    const config = loadSyncConfig()
    if (config.accessToken) {
      this.authService.accessToken = config.accessToken
      this.authService.expiresAt = config.expiresAt > 0 ? config.expiresAt : null
    }
  }

  async push(data: SyncData): Promise<void> {
    this.ensureAuthenticated()
    await this.refreshTokenIfNeeded()
    const json = this.serializeSyncData(data)
    const result = await this.driveClient.upsertFile(FILE_NAME, json)
    if (!result.ok) throw result.error
    saveSyncConfig({ ...loadSyncConfig(), lastSyncTimestamp: data.lastModified })
  }

  async pull(): Promise<SyncData> {
    this.ensureAuthenticated()
    await this.refreshTokenIfNeeded()
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
      connected: this.authService.accessToken !== null,
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
          saveSyncConfig({
            ...loadSyncConfig(),
            accessToken: result.value,
            email,
            expiresAt: this.authService.expiresAt ?? 0,
          })
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

  private ensureAuthenticated(): void {
    if (this.authService.accessToken === null) {
      throw { kind: 'NotAuthenticated', message: 'Not authenticated' } satisfies SyncException
    }
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    const expiresAt = this.authService.expiresAt
    if (expiresAt === null) return
    if (Date.now() < expiresAt - 60_000) return
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
          saveSyncConfig({
            ...loadSyncConfig(),
            accessToken: result.value,
            expiresAt: this.authService.expiresAt ?? 0,
          })
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
