import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MockGoogleDriveClient } from '../testing/mockGoogleDriveClient'
import { GoogleAuthService } from './googleAuthService'
import { GoogleDriveSyncAdapter } from './googleDriveSyncAdapter'
import { clearSyncConfig, loadSyncConfig, saveSyncConfig, type SyncConfig } from './syncConfig'

function config(overrides: Partial<SyncConfig> = {}): SyncConfig {
  return { accessToken: '', email: '', lastSyncTimestamp: 0, lastSyncFileId: '', expiresAt: 0, ...overrides }
}

describe('GoogleDriveSyncAdapter', () => {
  beforeEach(() => {
    clearSyncConfig()
  })

  afterEach(() => {
    clearSyncConfig()
  })

  describe('getStatus', () => {
    it('connected false when no token', async () => {
      const adapter = new GoogleDriveSyncAdapter(new GoogleAuthService(), 'test-client-id')
      const status = await adapter.getStatus()
      expect(status.connected).toBe(false)
      expect(status.email).toBeNull()
    })

    it('connected true when token is set', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')
      expect((await adapter.getStatus()).connected).toBe(true)
    })

    it('returns email from SyncConfig', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      saveSyncConfig(config({ accessToken: 'token', email: 'user@example.com' }))
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

  describe('constructor (init restoration)', () => {
    it('restores token from SyncConfig on creation', () => {
      saveSyncConfig(config({ accessToken: 'saved-token', email: 'u@example.com', expiresAt: Number.MAX_SAFE_INTEGER }))
      const authService = new GoogleAuthService()

      new GoogleDriveSyncAdapter(authService, 'test-client-id')

      expect(authService.accessToken).toBe('saved-token')
      expect(authService.expiresAt).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('does not set token when SyncConfig is empty', () => {
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
      saveSyncConfig(config({ accessToken: 'token', email: 'u@example.com' }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect(authService.accessToken).toBeNull()
    })

    it('clears SyncConfig', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'token'
      saveSyncConfig(config({ accessToken: 'token', email: 'u@example.com' }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      const loaded = loadSyncConfig()
      expect(loaded.accessToken).toBe('')
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
      saveSyncConfig(config({ accessToken: 'token', email: 'user@example.com', lastSyncTimestamp: 1700000000 }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id')

      await adapter.logout()

      expect(authService.accessToken).toBeNull()
      const loaded = loadSyncConfig()
      expect(loaded.accessToken).toBe('')
      expect(loaded.email).toBe('')
      const status = await adapter.getStatus()
      expect(status.connected).toBe(false)
      expect(status.email).toBeNull()
    })
  })

  describe('SyncConfig persistence', () => {
    it('roundtrip preserves all fields', () => {
      const original = config({
        accessToken: 'token-abc',
        email: 'test@scoreo.app',
        lastSyncTimestamp: 1_700_000_000_000,
        expiresAt: 1_800_000_000_000,
        lastSyncFileId: 'file-xyz',
      })

      saveSyncConfig(original)

      expect(loadSyncConfig()).toEqual(original)
    })

    it('loadSyncConfig returns defaults when localStorage is empty', () => {
      expect(loadSyncConfig()).toEqual(config())
    })

    it('persists across adapter instances', () => {
      saveSyncConfig(config({ accessToken: 'token1', email: 'user1@example.com' }))
      const authService1 = new GoogleAuthService()
      new GoogleDriveSyncAdapter(authService1, 'test-client-id')

      const authService2 = new GoogleAuthService()
      new GoogleDriveSyncAdapter(authService2, 'test-client-id')

      expect(authService1.accessToken).toBe('token1')
      expect(authService2.accessToken).toBe('token1')
    })
  })

  describe('push', () => {
    it('succeeds and stores lastSyncTimestamp when authenticated', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      saveSyncConfig(config({ accessToken: 'valid-token' }))
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

    it('throws NotAuthenticated when no token, and does not update the timestamp', async () => {
      const authService = new GoogleAuthService()
      saveSyncConfig(config({ lastSyncTimestamp: 0 }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await expect(
        adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700000000 }),
      ).rejects.toMatchObject({ kind: 'NotAuthenticated' })

      expect(loadSyncConfig().lastSyncTimestamp).toBe(0)
    })

    it('preserves other SyncConfig fields when updating the timestamp', async () => {
      saveSyncConfig(
        config({
          accessToken: 'token1',
          email: 'user@example.com',
          lastSyncTimestamp: 1700000000,
          lastSyncFileId: 'file-1',
          // A realistic future timestamp: refreshTokenIfNeeded compares against Date.now(),
          // so a small fixed epoch constant here would look already-expired and trigger a
          // real (unmocked) token refresh attempt.
          expiresAt: Date.now() + 3_600_000,
        }),
      )
      const authService = new GoogleAuthService()
      authService.accessToken = 'token1'
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await adapter.push({ players: [], gameTypes: [], matches: [], lastModified: 1700600000 })

      const updated = loadSyncConfig()
      expect(updated.accessToken).toBe('token1')
      expect(updated.email).toBe('user@example.com')
      expect(updated.lastSyncTimestamp).toBe(1700600000)
      expect(updated.lastSyncFileId).toBe('file-1')
      expect(updated.expiresAt).toBeGreaterThan(Date.now())
    })
  })

  describe('pull', () => {
    it('returns empty data when the file is not found on the cloud', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
      saveSyncConfig(config({ accessToken: 'valid-token' }))
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      const result = await adapter.pull()

      expect(result).toEqual({ players: [], gameTypes: [], matches: [], lastModified: 0 })
    })

    it('throws NotAuthenticated when no token', async () => {
      const authService = new GoogleAuthService()
      const adapter = new GoogleDriveSyncAdapter(authService, 'test-client-id', new MockGoogleDriveClient())

      await expect(adapter.pull()).rejects.toMatchObject({ kind: 'NotAuthenticated' })
    })

    it('cloud wins: pull returns cloud data verbatim with no local merge', async () => {
      const authService = new GoogleAuthService()
      authService.accessToken = 'valid-token'
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
      saveSyncConfig(config({ accessToken: authService.accessToken, email: 'user@example.com', expiresAt: authService.expiresAt }))

      const status = await adapter.getStatus()
      expect(status.connected).toBe(true)
      expect(status.email).toBe('user@example.com')
    })

    it('saves token and email to SyncConfig', () => {
      const authService = new GoogleAuthService()
      new GoogleDriveSyncAdapter(authService, 'test-client-id')

      authService.accessToken = 'new-token'
      authService.expiresAt = 1900000000
      saveSyncConfig(config({ accessToken: authService.accessToken, email: 'user@example.com', expiresAt: authService.expiresAt }))

      const saved = loadSyncConfig()
      expect(saved.accessToken).toBe('new-token')
      expect(saved.email).toBe('user@example.com')
      expect(saved.expiresAt).toBe(1900000000)
    })
  })
})
