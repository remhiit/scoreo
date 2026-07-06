package com.scoreo.infrastructure.google

/**
 * Mock GoogleDriveClient for integration testing
 *
 * Provides complete mock implementation of GoogleDriveClient behavior
 * for testing adapters without real HTTP calls.
 *
 * Used by GoogleDriveSyncAdapterTest for testing data synchronization.
 */
internal class MockGoogleDriveClient(
    private val getToken: suspend () -> String? = { "mock-token" }
) {
    var fileToFind: String? = null
    var fileContent: String = ""
    var shouldFailUpsert: Boolean = false
    var shouldFailRead: Boolean = false
    var lastUpsertedFileName: String = ""
    var lastUpsertedContent: String = ""
    var lastSyncTimestamp: Long = 0L

    suspend fun findFile(fileName: String): Result<String?> {
        val token = getToken() ?: return Result.failure(Exception("Not authenticated"))
        return if (shouldFailUpsert) {
            Result.failure(Exception("Find failed"))
        } else {
            Result.success(fileToFind)
        }
    }

    suspend fun createFile(fileName: String, content: String, mimeType: String = "application/json"): Result<String> {
        val token = getToken() ?: return Result.failure(Exception("Not authenticated"))
        return if (shouldFailUpsert) {
            Result.failure(Exception("Create failed"))
        } else {
            lastUpsertedFileName = fileName
            lastUpsertedContent = content
            Result.success("mock-file-id")
        }
    }

    suspend fun updateFile(fileId: String, content: String, mimeType: String = "application/json"): Result<String> {
        val token = getToken() ?: return Result.failure(Exception("Not authenticated"))
        return if (shouldFailUpsert) {
            Result.failure(Exception("Update failed"))
        } else {
            lastUpsertedContent = content
            Result.success(fileId)
        }
    }

    suspend fun readFile(fileId: String): Result<String> {
        val token = getToken() ?: return Result.failure(Exception("Not authenticated"))
        return if (shouldFailRead) {
            Result.failure(Exception("Read failed"))
        } else {
            Result.success(fileContent)
        }
    }

    suspend fun upsertFile(fileName: String, content: String, mimeType: String = "application/json"): Result<String> {
        val token = getToken() ?: return Result.failure(Exception("Not authenticated"))
        if (shouldFailUpsert) {
            return Result.failure(Exception("Upsert failed"))
        }
        
        // Simulate find then create or update
        val findResult = findFile(fileName)
        return if (findResult.isSuccess && findResult.getOrNull() != null) {
            updateFile(findResult.getOrNull()!!, content, mimeType)
        } else {
            createFile(fileName, content, mimeType)
        }
    }
}
