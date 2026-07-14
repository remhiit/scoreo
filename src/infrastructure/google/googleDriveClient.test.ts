import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GoogleDriveClient } from './googleDriveClient'

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status })
}

function textResponse(status: number, body: string): Response {
  return new Response(body, { status })
}

describe('GoogleDriveClient', () => {
  const getToken = async () => 'token-123'

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('findFile returns the id when the file exists', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { files: [{ id: 'file-1', name: 'scoreo-data.json' }] }))
    const client = new GoogleDriveClient(getToken)

    const result = await client.findFile('scoreo-data.json')

    expect(result).toEqual({ ok: true, value: 'file-1' })
  })

  it('findFile returns undefined when no file matches', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { files: [] }))
    const client = new GoogleDriveClient(getToken)

    const result = await client.findFile('scoreo-data.json')

    expect(result).toEqual({ ok: true, value: undefined })
  })

  it('returns NotAuthenticated when there is no token', async () => {
    const client = new GoogleDriveClient(async () => undefined)

    const result = await client.findFile('scoreo-data.json')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('NotAuthenticated')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('maps HTTP 401 to NotAuthenticated', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(textResponse(401, 'unauthorized'))
    const client = new GoogleDriveClient(getToken)

    const result = await client.findFile('scoreo-data.json')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('NotAuthenticated')
  })

  it('maps HTTP 500 to NetworkError after exhausting retries', async () => {
    vi.useFakeTimers()
    vi.mocked(fetch).mockImplementation(async () => textResponse(500, 'server error'))
    const client = new GoogleDriveClient(getToken)

    const promise = client.findFile('scoreo-data.json')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('NetworkError')
    expect(fetch).toHaveBeenCalledTimes(4) // 1 initial + 3 retries
  })

  it('maps HTTP 429 to RateLimited after exhausting retries, with exponential backoff', async () => {
    vi.useFakeTimers()
    vi.mocked(fetch).mockImplementation(async () => textResponse(429, 'rate limited'))
    const client = new GoogleDriveClient(getToken)

    const promise = client.findFile('scoreo-data.json')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.kind).toBe('RateLimited')
    expect(fetch).toHaveBeenCalledTimes(4)
  })

  it('maps other HTTP error codes to ApiError without retrying', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(textResponse(400, 'bad request'))
    const client = new GoogleDriveClient(getToken)

    const result = await client.findFile('scoreo-data.json')

    expect(result.ok).toBe(false)
    if (!result.ok && result.error.kind === 'ApiError') {
      expect(result.error.code).toBe(400)
      expect(result.error.message).toBe('bad request')
    } else {
      throw new Error('expected ApiError')
    }
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('recovers after a transient failure within the retry budget', async () => {
    vi.useFakeTimers()
    vi.mocked(fetch)
      .mockResolvedValueOnce(textResponse(500, 'server error'))
      .mockResolvedValueOnce(jsonResponse(200, { files: [{ id: 'file-1', name: 'x' }] }))
    const client = new GoogleDriveClient(getToken)

    const promise = client.findFile('scoreo-data.json')
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ ok: true, value: 'file-1' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('createFile posts multipart body and returns the new id', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { id: 'new-file-id' }))
    const client = new GoogleDriveClient(getToken)

    const result = await client.createFile('scoreo-data.json', '{"players":[]}')

    expect(result).toEqual({ ok: true, value: 'new-file-id' })
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\?/)
    expect(options?.method).toBe('POST')
    expect(String(options?.body)).toContain('{"players":[]}')
  })

  it('updateFile patches the given file id', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(textResponse(200, ''))
    const client = new GoogleDriveClient(getToken)

    const result = await client.updateFile('file-1', '{"players":[]}')

    expect(result).toEqual({ ok: true, value: 'file-1' })
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/www\.googleapis\.com\/upload\/drive\/v3\/files\/file-1\?/)
    expect(options?.method).toBe('PATCH')
  })

  it('findFile queries the standard metadata endpoint (not the upload endpoint)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(200, { files: [] }))
    const client = new GoogleDriveClient(getToken)

    await client.findFile('scoreo-data.json')

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\?/)
  })

  it('readFile reads from the standard metadata endpoint (not the upload endpoint)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(textResponse(200, '{}'))
    const client = new GoogleDriveClient(getToken)

    await client.readFile('file-1')

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toMatch(/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/file-1\?/)
  })

  it('readFile returns the raw body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(textResponse(200, '{"players":[]}'))
    const client = new GoogleDriveClient(getToken)

    const result = await client.readFile('file-1')

    expect(result).toEqual({ ok: true, value: '{"players":[]}' })
  })

  it('upsertFile updates when the file already exists', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { files: [{ id: 'file-1', name: 'scoreo-data.json' }] }))
      .mockResolvedValueOnce(textResponse(200, ''))
    const client = new GoogleDriveClient(getToken)

    const result = await client.upsertFile('scoreo-data.json', '{}')

    expect(result).toEqual({ ok: true, value: 'file-1' })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('upsertFile creates when no file matches', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse(200, { files: [] }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 'new-file-id' }))
    const client = new GoogleDriveClient(getToken)

    const result = await client.upsertFile('scoreo-data.json', '{}')

    expect(result).toEqual({ ok: true, value: 'new-file-id' })
  })
})
