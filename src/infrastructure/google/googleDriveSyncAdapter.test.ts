import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MockGoogleDriveClient } from '../testing/mockGoogleDriveClient'
import { GoogleAuthService } from './googleAuthService'
import { GoogleDriveSyncAdapter } from './googleDriveSyncAdapter'
import { clearSyncConfig, loadSyncConfig, saveSyncConfig, type SyncConfig } from './syncConfig'

function config(overrides: Partial<SyncConfig> = {}): SyncConfig {
  return { lastSyncTimestamp: 0, lastSyncFileId: '', ...overrides }
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
    it('push silently refreshes the token via GIS, with no persisted signal required', async () => {
      installMockGis((respond) => respond({ ok: true, token: 'refreshed-token' }))
      const authService = new GoogleAuthService()
      const driveClient = new MockGoogleDriveClient()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', driveClient)

      await adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700000000 })

      expect(authService.accessToken).toBe('refreshed-token')
    })

    it('push throws NotAuthenticated and clears the session when the silent refresh fails', async () => {
      installMockGis((respond) => respond({ ok: false }))
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await expect(
        adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700000000 }),
      ).rejects.toMatchObject({ kind: 'NotAuthenticated' })

      expect(authService.accessToken).toBeNull()
    })
  })

  describe('getStatus', () => {
    it('connected false when there is no in-memory token and the silent GIS refresh fails', async () => {
      installMockGis((respond) => respond({ ok: false }))
      const adapter = new GoogleDriveSyncAdapter(new GoogleAuthService(), 'test-client-id')

      const status = await adapter.getStatus()

      expect(status.connected).toBe(false)
    })

    it('connected true when a token is already set in memory (no GIS call needed)', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      authService.expiresAt = Date.now() + 3_600_000
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      expect((await adapter.getStatus()).connected).toBe(true)
    })

    it('connected true after an F5 (no in-memory token) when the silent GIS refresh succeeds', async () => {
      installMockGis((respond) => respond({ ok: true, token: 'restored-token' }))
      const adapter = new GoogleDriveSyncAdapter(new GoogleAuthService(), 'test-client-id')

      expect((await adapter.getStatus()).connected).toBe(true)
    })
  })

  describe('constructor', () => {
    it('never reads an access token from SyncConfig (kept in memory only)', () => {
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
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect(authService.accessToken).toBeNull()
    })

    it('clears SyncConfig', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      saveSyncConfig(config({ lastSyncTimestamp: 1700000000, lastSyncFileId: 'file-1' }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect(loadSyncConfig()).toEqual(config())
    })

    it('makes getStatus return disconnected', async () => {
      installMockGis((respond) => respond({ ok: false }))
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect((await adapter.getStatus()).connected).toBe(false)
    })
  })

  describe('SyncConfig persistence', () => {
    it('roundtrip preserves all fields (no accessToken/expiresAt — kept in memory only)', () => {
      const original = config({
        lastSyncTimestamp: 1_700_000_000_000,
        lastSyncFileId: 'file-xyz',
      })

      saveSyncConfig(original)

      expect(loadSyncConfig()).toEqual(original)
    })

    it('loadSyncConfig returns defaults when localStorage is empty', () => {
      expect(loadSyncConfig()).toEqual(config())
    })

    it('purges legacy accessToken/expiresAt/email fields from a pre-fix localStorage entry', () => {
      localStorage.setItem(
        'scoreo_sync_config',
        JSON.stringify({ accessToken: 'leaked-token', expiresAt: 1_800_000_000_000, email: 'user@example.com' }),
      )

      const config1 = loadSyncConfig()

      expect(config1).toEqual(config())
      const raw = localStorage.getItem('scoreo_sync_config')
      expect(raw).not.toContain('leaked-token')
      expect(raw).not.toContain('accessToken')
      expect(raw).not.toContain('email')
    })

    it('purges a lingering email field from an entry already past the #51 fix (accessToken/expiresAt already gone)', () => {
      localStorage.setItem(
        'scoreo_sync_config',
        JSON.stringify({ email: 'user@example.com', lastSyncTimestamp: 1_700_000_000_000, lastSyncFileId: 'file-xyz' }),
      )

      const config1 = loadSyncConfig()

      expect(config1).toEqual(config({ lastSyncTimestamp: 1_700_000_000_000, lastSyncFileId: 'file-xyz' }))
      const raw = localStorage.getItem('scoreo_sync_config')
      expect(raw).not.toContain('email')
    })

    it('does not persist an access token across adapter instances', () => {
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

    it('throws NotAuthenticated when no token and the silent refresh fails', async () => {
      installMockGis((respond) => respond({ ok: false }))
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

    it('throws NotAuthenticated when no token and the silent refresh fails', async () => {
      installMockGis((respond) => respond({ ok: false }))
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
    it('resolves and stores the access token in memory only (never persisted to SyncConfig)', async () => {
      installMockGis((respond) => respond({ ok: true, token: 'new-token-from-login' }))
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.login()

      expect(authService.accessToken).toBe('new-token-from-login')
      const saved = loadSyncConfig()
      expect(saved).not.toHaveProperty('accessToken')
      expect(saved).not.toHaveProperty('email')
    })

    it('makes getStatus report connected after a successful login', async () => {
      installMockGis((respond) => respond({ ok: true, token: 'new-token-from-login' }))
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.login()

      expect((await adapter.getStatus()).connected).toBe(true)
    })

    it('rejects with the underlying error when the GIS login fails', async () => {
      installMockGis((respond) => respond({ ok: false }))
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await expect(adapter.login()).rejects.toMatchObject({ kind: 'NotAuthenticated' })
    })
  })
})
