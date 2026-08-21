import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const SW_SOURCE = readFileSync(join(__dirname, 'sw.js'), 'utf-8')
const ORIGIN = 'https://example.test'

function makeResponse(ok: boolean) {
  const response = {
    ok,
    clone: vi.fn(() => ({ ...response, clone: response.clone })),
  }
  return response
}

function makeRequest(path: string, { method = 'GET', mode = 'no-cors' } = {}) {
  return { url: `${ORIGIN}${path}`, method, mode }
}

function createEnv({
  cached = undefined as unknown,
  networkResponse = makeResponse(true),
  networkError = undefined as unknown,
  cacheKeys = [] as string[],
} = {}) {
  const listeners: Record<string, (event: unknown) => void> = {}
  const cache = {
    addAll: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(undefined),
  }
  const caches = {
    open: vi.fn().mockResolvedValue(cache),
    match: vi.fn().mockResolvedValue(cached),
    keys: vi.fn().mockResolvedValue(cacheKeys),
    delete: vi.fn().mockResolvedValue(true),
  }
  const fetchImpl = vi.fn(() => (networkError ? Promise.reject(networkError) : Promise.resolve(networkResponse)))
  const self = {
    addEventListener: (type: string, handler: (event: unknown) => void) => {
      listeners[type] = handler
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn() },
    location: { origin: ORIGIN },
  }
  new Function('self', 'caches', 'fetch', SW_SOURCE)(self, caches, fetchImpl)
  return { listeners, caches, cache, fetch: fetchImpl, self }
}

async function dispatchActivate(env: ReturnType<typeof createEnv>) {
  let waitUntilPromise: Promise<unknown> | undefined
  env.listeners.activate({
    waitUntil: (p: Promise<unknown>) => {
      waitUntilPromise = p
    },
  })
  await waitUntilPromise
}

function dispatchFetch(env: ReturnType<typeof createEnv>, request: ReturnType<typeof makeRequest>) {
  let respondWithPromise: Promise<unknown> | undefined
  let respondWithCalled = false
  const event = {
    request,
    respondWith: (p: Promise<unknown>) => {
      respondWithCalled = true
      respondWithPromise = p
    },
  }
  env.listeners.fetch(event)
  return { respondWithCalled, result: respondWithPromise }
}

describe('public/sw.js activate handler', () => {
  it('keeps the caches owned by the sibling PWAs sharing the origin', async () => {
    const env = createEnv({ cacheKeys: ['scoreo-v3', 'tori-valley-v1', 'ksabord-v1'] })
    await dispatchActivate(env)
    expect(env.caches.delete).not.toHaveBeenCalled()
  })

  it('still purges the previous Scoreo caches', async () => {
    const env = createEnv({ cacheKeys: ['scoreo-v1', 'scoreo-v2', 'scoreo-v3', 'tori-valley-v1'] })
    await dispatchActivate(env)
    expect(env.caches.delete).toHaveBeenCalledWith('scoreo-v1')
    expect(env.caches.delete).toHaveBeenCalledWith('scoreo-v2')
    expect(env.caches.delete).toHaveBeenCalledTimes(2)
  })
})

describe('public/sw.js fetch handler', () => {
  let env: ReturnType<typeof createEnv>

  beforeEach(() => {
    env = createEnv()
  })

  it('bumps CACHE_NAME to scoreo-v3 so activation purges the previous cache', () => {
    expect(SW_SOURCE).toMatch(/CACHE_NAME\s*=\s*['"]scoreo-v3['"]/)
  })

  it('does not intercept non-GET requests', () => {
    const { respondWithCalled } = dispatchFetch(env, makeRequest('/assets/index-abc123.js', { method: 'POST' }))
    expect(respondWithCalled).toBe(false)
  })

  it('does not intercept cross-origin requests', () => {
    const request = { url: 'https://accounts.google.com/o/oauth2/auth', method: 'GET', mode: 'cors' }
    const { respondWithCalled } = dispatchFetch(env, request)
    expect(respondWithCalled).toBe(false)
  })

  it('serves hashed Vite assets cache-first without hitting the network when cached', async () => {
    env = createEnv({ cached: { ok: true, id: 'cached-asset' } })
    const { result } = dispatchFetch(env, makeRequest('/assets/index-CaaUlRb-.js'))
    const response = await result
    expect(response).toEqual({ ok: true, id: 'cached-asset' })
    expect(env.fetch).not.toHaveBeenCalled()
  })

  it('caches hashed Vite assets on first fetch (cache-first, populate on miss)', async () => {
    const networkResponse = makeResponse(true)
    env = createEnv({ cached: undefined, networkResponse })
    const request = makeRequest('/assets/index-CaaUlRb-.js')
    const { result } = dispatchFetch(env, request)
    const response = await result
    expect(env.fetch).toHaveBeenCalledWith(request)
    expect(response).toBe(networkResponse)
    await vi.waitFor(() => expect(env.cache.put).toHaveBeenCalledWith(request, expect.anything()))
  })

  it('does not cache a failed (non-ok) response for a hashed asset', async () => {
    const networkResponse = makeResponse(false)
    env = createEnv({ cached: undefined, networkResponse })
    const { result } = dispatchFetch(env, makeRequest('/assets/index-CaaUlRb-.js'))
    await result
    expect(env.cache.put).not.toHaveBeenCalled()
  })

  it('serves non-hashed same-origin resources network-first and refreshes the cache on success', async () => {
    const networkResponse = makeResponse(true)
    env = createEnv({ networkResponse })
    const request = makeRequest('/css/styles.css')
    const { result } = dispatchFetch(env, request)
    const response = await result
    expect(env.fetch).toHaveBeenCalledWith(request)
    expect(response).toBe(networkResponse)
    await vi.waitFor(() => expect(env.cache.put).toHaveBeenCalledWith(request, expect.anything()))
  })

  it('falls back to the cache for non-hashed resources when the network is unavailable', async () => {
    const cached = { ok: true, id: 'cached-shell' }
    env = createEnv({ cached, networkError: new Error('offline') })
    const request = makeRequest('/index.html', { mode: 'navigate' })
    const { result } = dispatchFetch(env, request)
    const response = await result
    expect(response).toBe(cached)
  })

  it('treats navigation requests the same as other non-hashed same-origin resources', async () => {
    const networkResponse = makeResponse(true)
    env = createEnv({ networkResponse })
    const request = makeRequest('/', { mode: 'navigate' })
    const { result } = dispatchFetch(env, request)
    const response = await result
    expect(env.fetch).toHaveBeenCalledWith(request)
    expect(response).toBe(networkResponse)
    await vi.waitFor(() => expect(env.cache.put).toHaveBeenCalledWith(request, expect.anything()))
  })
})
