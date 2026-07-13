import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MockGoogleDriveClient } from '../testing/mockGoogleDriveClient'
import { GoogleAuthService } from './googleAuthService'
import { GoogleDriveSyncAdapter } from './googleDriveSyncAdapter'
import { clearSyncConfig, loadSyncConfig, saveSyncConfig, type SyncConfig } from './syncConfig'

function config(overrides: Partial<SyncConfig> = {}): SyncConfig {
  return { email: '', lastSyncTimestamp: 0, lastSyncFileId: '', ...overrides }
}

function installMockGis(onRequestAccessToken: (respond: (result: { ok: true; token: string } | { ok: false }) => void) => void) {
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (tokenConfig) => ({
          requestAccessToken: () =>
            onRequestAccessToken((result) => {
              if (result.ok) {
                tokenConfig.callback({ access_token: result.token, expires_in: 3600, token_type: 'Bearer' })
              } else {
                tokenConfig.error_callback({ type: 'consent_required', message: 'Silent refresh failed' })
              }
            }),
        }),
        revoke: (_token, callback) => callback(),
      },
    },
  }
}

describe('GoogleDriveSyncAdapter', () => {
  beforeEach(() => {
    clearSyncConfig()
  })

  afterEach(() => {
    clearSyncConfig()
    delete window.google
  })

  describe('session restore after reload (no in-memory token)', () => {
    it('push silently refreshes the token when a prior session email is saved', async () => {
      saveSyncConfig(config({ email: 'user@example.com' }))
      installMockGis((respond) => respond({ ok: true, token: 'refreshed-token' }))
      const authService = new GoogleAuthService()
      const driveClient = new MockGoogleDriveClient()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', driveClient)

      await adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700000000 })

      expect(authService.accessToken).toBe('refreshed-token')
      expect(loadSyncConfig().email).toBe('user@example.com')
    })

    it('push throws NotAuthenticated and clears the session when the silent refresh fails', async () => {
      saveSyncConfig(config({ email: 'user@example.com' }))
      installMockGis((respond) => respond({ ok: false }))
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await expect(
        adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700000000 }),
      ).rejects.toMatchObject({ kind: 'NotAuthenticated' })

      expect(authService.accessToken).toBeNull()
      expect(loadSyncConfig().email).toBe('')
    })
  })

  describe('getStatus', () => {
    it('connected false when no token and no prior session', async () => {
      const adapter = new GoogleDriveSyncAdapter(new GoogleAuthService(), 'test-client-id')
      const status = await adapter.getStatus()
      expect(status.connected).toBe(false)
      expect(status.email).toBeNull()
    })

    it('connected true when token is set in memory', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')
      expect((await adapter.getStatus()).connected).toBe(true)
    })

    it('connected true after reload (no in-memory token) when a prior session email is saved', async () => {
      saveSyncConfig(config({ email: 'user@example.com' }))
      const adapter = new GoogleDriveSyncAdapter(new GoogleAuthService(), 'test-client-id')
      expect((await adapter.getStatus()).connected).toBe(true)
    })

    it('returns email from SyncConfig', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      saveSyncConfig(config({ email: 'user@example.com' }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')
      expect((await adapter.getStatus()).email).toBe('user@example.com')
    })

    it('returns null email when SyncConfig email is blank', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')
      expect((await adapter.getStatus()).email).toBeNull()
    })
  })

  describe('constructor', () => {
    it('never reads an access token from SyncConfig (kept in memory only)', () => {
      saveSyncConfig(config({ email: 'u@example.com' }))
      const authService = new GoogleAuthService()

      new GoogleDriveSyncAdapter(authService, 'test-client-id')

      expect(authService.accessToken).toBeNull()
      expect(authService.expiresAt).toBeNull()
    })
  })

  describe('logout', () => {
    it('clears accessToken', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      saveSyncConfig(config({ email: 'u@example.com' }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect(authService.accessToken).toBeNull()
    })

    it('clears SyncConfig', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      saveSyncConfig(config({ email: 'u@example.com' }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      const loaded = loadSyncConfig()
      expect(loaded.email).toBe('')
    })

    it('makes getStatus return disconnected', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect((await adapter.getStatus()).connected).toBe(false)
    })

    it('clears both token and SyncConfig, and getStatus reflects it', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      saveSyncConfig(config({ email: 'user@example.com', lastSyncTimestamp: 1700000000 }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect(authService.accessToken).toBeNull()
      const loaded = loadSyncConfig()
      expect(loaded.email).toBe('')
      const status = await adapter.getStatus()
      expect(status.connected).toBe(false)
      expect(status.email).toBeNull()
    })
  })

  describe('SyncConfig persistence', () => {
    it('roundtrip preserves all fields (no accessToken/expiresAt — kept in memory only)', () => {
      const original = config({
        email: 'test@scoreo.app',
        lastSyncTimestamp: 1_700_000_000_000,
        lastSyncFileId: 'file-xyz',
      })

      saveSyncConfig(original)

      expect(loadSyncConfig()).toEqual(original)
    })

    it('loadSyncConfig returns defaults when localStorage is empty', () => {
      expect(loadSyncConfig()).toEqual(config())
    })

    it('purges legacy accessToken/expiresAt fields from a pre-fix localStorage entry', () => {
      localStorage.setItem(
        'scoreo_sync_config',
        JSON.stringify({ accessToken: 'leaked-token', expiresAt: 1_800_000_000_000, email: 'user@example.com' }),
      )

      const config1 = loadSyncConfig()

      expect(config1).toEqual({ email: 'user@example.com', lastSyncTimestamp: 0, lastSyncFileId: '' })
      const raw = localStorage.getItem('scoreo_sync_config')
      expect(raw).not.toContain('leaked-token')
      expect(raw).not.toContain('accessToken')
    })

    it('does not persist an access token across adapter instances', () => {
      saveSyncConfig(config({ email: 'user1@example.com' }))
      const authService1 = new GoogleAuthService()
      new GoogleDriveSyncAdapter(authService1, 'test-client-id')

      const authService2 = new GoogleAuthService()
      new GoogleDriveSyncAdapter(authService2, 'test-client-id')

      expect(authService1.accessToken).toBeNull()
      expect(authService2.accessToken).toBeNull()
    })
  })

  describe('push', () => {
    it('succeeds and stores lastSyncTimestamp when authenticated', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      authService.expiresAt = Date.now() + 3_600_000
      const driveClient = new MockGoogleDriveClient()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', driveClient)

      await adapter.push({
        players: [
          { id: 'p1', name: 'Alice', active: true },
          { id: 'p2', name: 'Bob', active: true },
        ],
        gameTypes: [
          {
            id: 'g1',
            name: 'Tennis',
            winCondition: 'HIGHEST_SCORE',
            tieBreakRule: 'NONE',
            tieBreakCondition: 'HIGHEST_SCORE',
            tieBreakLabel: null,
            active: true,
          },
        ],
        matches: [
          {
            id: 'm1',
            date: 1700000000,
            gameTypeId: 'g1',
            playerScores: [
              { playerId: 'p1', score: 10 },
              { playerId: 'p2', score: 5 },
            ],
            manualWinners: [],
            secondaryPlayerScores: [],
          },
        ],
        lastModified: 1700000000,
      })

      expect(loadSyncConfig().lastSyncTimestamp).toBe(1700000000)
      expect(driveClient.lastUpsertedContent).toContain('Alice')
    })

    it('throws NotAuthenticated when no token and no prior session', async () => {
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await expect(
        adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700000000 }),
      ).rejects.toMatchObject({ kind: 'NotAuthenticated' })

      expect(loadSyncConfig().lastSyncTimestamp).toBe(0)
    })

    it('preserves other SyncConfig fields when updating the timestamp', async () => {
      saveSyncConfig(
        config({
          email: 'user@example.com',
          lastSyncTimestamp: 1700000000,
          lastSyncFileId: 'file-1',
        }),
      )
      const authService = new GoogleAuthService()
      authService.accessToken = 'token1'
      authService.expiresAt = Date.now() + 3_600_000
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700600000 })

      const updated = loadSyncConfig()
      expect(updated.email).toBe('user@example.com')
      expect(updated.lastSyncTimestamp).toBe(1700600000)
      expect(updated.lastSyncFileId).toBe('file-1')
    })
  })

  describe('pull', () => {
    it('returns empty data when the file is not found on the cloud', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      authService.expiresAt = Date.now() + 3_600_000
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      const result = await adapter.pull()

      expect(result).toEqual({ players: [], gameTypes: [], matches: [], lastModified: 0 })
    })

    it('throws NotAuthenticated when no token and no prior session', async () => {
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await expect(adapter.pull()).rejects.toMatchObject({ kind: 'NotAuthenticated' })
    })

    it('cloud wins: pull returns cloud data verbatim with no local merge', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      authService.expiresAt = Date.now() + 3_600_000
      const driveClient = new MockGoogleDriveClient()
      driveClient.fileToFind = 'existing-file-id'
      driveClient.fileContent = JSON.stringify({
        version: 1,
        lastModified: 5000,
        players: [{ id: 'p1', name: 'Alice', active: true }],
        gameTypes: [],
        matches: [],
      })
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', driveClient)

      const result = await adapter.pull()

      expect(result.players).toEqual([{ id: 'p1', name: 'Alice', active: true }])
      expect(result.lastModified).toBe(5000)
    })
  })

  describe('login', () => {
    it('makes status connected and exposes the saved email', async () => {
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      authService.accessToken = 'new-token-from-login'
      authService.expiresAt = 1800000000
      saveSyncConfig(config({ email: 'user@example.com' }))

      const status = await adapter.getStatus()
      expect(status.connected).toBe(true)
      expect(status.email).toBe('user@example.com')
    })

    it('saves only the email to SyncConfig, never the token', () => {
      const authService = new GoogleAuthService()
      new GoogleDriveSyncAdapter(authService, 'test-client-id')

      authService.accessToken = 'new-token'
      authService.expiresAt = 1900000000
      saveSyncConfig(config({ email: 'user@example.com' }))

      const saved = loadSyncConfig()
      expect(saved.email).toBe('user@example.com')
      expect(saved).not.toHaveProperty('accessToken')
      expect(saved).not.toHaveProperty('expiresAt')
    })
  })
})
