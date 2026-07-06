package com.scoreo.infrastructure.google

import com.scoreo.domain.port.SyncException

/**
 * Déclarations external pour Google Identity Services (Token Model).
 * GIS est chargé via <script> dans index.html, accessible via window.google.
 * Hiérarchie réelle: window.google.accounts.oauth2
 */
private external interface TokenClient {
    fun requestAccessToken(overrideConfig: dynamic = definedExternally)
}

private external interface TokenClientConfig {
    var clientId: String
    var scope: String
    var callback: (TokenResponse) -> Unit
    var error_callback: (TokenError) -> Unit
}

private external interface TokenResponse {
    val access_token: String
    val expires_in: Int
    val token_type: String
    val id_token: String?
}

private external interface TokenError {
    val type: String
    val message: String?
}

private external interface RevocationResponse {
    val successful: Boolean
    val message: String?
}

private external interface GoogleOAuth2 {
    fun initTokenClient(config: TokenClientConfig): TokenClient
    fun revoke(token: String, callback: (RevocationResponse) -> Unit)
}

private external interface GoogleAccountsNamespace {
    val oauth2: GoogleOAuth2
}

private external interface GoogleAccounts {
    val accounts: GoogleAccountsNamespace
}

private external val google: GoogleAccounts?

/**
 * Service OAuth Google — Token Model.
 * Gère login via popup OAuth, refresh silencieux et logout.
 * Le refresh token n'est jamais exposé (géré en interne par GIS).
 */
class GoogleAuthService {
    var accessToken: String? = null
    var expiresAt: Long? = null
    var idToken: String? = null

    private val c: dynamic get() = js("console")

    init {
        c.log("[GoogleAuthService] init — google.accounts.oauth2 available:", typeofGoogleOAuth2())
    }

    private fun typeofGoogleOAuth2(): String {
        val g = js("typeof google !== 'undefined' && google !== null && google.accounts !== undefined && google.accounts.oauth2 !== undefined")
        return if (g == true) "yes" else "no"
    }

    private fun withGis(
        retries: Int = 10,
        delayMs: Int = 200,
        onResult: (Result<String>) -> Unit,
        block: (GoogleOAuth2) -> Unit,
    ) {
        val g = google?.accounts?.oauth2
        if (g != null) {
            c.log("[GoogleAuthService] GIS ready on attempt", 11 - retries)
            block(g)
        } else if (retries > 0) {
            if (retries == 10) {
                val hasGoogle = js("typeof google") as? String
                val hasAccounts = js("typeof google !== 'undefined' && google !== null && google.accounts !== undefined")
                c.log("[GoogleAuthService] GIS not ready — typeof google:", hasGoogle, "google.accounts exists:", hasAccounts)
            }
            val setTimeout: (dynamic, Int) -> Int = js("setTimeout")
            setTimeout({ withGis(retries - 1, delayMs, onResult, block) }, delayMs)
        } else {
            c.error("[GoogleAuthService] GIS not loaded after 10 retries (2s).")
            onResult(Result.failure(SyncException.NotAuthenticated("Google Identity Services not loaded")))
        }
    }

    fun login(clientId: String, scope: String, onResult: (Result<String>) -> Unit) {
        c.log("[GoogleAuthService] login() — clientId:", clientId)
        withGis(onResult = onResult) { g ->
            c.log("[GoogleAuthService] initTokenClient...")
            val client = g.initTokenClient(object : TokenClientConfig {
                override var clientId = clientId
                override var scope = scope
                override var callback: (TokenResponse) -> Unit = { response ->
                    c.log("[GoogleAuthService] Token callback OK — expires_in:", response.expires_in)
                    accessToken = response.access_token
                    expiresAt = currentTimeMillis() + (response.expires_in * 1000L)
                    idToken = response.id_token
                    onResult(Result.success(response.access_token))
                }
                override var error_callback: (TokenError) -> Unit = { error ->
                    c.error("[GoogleAuthService] Token error — type:", error.type, "message:", error.message)
                    val msg = error.message ?: "Authentication failed (${error.type})"
                    onResult(Result.failure(SyncException.NotAuthenticated(msg)))
                }
            })
            c.log("[GoogleAuthService] requestAccessToken()")
            client.requestAccessToken()
        }
    }

    fun refreshToken(clientId: String, scope: String, onResult: (Result<String>) -> Unit) {
        c.log("[GoogleAuthService] refreshToken() silent")
        withGis(onResult = onResult) { g ->
            val client = g.initTokenClient(object : TokenClientConfig {
                override var clientId = clientId
                override var scope = scope
                override var callback: (TokenResponse) -> Unit = { response ->
                    c.log("[GoogleAuthService] Refresh callback OK")
                    accessToken = response.access_token
                    expiresAt = currentTimeMillis() + (response.expires_in * 1000L)
                    idToken = response.id_token
                    onResult(Result.success(response.access_token))
                }
                override var error_callback: (TokenError) -> Unit = { error ->
                    c.error("[GoogleAuthService] Refresh error — type:", error.type, "message:", error.message)
                    val msg = error.message ?: "Authentication failed (${error.type})"
                    onResult(Result.failure(SyncException.NotAuthenticated(msg)))
                }
            })
            client.requestAccessToken(object {
                val prompt: String = ""
            })
        }
    }

    fun logout() {
        c.log("[GoogleAuthService] logout()")
        accessToken?.let { token ->
            google?.accounts?.oauth2?.revoke(token) {}
        }
        accessToken = null
        expiresAt = null
    }

    private fun currentTimeMillis(): Long =
        (js("Date.now()") as Double).toLong()
}
