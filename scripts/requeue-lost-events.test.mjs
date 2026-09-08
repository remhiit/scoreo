import { afterEach, describe, expect, it, vi } from 'vitest'
import { STALE_OWNERSHIP_THRESHOLD_MINUTES, decideStaleOwnership } from './requeue-lost-events.mjs'

const REPO_ROOT = 'https://api.github.com/repos/remhiit/scoreo'

function stubEnv() {
  vi.stubEnv('GH_TOKEN', 'token')
  vi.stubEnv('REPO_OWNER', 'remhiit')
  vi.stubEnv('REPO_NAME', 'scoreo')
}

function resetAll() {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
  vi.resetModules()
}

function timelineResponse(events) {
  return Promise.resolve({ ok: true, status: 200, json: async () => events })
}

function labeledEvent(label, createdAt) {
  return { event: 'labeled', label: { name: label }, created_at: createdAt }
}

describe('decideStaleOwnership', () => {
  it('below the threshold: skipped', () => {
    expect(
      decideStaleOwnership({
        labelNames: ['automation:in-progress'],
        isPullRequest: false,
        minutesSinceInProgress: STALE_OWNERSHIP_THRESHOLD_MINUTES - 1,
      }),
    ).toEqual({ stale: false })
  })

  it('at or above the threshold on an issue: stale, escalates with the three ordered labels', () => {
    expect(
      decideStaleOwnership({
        labelNames: ['automation:in-progress'],
        isPullRequest: false,
        minutesSinceInProgress: STALE_OWNERSHIP_THRESHOLD_MINUTES,
      }),
    ).toEqual({
      stale: true,
      labelsToAdd: ['automation:needs-human', 'automation:queued'],
      labelsToRemove: ['automation:in-progress'],
    })
  })

  it('at or above the threshold on a PR: stale, escalates with automation:needs-human alone', () => {
    expect(
      decideStaleOwnership({
        labelNames: ['automation:in-progress'],
        isPullRequest: true,
        minutesSinceInProgress: STALE_OWNERSHIP_THRESHOLD_MINUTES + 10,
      }),
    ).toEqual({
      stale: true,
      labelsToAdd: ['automation:needs-human'],
      labelsToRemove: ['automation:in-progress'],
    })
  })

  it('automation:needs-human already present: terminal, never re-escalated', () => {
    expect(
      decideStaleOwnership({
        labelNames: ['automation:in-progress', 'automation:needs-human'],
        isPullRequest: false,
        minutesSinceInProgress: 1000,
      }),
    ).toEqual({ stale: false, terminal: true })
  })

  it('no labeled event found for automation:in-progress (null age): skipped, not treated as stale', () => {
    expect(
      decideStaleOwnership({
        labelNames: ['automation:in-progress'],
        isPullRequest: false,
        minutesSinceInProgress: null,
      }),
    ).toEqual({ stale: false, unknownAge: true })
  })
})

