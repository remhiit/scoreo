import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SyncException } from '../../domain/port/cloudSyncRepository'
import type { Result } from '../../domain/result'
import { GoogleAuthService } from './googleAuthService'

/**
 * The Kotlin jsTest suite for GoogleAuthService mostly asserts `true` after calling
 * login/refreshToken, because GIS is never actually loaded in that test environment —
 * it only exercises the "not loaded" retry path. Here we mock `window.google.accounts.oauth2`
 * so the tests can assert real behavior (token storage, error propagation, silent refresh)
 * instead of tautologies.
 */
function installMockGis(overrides: {
  onRequestAccessToken?: (config: {
    client_id: string
    scope: string
    hint?: string
    callback: (r: { access_token: string; expires_in: number; token_type: string }) => void
    error_callback: (e: { type: string; message?: string }) => void
  }, overrideConfig?: { prompt?: string }) => void
  onRevoke?: (token: string) => void
} = {}) {
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => ({
          requestAccessToken: (overrideConfig) => overrides.onRequestAccessToken?.(config, overrideConfig),
        }),
        revoke: (token, callback) => {
          overrides.onRevoke?.(token)
          callback()
        },
      },
    },
  }
}

/**
 * `login` resolves the account email through the OIDC userinfo endpoint before invoking its
 * callback — GIS's token model never returns an id_token, so this is the only way to learn
 * which account was authorized (and hence what to pass back as `hint` on a silent refresh).
 */
