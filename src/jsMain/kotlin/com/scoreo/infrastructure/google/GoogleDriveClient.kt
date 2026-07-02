package com.scoreo.infrastructure.google

import com.scoreo.domain.port.SyncException
import kotlinx.browser.window
import kotlinx.coroutines.await
import kotlinx.coroutines.delay

private const val DRIVE_API_BASE = "https://www.googleapis.com/drive/v3/files"

class GoogleDriveClient(
    private val getToken: suspend () -> String?,
) {
    suspend fun findFile(fileName: String): Result<String?> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val escapedName = fileName.replace("\\", "\\\\").replace("'", "\\'")
        val url = "$DRIVE_API_BASE?spaces=appDataFolder&q=name='$escapedName'&fields=files(id,name)"
        return retryWithBackoff {
            try {
                val body = asyncGet(url, token)
                val json = JSON.parse(body) as FilesResponse
                Result.success(json.files?.firstOrNull()?.id)
            } catch (e: SyncException) {
                Result.failure(e)
            } catch (e: Exception) {
                Result.failure(SyncException.NetworkError)
            }
        }
    }

    suspend fun createFile(fileName: String, content: String, mimeType: String = "application/json"): Result<String> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val metadata = """{ "name": "$fileName", "parents": ["appDataFolder"], "mimeType": "$mimeType" }"""
        val boundary = "scoreo_boundary"
        val body = buildMultipartBody(boundary, metadata, content, mimeType)
        val url = "$DRIVE_API_BASE?spaces=appDataFolder&uploadType=multipart"
        return retryWithBackoff {
            try {
                val responseBody = asyncPost(url, token, body, "multipart/related; boundary=$boundary")
                val json = JSON.parse(responseBody) as FileResponse
                Result.success(json.id ?: error("No id in response"))
            } catch (e: SyncException) {
                Result.failure(e)
            } catch (e: Exception) {
                Result.failure(SyncException.NetworkError)
            }
        }
    }

    suspend fun updateFile(fileId: String, content: String, mimeType: String = "application/json"): Result<String> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val url = "$DRIVE_API_BASE/$fileId?spaces=appDataFolder&uploadType=media"
        return retryWithBackoff {
            try {
                asyncPatch(url, token, content, mimeType)
                Result.success(fileId)
            } catch (e: SyncException) {
                Result.failure(e)
            } catch (e: Exception) {
                Result.failure(SyncException.NetworkError)
            }
        }
    }

    suspend fun readFile(fileId: String): Result<String> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val url = "$DRIVE_API_BASE/$fileId?alt=media"
        return retryWithBackoff {
            try {
                val body = asyncGet(url, token)
                Result.success(body)
            } catch (e: SyncException) {
                Result.failure(e)
            } catch (e: Exception) {
                Result.failure(SyncException.NetworkError)
            }
        }
    }

    suspend fun upsertFile(fileName: String, content: String, mimeType: String = "application/json"): Result<String> {
        val findResult = findFile(fileName)
        return findResult.fold(
            onSuccess = { fileId ->
                if (fileId != null) updateFile(fileId, content, mimeType)
                else createFile(fileName, content, mimeType)
            },
            onFailure = { throwable -> Result.failure(throwable) },
        )
    }

    // ── Retry ──

    private suspend fun <T> retryWithBackoff(
        maxRetries: Int = 3,
        initialDelayMs: Long = 1_000L,
        block: suspend () -> Result<T>,
    ): Result<T> {
        var delayMs = initialDelayMs
        var attempt = 0
        while (true) {
            val result = block()
            val failure = result.exceptionOrNull()
            if (failure == null || attempt >= maxRetries) return result
            when (failure) {
                is SyncException.RateLimited,
                is SyncException.NetworkError -> {
                    delay(delayMs)
                    delayMs *= 2
                    attempt++
                }
                else -> return result
            }
        }
    }

    // ── Private helpers ──

    private suspend fun asyncGet(url: String, token: String): String {
        val headers: dynamic = js("({})")
        headers["Authorization"] = "Bearer $token"
        val options: dynamic = js("({})")
        options.method = "GET"
        options.headers = headers
        val response = window.fetch(url, options).await()
        val body = response.text().await()
        return checkResponse(response.status.toInt(), body)
    }

    private suspend fun asyncPost(url: String, token: String, body: String, contentType: String): String {
        val headers: dynamic = js("({})")
        headers["Authorization"] = "Bearer $token"
        headers["Content-Type"] = contentType
        val options: dynamic = js("({})")
        options.method = "POST"
        options.headers = headers
        options.body = body
        val response = window.fetch(url, options).await()
        val responseBody = response.text().await()
        return checkResponse(response.status.toInt(), responseBody)
    }

    private suspend fun asyncPatch(url: String, token: String, body: String, contentType: String): String {
        val headers: dynamic = js("({})")
        headers["Authorization"] = "Bearer $token"
        headers["Content-Type"] = contentType
        val options: dynamic = js("({})")
        options.method = "PATCH"
        options.headers = headers
        options.body = body
        val response = window.fetch(url, options).await()
        val responseBody = response.text().await()
        return checkResponse(response.status.toInt(), responseBody)
    }

    private fun checkResponse(status: Int, body: String): String {
        return when {
            status in 200..299 -> body
            status == 401 -> throw SyncException.NotAuthenticated
            status == 429 -> throw SyncException.RateLimited
            status in 500..599 -> throw SyncException.NetworkError
            else -> throw SyncException.ApiError(status, body)
        }
    }

    private fun buildMultipartBody(boundary: String, metadata: String, content: String, mimeType: String): String {
        return """--$boundary
Content-Type: application/json; charset=UTF-8

$metadata
--$boundary
Content-Type: $mimeType

$content
--$boundary--"""
    }
}

// ── External JS types ──

private external interface FilesResponse {
    val files: Array<FileInfo>?
}

private external interface FileInfo {
    val id: String
    val name: String
}

private external interface FileResponse {
    val id: String?
}

private external object JSON {
    fun parse(text: String): dynamic
}

@Suppress("UNUSED")
private inline fun <reified T> JSON.parse(text: String): T =
    (this.parse(text) as T)