describe('sweepStaleOwnership (integration, mocked fetch)', () => {
  afterEach(resetAll)

  it('escalates a stale issue: needs-human then queued added, in-progress removed, comment posted', async () => {
    stubEnv()
    const calls = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      calls.push({ url: String(url), method: opts?.method ?? 'GET' })
      if (url === `${REPO_ROOT}/issues?state=open&labels=automation%3Ain-progress&per_page=100`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{ number: 100, labels: [{ name: 'automation:in-progress' }] }],
        })
      }
      if (url === `${REPO_ROOT}/issues/100/timeline?per_page=100`) {
        return timelineResponse([labeledEvent('automation:in-progress', new Date(Date.now() - 200 * 60000).toISOString())])
      }
      if (url === `${REPO_ROOT}/issues/100/labels` && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      if (url === `${REPO_ROOT}/issues/100/labels/automation:in-progress` && opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      if (url === `${REPO_ROOT}/issues/100/comments?per_page=100`) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (url === `${REPO_ROOT}/issues/100/comments` && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 1 }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url} ${opts?.method}`))
    })

    vi.resetModules()
    const { sweepStaleOwnership } = await import('./requeue-lost-events.mjs')
    await sweepStaleOwnership()

    const labelPosts = calls.filter((c) => c.url === `${REPO_ROOT}/issues/100/labels` && c.method === 'POST')
    expect(labelPosts).toHaveLength(2)
    const deleteIndex = calls.findIndex((c) => c.method === 'DELETE')
    const lastPostIndex = calls.map((c, i) => (c.method === 'POST' && c.url.endsWith('/labels') ? i : -1)).filter((i) => i >= 0).pop()
    expect(deleteIndex).toBeGreaterThan(lastPostIndex)
    expect(calls.some((c) => c.url === `${REPO_ROOT}/issues/100/comments` && c.method === 'POST')).toBe(true)
  })

  it('escalates a stale PR: only automation:needs-human is added, no automation:queued', async () => {
    stubEnv()
    const bodyPayloads = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (opts?.body) bodyPayloads.push(JSON.parse(opts.body))
      if (url === `${REPO_ROOT}/issues?state=open&labels=automation%3Ain-progress&per_page=100`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{ number: 200, pull_request: {}, labels: [{ name: 'automation:in-progress' }] }],
        })
      }
      if (url === `${REPO_ROOT}/issues/200/timeline?per_page=100`) {
        return timelineResponse([labeledEvent('automation:in-progress', new Date(Date.now() - 300 * 60000).toISOString())])
      }
      if (url === `${REPO_ROOT}/issues/200/labels` && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      if (url === `${REPO_ROOT}/issues/200/labels/automation:in-progress` && opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      if (url === `${REPO_ROOT}/issues/200/comments?per_page=100`) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (url === `${REPO_ROOT}/issues/200/comments` && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 2 }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url} ${opts?.method}`))
    })

    vi.resetModules()
    const { sweepStaleOwnership } = await import('./requeue-lost-events.mjs')
    await sweepStaleOwnership()

    const labelsAdded = bodyPayloads.filter((p) => p.labels).flatMap((p) => p.labels)
    expect(labelsAdded).toEqual(['automation:needs-human'])
  })

  it('automation:needs-human already present: no write call at all', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === `${REPO_ROOT}/issues?state=open&labels=automation%3Ain-progress&per_page=100`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { number: 300, labels: [{ name: 'automation:in-progress' }, { name: 'automation:needs-human' }] },
          ],
        })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { sweepStaleOwnership } = await import('./requeue-lost-events.mjs')
    await sweepStaleOwnership()

    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('no "labeled" event for automation:in-progress: skipped, no write call', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === `${REPO_ROOT}/issues?state=open&labels=automation%3Ain-progress&per_page=100`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{ number: 400, labels: [{ name: 'automation:in-progress' }] }],
        })
      }
      if (url === `${REPO_ROOT}/issues/400/timeline?per_page=100`) {
        return timelineResponse([])
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { sweepStaleOwnership } = await import('./requeue-lost-events.mjs')
    await sweepStaleOwnership()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})

describe('requeueIfOrphaned (existing behavior, non-regression)', () => {
  afterEach(resetAll)

  it('re-triggers an orphaned automation:ready label past the threshold', async () => {
    stubEnv()
    const calls = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      calls.push({ url: String(url), method: opts?.method ?? 'GET' })
      if (url === `${REPO_ROOT}/issues?state=open&labels=automation%3Aready&per_page=100`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [{ number: 500, labels: [{ name: 'automation:ready' }] }],
        })
      }
      if (url === `${REPO_ROOT}/issues/500/timeline?per_page=100`) {
        return timelineResponse([labeledEvent('automation:ready', new Date(Date.now() - 40 * 60000).toISOString())])
      }
      if (url === `${REPO_ROOT}/issues/500/labels/automation:ready` && opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      if (url === `${REPO_ROOT}/issues/500/labels` && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url} ${opts?.method}`))
    })

    vi.resetModules()
    const { sweepIssues } = await import('./requeue-lost-events.mjs')
    await sweepIssues()

    expect(calls.some((c) => c.method === 'DELETE')).toBe(true)
    expect(calls.some((c) => c.url === `${REPO_ROOT}/issues/500/labels` && c.method === 'POST')).toBe(true)
  })

  it('skips an item still carrying automation:in-progress, never touching the trigger label (stale ownership wins)', async () => {
    stubEnv()
    const calls = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      calls.push({ url: String(url), method: opts?.method ?? 'GET' })
      if (url === `${REPO_ROOT}/issues?state=open&labels=automation%3Aready&per_page=100`) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { number: 600, labels: [{ name: 'automation:ready' }, { name: 'automation:in-progress' }] },
          ],
        })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url} ${opts?.method}`))
    })

    vi.resetModules()
    const { sweepIssues } = await import('./requeue-lost-events.mjs')
    await sweepIssues()

    expect(calls.some((c) => c.url.includes('automation:ready') && c.method !== 'GET')).toBe(false)
  })
})

describe('entry-point guard', () => {
  afterEach(resetAll)

  it('does not run main() on import', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('should not fetch')))

    vi.resetModules()
    await import('./requeue-lost-events.mjs')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
