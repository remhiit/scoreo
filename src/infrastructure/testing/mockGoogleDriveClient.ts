import type { DriveClient } from '../google/googleDriveClient'
import { err, ok, type Result } from '../../domain/result'
import type { SyncException } from '../../domain/port/cloudSyncRepository'

/** Hand-written fake of GoogleDriveClient (structural DriveClient), no HTTP involved. */
export class MockGoogleDriveClient implements DriveClient {
  fileToFind: string | undefined
  fileContent = ''
  shouldFailUpsert = false
  shouldFailRead = false
  lastUpsertedFileName = ''
  lastUpsertedContent = ''

  async findFile(): Promise<Result<string | undefined, SyncException>> {
    if (this.shouldFailUpsert) return err({ kind: 'ApiError', code: 500, message: 'Find failed' })
    return ok(this.fileToFind)
  }

  async createFile(fileName: string, content: string): Promise<Result<string, SyncException>> {
    if (this.shouldFailUpsert) return err({ kind: 'ApiError', code: 500, message: 'Create failed' })
    this.lastUpsertedFileName = fileName
    this.lastUpsertedContent = content
    return ok('mock-file-id')
  }

  async updateFile(fileId: string, content: string): Promise<Result<string, SyncException>> {
    if (this.shouldFailUpsert) return err({ kind: 'ApiError', code: 500, message: 'Update failed' })
    this.lastUpsertedContent = content
    return ok(fileId)
  }

  async readFile(): Promise<Result<string, SyncException>> {
    if (this.shouldFailRead) return err({ kind: 'ApiError', code: 500, message: 'Read failed' })
    return ok(this.fileContent)
  }

  async upsertFile(fileName: string, content: string): Promise<Result<string, SyncException>> {
    if (this.shouldFailUpsert) return err({ kind: 'ApiError', code: 500, message: 'Upsert failed' })
    const findResult = await this.findFile()
    if (findResult.ok && findResult.value) {
      return this.updateFile(findResult.value, content)
    }
    return this.createFile(fileName, content)
  }
}
