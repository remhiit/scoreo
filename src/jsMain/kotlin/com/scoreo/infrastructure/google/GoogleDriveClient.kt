package com.scoreo.infrastructure.google

import com.scoreo.domain.port.SyncException

private const val DRIVE_API_BASE = "https://www.googleapis.com/drive/v3/files"

class GoogleDriveClient(
    private val getToken: () -> String?,
) {
    fun findFile(fileName: String): Result<String?> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val url = "$DRIVE_API_BASE?spaces=appDataFolder&q=name='$fileName'&fields=files(id,name)"
        return try {
            val response = syncRequest("GET", url, token)
            val body = handleResponse(response)
            val json = JSON.parse(body) as FilesResponse
            Result.success(json.files?.firstOrNull()?.id)
        } catch (e: SyncException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(SyncException.NetworkError)
        }
    }

    fun createFile(fileName: String, content: String, mimeType: String = "application/json"): Result<String> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val metadata = """{ "name": "$fileName", "parents": ["appDataFolder"], "mimeType": "$mimeType" }"""
        val boundary = "scoreo_boundary"
        val body = buildMultipartBody(boundary, metadata, content, mimeType)
        val url = "$DRIVE_API_BASE?spaces=appDataFolder&uploadType=multipart"
        return try {
            val response = syncUploadRequest("POST", url, token, body, boundary)
            val responseBody = handleResponse(response)
            val json = JSON.parse(responseBody) as FileResponse
            Result.success(json.id ?: error("No id in response"))
        } catch (e: SyncException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(SyncException.NetworkError)
        }
    }

    fun updateFile(fileId: String, content: String, mimeType: String = "application/json"): Result<String> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val url = "$DRIVE_API_BASE/$fileId?spaces=appDataFolder&uploadType=media"
        return try {
            val response = syncUploadRequest("PATCH", url, token, content, mimeType)
            handleResponse(response)
            Result.success(fileId)
        } catch (e: SyncException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(SyncException.NetworkError)
        }
    }

    fun readFile(fileId: String): Result<String> {
        val token = getToken() ?: return Result.failure(SyncException.NotAuthenticated)
        val url = "$DRIVE_API_BASE/$fileId?alt=media"
        return try {
            val response = syncRequest("GET", url, token)
            val body = handleResponse(response)
            Result.success(body)
        } catch (e: SyncException) {
            Result.failure(e)
        } catch (e: Exception) {
            Result.failure(SyncException.NetworkError)
        }
    }

    fun upsertFile(fileName: String, content: String, mimeType: String = "application/json"): Result<String> {
        val findResult = findFile(fileName)
        return findResult.fold(
            onSuccess = { fileId ->
                if (fileId != null) updateFile(fileId, content, mimeType)
                else createFile(fileName, content, mimeType)
            },
            onFailure = { Result.failure(it) },
        )
    }

    // ── Private helpers ──

    private fun syncRequest(method: String, url: String, token: String): XMLHttpRequestResponse {
        val req = XMLHttpRequest()
        req.open(method, url, false)
        req.setRequestHeader("Authorization", "Bearer $token")
        req.send()
        return XMLHttpRequestResponse(req.status, req.responseText)
    }

    private fun syncUploadRequest(method: String, url: String, token: String, body: String, contentType: String): XMLHttpRequestResponse {
        val req = XMLHttpRequest()
        req.open(method, url, false)
        req.setRequestHeader("Authorization", "Bearer $token")
        req.setRequestHeader("Content-Type", contentType)
        req.send(body)
        return XMLHttpRequestResponse(req.status, req.responseText)
    }

    private fun handleResponse(response: XMLHttpRequestResponse): String {
        val status = response.status
        val body = response.body
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

private external interface XMLHttpRequest {
    fun open(method: String, url: String, async: Boolean)
    fun setRequestHeader(name: String, value: String)
    fun send(body: String? = definedExternally)
    val status: Int
    val responseText: String
}

private fun XMLHttpRequest(): XMLHttpRequest =
    js("new XMLHttpRequest()") as XMLHttpRequest

private data class XMLHttpRequestResponse(
    val status: Int,
    val body: String,
)

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
