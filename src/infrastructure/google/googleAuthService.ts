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
  /** Email of the account to use. Without it GIS cannot resolve a silent refresh to a single account. */
  hint?: string
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

/** OIDC userinfo endpoint — the only way to learn the authorized account under the GIS token model. */
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

interface UserInfoResponse {
  email?: string
}

/**
 * OAuth Google service — GIS Token Model. Handles login via popup, silent refresh,
 * and logout. The refresh token itself is never exposed (managed internally by GIS).
 */
export class GoogleAuthService {
  accessToken: string | null = null
  expiresAt: number | null = null
  /**
   * Email of the account authorized by the last successful `login`. Null until a login
   * succeeds, or when the userinfo lookup failed — callers persist it (see SyncConfig) and
   * feed it back as `hint` on refresh.
   */
  accountEmail: string | null = null

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

  /**
   * Interactive login. Resolves the account email through userinfo before invoking `onResult`,
   * so that by the time a caller sees the success it can persist the email in one step — GIS's
   * token model returns no id_token, so the token response alone never says which account it is.
   */
  login(clientId: string, scope: string, onResult: LoginResult): void {
    this.withGis(onResult, (g) => {
      const client = g.initTokenClient({
        client_id: clientId,
        scope,
        callback: (response) => {
          this.accessToken = response.access_token
          this.expiresAt = Date.now() + response.expires_in * 1000
          void this.fetchAccountEmail(response.access_token).then((email) => {
            this.accountEmail = email
            onResult(ok(response.access_token))
          })
        },
        error_callback: (error) => {
          const msg = error.message ?? `Authentication failed (${error.type})`
          onResult(err({ kind: 'NotAuthenticated', message: msg }))
        },
      })
      client.requestAccessToken()
    })
  }

  /**
   * Silent refresh. `prompt: ''` alone is not enough to avoid UI: without `hint`, GIS cannot
   * tell which account to renew as soon as several Google sessions exist in the browser, and
   * falls back to the account chooser (issue #305). Passing the email of the account authorized
   * at login is what makes the refresh actually silent.
   */
  refreshToken(clientId: string, scope: string, onResult: LoginResult, hint?: string): void {
    this.withGis(onResult, (g) => {
      const client = g.initTokenClient({
        client_id: clientId,
        scope,
        ...(hint ? { hint } : {}),
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
    this.accountEmail = null
  }

  /**
   * Never throws: a failed lookup only costs the `hint`, it must not fail an otherwise valid login.
   * It is logged rather than swallowed silently — a failure here is invisible in the UI (the login
   * still succeeds) but brings back the account chooser on every refresh, so it needs to leave a
   * trace. `USERINFO_ENDPOINT`'s origin must stay listed in `index.html`'s `connect-src`, otherwise
   * the CSP rejects this call in a real browser while jsdom-based tests keep passing.
   */
  private async fetchAccountEmail(accessToken: string): Promise<string | null> {
    try {
      const response = await fetch(USERINFO_ENDPOINT, { headers: { Authorization: `Bearer ${accessToken}` } })
      if (!response.ok) {
        console.warn(`[GoogleAuthService] userinfo lookup failed (${response.status}) — silent refresh will run without hint.`)
        return null
      }
      const json = (await response.json()) as UserInfoResponse
      return json.email ?? null
    } catch (e) {
      console.warn('[GoogleAuthService] userinfo lookup failed — silent refresh will run without hint.', e)
      return null
    }
  }
}
