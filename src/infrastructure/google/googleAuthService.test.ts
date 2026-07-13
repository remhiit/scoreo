import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
    callback: (r: { access_token: string; expires_in: number; token_type: string; id_token?: string }) => void
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

describe('GoogleAuthService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    delete window.google
    vi.useRealTimers()
  })

  it('initializes with null tokens', () => {
    const service = new GoogleAuthService()
    expect(service.accessToken).toBeNull()
    expect(service.expiresAt).toBeNull()
    expect(service.idToken).toBeNull()
  })

  it('login stores accessToken, expiresAt and idToken on success', () => {
    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'token-abc', expires_in: 3600, token_type: 'Bearer', id_token: 'jwt-xyz' })
      },
    })
    const service = new GoogleAuthService()
    const onResult = vi.fn()

    service.login('client-id', 'openid email', onResult)

    expect(service.accessToken).toBe('token-abc')
    expect(service.idToken).toBe('jwt-xyz')
    expect(service.expiresAt).toBeGreaterThan(Date.now())
    expect(onResult).toHaveBeenCalledWith({ ok: true, value: 'token-abc' })
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

  it('login retries until GIS becomes available', () => {
    const service = new GoogleAuthService()
    const onResult = vi.fn()

    service.login('client-id', 'openid email', onResult)
    expect(onResult).not.toHaveBeenCalled()

    installMockGis({
      onRequestAccessToken: (config) => {
        config.callback({ access_token: 'late-token', expires_in: 3600, token_type: 'Bearer' })
      },
    })
    vi.advanceTimersByTime(200)

    expect(onResult).toHaveBeenCalledWith({ ok: true, value: 'late-token' })
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
