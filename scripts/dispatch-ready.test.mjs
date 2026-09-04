import { afterEach, describe, expect, it, vi } from 'vitest'
import { decideDispatchPromotion } from './dispatch-ready.mjs'

const CLOSED = (number) => ({ number, state: 'closed' })
const OPEN = (number) => ({ number, state: 'open' })

describe('decideDispatchPromotion', () => {
  it('no native blocker at all: promotes', () => {
    expect(decideDispatchPromotion([], [])).toEqual({ promote: true })
  })

  it('one open native blocker: refuses, naming it', () => {
    expect(decideDispatchPromotion([], [OPEN(383)])).toEqual({
      promote: false,
      reason: expect.stringContaining('#383'),
    })
  })

  it('one closed native blocker: promotes', () => {
    expect(decideDispatchPromotion([], [CLOSED(424)])).toEqual({ promote: true })
  })

  it('mixed blockers, one still open: refuses, naming only the open one', () => {
    const decision = decideDispatchPromotion([], [CLOSED(424), OPEN(383)])
    expect(decision.promote).toBe(false)
    expect(decision.reason).toContain('#383')
    expect(decision.reason).not.toContain('#424')
  })

  it('stale "blocked" label with no native link: promotes — native is authoritative, not the label', () => {
    expect(decideDispatchPromotion(['blocked'], [])).toEqual({ promote: true })
  })

  it('native link open with no "blocked" label: refuses regardless — native is authoritative, not the label', () => {
    expect(decideDispatchPromotion([], [OPEN(383)])).toEqual({
      promote: false,
      reason: expect.stringContaining('#383'),
    })
  })

  it('automation:needs-human present: refuses even with no native blocker', () => {
    expect(decideDispatchPromotion(['automation:needs-human'], [])).toEqual({
      promote: false,
      reason: expect.stringContaining('automation:needs-human'),
    })
  })

  it('automation:in-progress present: refuses even with no native blocker', () => {
    expect(decideDispatchPromotion(['automation:in-progress'], [])).toEqual({
      promote: false,
      reason: expect.stringContaining('automation:in-progress'),
    })
  })

  it('label check takes precedence over blocker check', () => {
    expect(decideDispatchPromotion(['automation:needs-human'], [OPEN(1)])).toEqual({
      promote: false,
      reason: expect.stringContaining('automation:needs-human'),
    })
  })
})

function stubEnv() {
  vi.stubEnv('GH_TOKEN', 'token')
  vi.stubEnv('REPO_OWNER', 'remhiit')
  vi.stubEnv('REPO_NAME', 'scoreo')
}

function issue(number, { priority, createdAt, extraLabels = [] } = {}) {
  const labels = [...(priority ? [priority] : []), ...extraLabels]
  return { number, labels, created_at: createdAt ?? '2026-01-01T00:00:00Z' }
}

function blockedByUrl(number) {
  return `https://api.github.com/repos/remhiit/scoreo/issues/${number}/dependencies/blocked_by`
}

describe('pickNextQueued', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('promotes the only candidate when it has no native blocker', async () => {
    stubEnv()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === blockedByUrl(1)) return Promise.resolve({ ok: true, json: async () => [] })
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.resetModules()
    const { pickNextQueued } = await import('./dispatch-ready.mjs')

    const picked = await pickNextQueued([issue(1)])

    expect(picked.number).toBe(1)
  })

  it('a 404 on the dependencies endpoint is treated as unblocked, not as blocked', async () => {
    stubEnv()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === blockedByUrl(1)) return Promise.resolve({ ok: false, status: 404, text: async () => '' })
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.resetModules()
    const { pickNextQueued } = await import('./dispatch-ready.mjs')

    const picked = await pickNextQueued([issue(1)])

    expect(picked.number).toBe(1)
  })

  it('skips a candidate with an open native blocker and falls through to the next one', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === blockedByUrl(1)) return Promise.resolve({ ok: true, json: async () => [{ number: 383, state: 'open' }] })
      if (url === blockedByUrl(2)) return Promise.resolve({ ok: true, json: async () => [] })
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.resetModules()
    const { pickNextQueued } = await import('./dispatch-ready.mjs')

    const picked = await pickNextQueued([issue(1, { createdAt: '2026-01-01T00:00:00Z' }), issue(2, { createdAt: '2026-01-02T00:00:00Z' })])

    expect(picked.number).toBe(2)
    expect(fetchSpy).toHaveBeenCalledWith(blockedByUrl(1), expect.anything())
    expect(fetchSpy).toHaveBeenCalledWith(blockedByUrl(2), expect.anything())
  })

  it('bounds API calls: never fetches dependencies for a candidate already excluded by its labels', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === blockedByUrl(2)) return Promise.resolve({ ok: true, json: async () => [] })
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.resetModules()
    const { pickNextQueued } = await import('./dispatch-ready.mjs')

    const picked = await pickNextQueued([
      issue(1, { extraLabels: ['automation:in-progress'] }),
      issue(2),
    ])

    expect(picked.number).toBe(2)
    expect(fetchSpy).not.toHaveBeenCalledWith(blockedByUrl(1), expect.anything())
  })

  it('respects priority then creation date among candidates still eligible after dependency checks', async () => {
    stubEnv()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === blockedByUrl(10) || url === blockedByUrl(20) || url === blockedByUrl(30)) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.resetModules()
    const { pickNextQueued } = await import('./dispatch-ready.mjs')

    const picked = await pickNextQueued([
      issue(10, { priority: 'P2', createdAt: '2026-01-01T00:00:00Z' }),
      issue(20, { priority: 'P0', createdAt: '2026-01-03T00:00:00Z' }),
      issue(30, { priority: 'P0', createdAt: '2026-01-02T00:00:00Z' }),
    ])

    expect(picked.number).toBe(30)
  })

  it('returns null when every candidate is excluded', async () => {
    stubEnv()
    const picked = await import('./dispatch-ready.mjs').then(({ pickNextQueued }) =>
      pickNextQueued([issue(1, { extraLabels: ['automation:needs-human'] })]),
    )
    expect(picked).toBeNull()
  })

  it('a dependency call failure (5xx) propagates instead of promoting blind', async () => {
    stubEnv()
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url === blockedByUrl(1)) return Promise.resolve({ ok: false, status: 500, text: async () => 'boom' })
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })
    vi.resetModules()
    const { pickNextQueued } = await import('./dispatch-ready.mjs')

    await expect(pickNextQueued([issue(1)])).rejects.toThrow(/500/)
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
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => [] })

    vi.resetModules()
    await import('./dispatch-ready.mjs')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
