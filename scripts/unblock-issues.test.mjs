import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { decideUnblockActions } from './unblock-issues.mjs'

const CLOSED = { state: 'closed' }
const OPEN = { state: 'open' }

describe('decideUnblockActions', () => {
  it('no queue label, no blocked, all blockers closed: queues, nothing to unblock', () => {
    expect(decideUnblockActions([], [CLOSED])).toEqual({ shouldQueue: true, shouldUnblock: false })
  })

  it('blocked alone, all blockers closed: queues and unblocks', () => {
    expect(decideUnblockActions(['blocked'], [CLOSED])).toEqual({ shouldQueue: true, shouldUnblock: true })
  })

  it('automation:queued + blocked, every blocker closed: does not re-queue, does unblock (régression #435)', () => {
    expect(decideUnblockActions(['automation:queued', 'blocked'], [CLOSED, CLOSED])).toEqual({
      shouldQueue: false,
      shouldUnblock: true,
    })
  })

  it('automation:queued + blocked, one blocker still open: neither re-queues nor unblocks', () => {
    expect(decideUnblockActions(['automation:queued', 'blocked'], [CLOSED, OPEN])).toEqual({
      shouldQueue: false,
      shouldUnblock: false,
    })
  })

  it('automation:needs-human + blocked: terminal, both actions withheld', () => {
    expect(decideUnblockActions(['automation:needs-human', 'blocked'], [CLOSED])).toEqual({
      shouldQueue: false,
      shouldUnblock: false,
    })
  })

  it('automation:in-progress + blocked, blockers closed: does not re-queue, but does unblock', () => {
    expect(decideUnblockActions(['automation:in-progress', 'blocked'], [CLOSED])).toEqual({
      shouldQueue: false,
      shouldUnblock: true,
    })
  })

  it('no native blocker declared at all (empty list): treated as closed, same as an explicit closed blocker', () => {
    expect(decideUnblockActions(['blocked'], [])).toEqual({ shouldQueue: true, shouldUnblock: true })
    expect(decideUnblockActions(['automation:queued', 'blocked'], [])).toEqual({
      shouldQueue: false,
      shouldUnblock: true,
    })
  })

  it('automation:ready + blocked, blockers closed: does not re-queue, does unblock', () => {
    expect(decideUnblockActions(['automation:ready', 'blocked'], [CLOSED])).toEqual({
      shouldQueue: false,
      shouldUnblock: true,
    })
  })

  it('no blocked label: never unblocks, regardless of blocker state', () => {
    expect(decideUnblockActions([], [OPEN])).toEqual({ shouldQueue: false, shouldUnblock: false })
    expect(decideUnblockActions(['automation:queued'], [CLOSED])).toEqual({
      shouldQueue: false,
      shouldUnblock: false,
    })
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Same regression class as sync-issue-dependencies.mjs and
  // close-linked-issues.mjs (#161): GITHUB_EVENT_PATH and GH_TOKEN are both
  // set for every step of every Actions job, including `pnpm test`, so an
  // unguarded main() would run to completion on import — observable here as
  // a fetch call, instead of only surfacing as an unhandled rejection outside
  // any assertion.
  it('does not run main() on import even when GH_TOKEN and GITHUB_EVENT_PATH are set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'unblock-issues-'))
    const eventPath = join(dir, 'event.json')
    writeFileSync(eventPath, JSON.stringify({ issue: { number: 1, state_reason: 'completed' } }))
    vi.stubEnv('GITHUB_EVENT_PATH', eventPath)
    vi.stubEnv('GH_TOKEN', 'fake-token')
    vi.stubEnv('REPO_OWNER', 'remhiit')
    vi.stubEnv('REPO_NAME', 'scoreo')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false, status: 404, json: async () => ({}), text: async () => '' })

    try {
      vi.resetModules()
      await import('./unblock-issues.mjs')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