function mockUserinfo(response: { ok: true; email: string } | { ok: false }) {
  const fetchMock = vi.fn(async () =>
    response.ok
      ? ({ ok: true, json: async () => ({ email: response.email }) } as Response)
      : ({ ok: false, status: 401, json: async () => ({}) } as Response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Resolves once GIS has called back, so tests can await login's asynchronous email lookup. */
function loginAsync(service: GoogleAuthService, clientId = 'client-id', scope = 'openid email') {
  return new Promise<Result<string, SyncException>>((resolve) => service.login(clientId, scope, resolve))
}

describe('GoogleAuthService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockUserinfo({ ok: true, email: 'player@example.com' })
  })

  afterEach(() => {
    delete window.google
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('initializes with null tokens', () => {
    const service = new GoogleAuthService()
    expect(service.accessToken).toBeNull()
    expect(service.expiresAt).toBeNull()
  })

  it('login stores accessToken and expiresAt on success', async () => {
    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'token-abc', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    const result = await loginAsync(service)

    expect(service.accessToken).toBe('token-abc')
    expect(service.expiresAt).toBeGreaterThan(Date.now())
    expect(result).toEqual({ ok: true, value: 'token-abc' })
  })

  it('login resolves the account email from the userinfo endpoint', async () => {
    const fetchMock = mockUserinfo({ ok: true, email: 'player@example.com' })
    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'token-abc', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    await loginAsync(service)

    expect(service.accountEmail).toBe('player@example.com')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openidconnect.googleapis.com/v1/userinfo',
      expect.objectContaining({ headers: { Authorization: 'Bearer token-abc' } }),
    )
  })

  it('login still succeeds when the userinfo lookup fails, leaving accountEmail null', async () => {
    mockUserinfo({ ok: false })
    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'token-abc', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    const result = await loginAsync(service)

    expect(result).toEqual({ ok: true, value: 'token-abc' })
    expect(service.accessToken).toBe('token-abc')
    expect(service.accountEmail).toBeNull()
  })

  it('login still succeeds when the userinfo call rejects outright', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'token-abc', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    const result = await loginAsync(service)

    expect(result).toEqual({ ok: true, value: 'token-abc' })
    expect(service.accountEmail).toBeNull()
  })

  it('login calls initTokenClient with a client_id key, matching the real GIS API contract', () => {
    let capturedConfig: Record<string, unknown> | undefined
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: (config) => {
            capturedConfig = config as unknown as Record<string, unknown>
            return { requestAccessToken: () => {} }
          },
          revoke: (_token, callback) => callback(),
        },
      },
    }
    const service = new GoogleAuthService()

    service.login('client-id-value', 'openid email', vi.fn())

    expect(capturedConfig?.client_id).toBe('client-id-value')
    expect(capturedConfig?.clientId).toBeUndefined()
  })

  it('login surfaces NotAuthenticated on GIS error_callback', () => {
    installMockGis({
      onRequestAccessToken: (config) => {
        config.error_callback({ type: 'popup_closed', message: 'User closed the popup' })
      },
    })
    const service = new GoogleAuthService()
    const onResult = vi.fn()

    service.login('client-id', 'openid email', onResult)

    expect(onResult).toHaveBeenCalledWith({
      ok: false,
      error: { kind: 'NotAuthenticated', message: 'User closed the popup' },
    })
  })

  it('login retries until GIS becomes available', async () => {
    const service = new GoogleAuthService()
    const onResult = vi.fn()
    const result = new Promise((resolve) => service.login('client-id', 'openid email', (r) => { onResult(r); resolve(r) }))

    expect(onResult).not.toHaveBeenCalled()

    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'late-token', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    vi.advanceTimersByTime(200)

    await expect(result).resolves.toEqual({ ok: true, value: 'late-token' })
  })

  it('login fails with NotAuthenticated after exhausting retries when GIS never loads', () => {
    const service = new GoogleAuthService()
    const onResult = vi.fn()

    service.login('client-id', 'openid email', onResult)
    vi.advanceTimersByTime(10 * 200)

    expect(onResult).toHaveBeenCalledWith({
      ok: false,
      error: { kind: 'NotAuthenticated', message: 'Google Identity Services not loaded' },
    })
  })

  it('refreshToken uses a silent prompt', () => {
    let capturedOverride: { prompt?: string } | undefined
    installMockGis({
      onRequestAccessToken: (config, overrideConfig) => {
        capturedOverride = overrideConfig
        config.callback({ access_token: 'refreshed-token', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    service.refreshToken('client-id', 'openid email', vi.fn())

    expect(capturedOverride).toEqual({ prompt: '' })
    expect(service.accessToken).toBe('refreshed-token')
  })

  it('refreshToken passes the hint to initTokenClient so GIS picks the account without asking', () => {
    let capturedConfig: { hint?: string } | undefined
    let capturedOverride: { prompt?: string } | undefined
    installMockGis({
      onRequestAccessToken: (config, overrideConfig) => {
        capturedConfig = config
        capturedOverride = overrideConfig
        config.callback({ access_token: 'refreshed-token', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    service.refreshToken('client-id', 'openid email', vi.fn(), 'player@example.com')

    expect(capturedConfig?.hint).toBe('player@example.com')
    expect(capturedOverride).toEqual({ prompt: '' })
  })

  it('refreshToken omits hint entirely when none is known', () => {
    let capturedConfig: Record<string, unknown> | undefined
    installMockGis({
      onRequestAccessToken: (config) => {
        capturedConfig = config as unknown as Record<string, unknown>
        config.callback({ access_token: 'refreshed-token', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    service.refreshToken('client-id', 'openid email', vi.fn())

    expect(capturedConfig).not.toHaveProperty('hint')
  })

  it('refreshToken does not re-query userinfo (the email is already persisted)', () => {
    const fetchMock = mockUserinfo({ ok: true, email: 'player@example.com' })
    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'refreshed-token', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    const service = new GoogleAuthService()

    service.refreshToken('client-id', 'openid email', vi.fn(), 'player@example.com')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refreshToken propagates errors', () => {
    installMockGis({
      onRequestAccessToken: (config) => {
        config.error_callback({ type: 'server_error' })
      },
    })
    const service = new GoogleAuthService()
    const onResult = vi.fn()

    service.refreshToken('client-id', 'openid email', onResult)

    expect(onResult).toHaveBeenCalledWith({
      ok: false,
      error: { kind: 'NotAuthenticated', message: 'Authentication failed (server_error)' },
    })
  })

  it('logout revokes the token and clears state', () => {
    let revokedToken: string | undefined
    installMockGis({ onRevoke: (token) => (revokedToken = token) })
    const service = new GoogleAuthService()
    service.accessToken = 'token-to-revoke'
    service.expiresAt = Date.now() + 1000

    service.logout()

    expect(revokedToken).toBe('token-to-revoke')
    expect(service.accessToken).toBeNull()
    expect(service.expiresAt).toBeNull()
    expect(service.accountEmail).toBeNull()
  })

  it('logout is safe when there is no token', () => {
    installMockGis()
    const service = new GoogleAuthService()

    expect(() => service.logout()).not.toThrow()
    expect(service.accessToken).toBeNull()
  })

  it('service instances are independent', () => {
    const service1 = new GoogleAuthService()
    const service2 = new GoogleAuthService()

    service1.accessToken = 'token-1'
    service2.accessToken = 'token-2'

    expect(service1.accessToken).toBe('token-1')
    expect(service2.accessToken).toBe('token-2')
  })
})
