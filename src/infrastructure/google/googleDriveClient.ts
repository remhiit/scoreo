import type { SyncException } from '../../domain/port/cloudSyncRepository'
import { err, ok, type Result } from '../../domain/result'

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files'
/** Drive v3 requires this dedicated /upload/ prefix for any request that carries file content (multipart or media uploadType). */
const DRIVE_UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3/files'

interface FileInfo {
  id: string
  name: string
}

interface FilesResponse {
  files?: FileInfo[]
}

interface FileResponse {
  id?: string
}

function isSyncException(value: unknown): value is SyncException {
  return typeof value === 'object' && value !== null && 'kind' in value
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Structural shape of GoogleDriveClient's public API, so tests can substitute a fake without extending the real class. */
export interface DriveClient {
  findFile(fileName: string): Promise<Result<string | undefined, SyncException>>
  createFile(fileName: string, content: string, mimeType?: string): Promise<Result<string, SyncException>>
  updateFile(fileId: string, content: string, mimeType?: string): Promise<Result<string, SyncException>>
  readFile(fileId: string): Promise<Result<string, SyncException>>
  upsertFile(fileName: string, content: string, mimeType?: string): Promise<Result<string, SyncException>>
}

export class GoogleDriveClient implements DriveClient {
  constructor(private readonly getToken: () => Promise<string | undefined>) {}

  async findFile(fileName: string): Promise<Result<string | undefined, SyncException>> {
    const token = await this.getToken()
    if (!token) return err({ kind: 'NotAuthenticated', message: 'Not authenticated' })
    const escapedName = fileName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const url = `${DRIVE_API_BASE}?spaces=appDataFolder&q=name='${escapedName}'&fields=files(id,name)`
    return this.retryWithBackoff(async () => {
      try {
        const body = await this.asyncGet(url, token)
        const json = JSON.parse(body) as FilesResponse
        return ok(json.files?.[0]?.id)
      } catch (e) {
        return err(isSyncException(e) ? e : { kind: 'NetworkError' })
      }
    })
  }

  async createFile(
    fileName: string,
    content: string,
    mimeType = 'application/json',
  ): Promise<Result<string, SyncException>> {
    const token = await this.getToken()
    if (!token) return err({ kind: 'NotAuthenticated', message: 'Not authenticated' })
    const metadata = `{ "name": "${fileName}", "parents": ["appDataFolder"], "mimeType": "${mimeType}" }`
    const boundary = 'scoreo_boundary'
    const body = this.buildMultipartBody(boundary, metadata, content, mimeType)
    const url = `${DRIVE_UPLOAD_API_BASE}?spaces=appDataFolder&uploadType=multipart`
    return this.retryWithBackoff(async () => {
      try {
        const responseBody = await this.asyncPost(url, token, body, `multipart/related; boundary=${boundary}`)
        const json = JSON.parse(responseBody) as FileResponse
        if (!json.id) throw new Error('No id in response')
        return ok(json.id)
      } catch (e) {
        return err(isSyncException(e) ? e : { kind: 'NetworkError' })
      }
    })
  }

  async updateFile(
    fileId: string,
    content: string,
    mimeType = 'application/json',
  ): Promise<Result<string, SyncException>> {
    const token = await this.getToken()
    if (!token) return err({ kind: 'NotAuthenticated', message: 'Not authenticated' })
    const url = `${DRIVE_UPLOAD_API_BASE}/${fileId}?spaces=appDataFolder&uploadType=media`
    return this.retryWithBackoff(async () => {
      try {
        await this.asyncPatch(url, token, content, mimeType)
        return ok(fileId)
      } catch (e) {
        return err(isSyncException(e) ? e : { kind: 'NetworkError' })
      }
    })
  }

  async readFile(fileId: string): Promise<Result<string, SyncException>> {
    const token = await this.getToken()
    if (!token) return err({ kind: 'NotAuthenticated', message: 'Not authenticated' })
    const url = `${DRIVE_API_BASE}/${fileId}?alt=media`
    return this.retryWithBackoff(async () => {
      try {
        const body = await this.asyncGet(url, token)
        return ok(body)
      } catch (e) {
        return err(isSyncException(e) ? e : { kind: 'NetworkError' })
      }
    })
  }

  async upsertFile(
    fileName: string,
    content: string,
    mimeType = 'application/json',
  ): Promise<Result<string, SyncException>> {
    const findResult = await this.findFile(fileName)
    if (!findResult.ok) return err(findResult.error)
    return findResult.value ? this.updateFile(findResult.value, content, mimeType) : this.createFile(fileName, content, mimeType)
  }

  private async retryWithBackoff<T>(
    block: () => Promise<Result<T, SyncException>>,
    maxRetries = 3,
    initialDelayMs = 1_000,
  ): Promise<Result<T, SyncException>> {
    let delayMs = initialDelayMs
    let attempt = 0
    for (;;) {
      const result = await block()
      if (result.ok || attempt >= maxRetries) return result
      if (result.error.kind === 'RateLimited' || result.error.kind === 'NetworkError') {
        await sleep(delayMs)
        delayMs *= 2
        attempt++
      } else {
        return result
      }
    }
  }

  private async asyncGet(url: string, token: string): Promise<string> {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await response.text()
    return this.checkResponse(response.status, body)
  }

  private async asyncPost(url: string, token: string, body: string, contentType: string): Promise<string> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
      body,
    })
    const responseBody = await response.text()
    return this.checkResponse(response.status, responseBody)
  }

  private async asyncPatch(url: string, token: string, body: string, contentType: string): Promise<string> {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': contentType },
      body,
    })
    const responseBody = await response.text()
    return this.checkResponse(response.status, responseBody)
  }

  private checkResponse(status: number, body: string): string {
    if (status >= 200 && status <= 299) return body
    if (status === 401) throw { kind: 'NotAuthenticated', message: 'Not authenticated' } satisfies SyncException
    if (status === 429) throw { kind: 'RateLimited' } satisfies SyncException
    if (status >= 500 && status <= 599) throw { kind: 'NetworkError' } satisfies SyncException
    throw { kind: 'ApiError', code: status, message: body } satisfies SyncException
  }

  private buildMultipartBody(boundary: string, metadata: string, content: string, mimeType: string): string {
    return `--${boundary}
Content-Type: application/json; charset=UTF-8

${metadata}
--${boundary}
Content-Type: ${mimeType}

${content}
--${boundary}--`
  }
}
