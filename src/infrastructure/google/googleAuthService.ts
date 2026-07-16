import type { SyncException } from '../../domain/port/cloudSyncRepository'
import { err, ok, type Result } from '../../domain/result'

interface GisTokenResponse {
  access_token: string
  expires_in: number
  token_type: string
}

interface GisTokenError {
  type: string
  message?: string
}

interface GisTokenClientConfig {
  client_id: string
  scope: string
  callback: (response: GisTokenResponse) => void
  error_callback: (error: GisTokenError) => void
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void
}

interface GisOAuth2 {
  initTokenClient: (config: GisTokenClientConfig) => GisTokenClient
  revoke: (token: string, callback: () => void) => void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GisOAuth2
      }
    }
  }
}

type LoginResult = (result: Result<string, SyncException>) => void

/**
 * OAuth Google service — GIS Token Model. Handles login via popup, silent refresh,
 * and logout. The refresh token itself is never exposed (managed internally by GIS).
 */
export class GoogleAuthService {
  accessToken: string | null = null
  expiresAt: number | null = null

  private withGis(onResult: LoginResult, block: (g: GisOAuth2) => void, retries = 10, delayMs = 200): void {
    const g = typeof window !== 'undefined' ? window.google?.accounts?.oauth2 : undefined
    if (g) {
      block(g)
      return
    }
    if (retries > 0) {
      setTimeout(() => this.withGis(onResult, block, retries - 1, delayMs), delayMs)
      return
    }
    console.error('[GoogleAuthService] GIS not loaded after 10 retries (2s).')
    onResult(err({ kind: 'NotAuthenticated', message: 'Google Identity Services not loaded' }))
  }

  login(clientId: string, scope: string, onResult: LoginResult): void {
    this.withGis(onResult, (g) => {
      const client = g.initTokenClient({
        client_id: clientId,
        scope,
        callback: (response) => {
          this.accessToken = response.access_token
          this.expiresAt = Date.now() + response.expires_in * 1000
          onResult(ok(response.access_token))
        },
        error_callback: (error) => {
          const msg = error.message ?? `Authentication failed (${error.type})`
          onResult(err({ kind: 'NotAuthenticated', message: msg }))
        },
      })
      client.requestAccessToken()
    })
  }

  refreshToken(clientId: string, scope: string, onResult: LoginResult): void {
    this.withGis(onResult, (g) => {
      const client = g.initTokenClient({
        client_id: clientId,
        scope,
        callback: (response) => {
          this.accessToken = response.access_token
          this.expiresAt = Date.now() + response.expires_in * 1000
          onResult(ok(response.access_token))
        },
        error_callback: (error) => {
          const msg = error.message ?? `Authentication failed (${error.type})`
          onResult(err({ kind: 'NotAuthenticated', message: msg }))
        },
      })
      client.requestAccessToken({ prompt: '' })
    })
  }

  logout(): void {
    if (this.accessToken) {
      window.google?.accounts?.oauth2?.revoke(this.accessToken, () => {})
    }
    this.accessToken = null
    this.expiresAt = null
  }
}
