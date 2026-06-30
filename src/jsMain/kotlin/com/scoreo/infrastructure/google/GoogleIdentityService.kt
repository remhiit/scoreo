package com.scoreo.infrastructure.google

import com.scoreo.domain.port.SyncException

/**
 * Déclarations external pour Google Identity Services (Token Model).
 * GIS est chargé via <script> dans index.html, accessible via window.google.
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

private external interface GoogleAccounts {
    val oauth2: GoogleOAuth2
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

    fun login(clientId: String, scope: String, onResult: (Result<String>) -> Unit) {
        val g = google?.oauth2 ?: run {
            onResult(Result.failure(SyncException.NotAuthenticated))
            return
        }
        val client = g.initTokenClient(object : TokenClientConfig {
            override var clientId = clientId
            override var scope = scope
            override var callback: (TokenResponse) -> Unit = { response ->
                accessToken = response.access_token
                expiresAt = currentTimeMillis() + (response.expires_in * 1000L)
                idToken = response.id_token
                onResult(Result.success(response.access_token))
            }
            override var error_callback: (TokenError) -> Unit = {
                onResult(Result.failure(SyncException.NotAuthenticated))
            }
        })
        client.requestAccessToken()
    }

    fun refreshToken(clientId: String, scope: String, onResult: (Result<String>) -> Unit) {
        val g = google?.oauth2 ?: run {
            onResult(Result.failure(SyncException.NotAuthenticated))
            return
        }
        val client = g.initTokenClient(object : TokenClientConfig {
            override var clientId = clientId
            override var scope = scope
            override var callback: (TokenResponse) -> Unit = { response ->
                accessToken = response.access_token
                expiresAt = currentTimeMillis() + (response.expires_in * 1000L)
                idToken = response.id_token
                onResult(Result.success(response.access_token))
            }
            override var error_callback: (TokenError) -> Unit = {
                onResult(Result.failure(SyncException.NotAuthenticated))
            }
        })
        client.requestAccessToken(object {
            val prompt: String = ""
        })
    }

    fun logout() {
        accessToken?.let { token ->
            google?.oauth2?.revoke(token) {}
        }
        accessToken = null
        expiresAt = null
    }

    private fun currentTimeMillis(): Long =
        (js("Date.now()") as Double).toLong()
}
