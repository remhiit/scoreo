import { afterEach, describe, expect, it, vi } from 'vitest'

const PULLS_URL = 'https://api.github.com/repos/remhiit/scoreo/pulls?state=closed&sort=updated&direction=desc&per_page=100'

function mockPulls(pulls) {
  return (url) => {
    if (url === PULLS_URL) {
      return Promise.resolve({ ok: true, json: async () => pulls })
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  }
}

function stubEnv() {
  vi.stubEnv('GH_TOKEN', 'token')
  vi.stubEnv('REPO_OWNER', 'remhiit')
  vi.stubEnv('REPO_NAME', 'scoreo')
}

describe('isMergedWithinWindow', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('accepts a PR merged inside the catch-up window', async () => {
    const { isMergedWithinWindow, CATCHUP_WINDOW_DAYS } = await import('./sweep-merged-prs.mjs')
    const now = new Date('2026-08-10T00:00:00Z').getTime()
    const mergedAt = new Date(now - (CATCHUP_WINDOW_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString()
    expect(isMergedWithinWindow({ merged_at: mergedAt }, now)).toBe(true)
  })

  it('rejects a PR merged outside the catch-up window', async () => {
    const { isMergedWithinWindow, CATCHUP_WINDOW_DAYS } = await import('./sweep-merged-prs.mjs')
    const now = new Date('2026-08-10T00:00:00Z').getTime()
    const mergedAt = new Date(now - (CATCHUP_WINDOW_DAYS + 1) * 24 * 60 * 60 * 1000).toISOString()
    expect(isMergedWithinWindow({ merged_at: mergedAt }, now)).toBe(false)
  })

  it('rejects a PR that was closed without being merged', async () => {
    const { isMergedWithinWindow } = await import('./sweep-merged-prs.mjs')
    expect(isMergedWithinWindow({ merged_at: null }, Date.now())).toBe(false)
  })
})

describe('sweepMergedPRs', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('closes an open issue referenced by a merged PR', async () => {
    stubEnv()
    const now = Date.now()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === PULLS_URL) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ number: 264, body: 'Closes #10', merged_at: new Date(now).toISOString() }],
        })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/10' && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => ({ state: 'open' }) })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/10' && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { sweepMergedPRs } = await import('./sweep-merged-prs.mjs')
    await sweepMergedPRs(now)

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/remhiit/scoreo/issues/10',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('ignores a PR that was closed without being merged', async () => {
    stubEnv()
    const now = Date.now()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(mockPulls([{ number: 265, body: 'Closes #11', merged_at: null }]))

    vi.resetModules()
    const { sweepMergedPRs } = await import('./sweep-merged-prs.mjs')
    await sweepMergedPRs(now)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(PULLS_URL, expect.anything())
  })

  it('ignores a merged PR outside the catch-up window', async () => {
    stubEnv()
    const now = Date.now()
    const oldMergedAt = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
      mockPulls([{ number: 266, body: 'Closes #12', merged_at: oldMergedAt }]),
    )

    vi.resetModules()
    const { sweepMergedPRs } = await import('./sweep-merged-prs.mjs')
    await sweepMergedPRs(now)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('does not PATCH an issue that is already closed', async () => {
    stubEnv()
    const now = Date.now()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === PULLS_URL) {
        return Promise.resolve({
          ok: true,
          json: async () => [{ number: 267, body: 'Closes #13', merged_at: new Date(now).toISOString() }],
        })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/13' && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => ({ state: 'closed' }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { sweepMergedPRs } = await import('./sweep-merged-prs.mjs')
    await sweepMergedPRs(now)

    expect(fetchSpy).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'PATCH' }))
  })

  it('does nothing when there is no PR to catch up', async () => {
    stubEnv()
    const now = Date.now()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(mockPulls([]))

    vi.resetModules()
    const { sweepMergedPRs } = await import('./sweep-merged-prs.mjs')
    await sweepMergedPRs(now)

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('does not run main() on import', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(mockPulls([]))

    vi.resetModules()
    await import('./sweep-merged-prs.mjs')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
