import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { desiredStatus } from './sync-project-status.mjs'

function open(labelNames) {
  return { labelNames, state: 'OPEN', stateReason: null }
}

describe('desiredStatus', () => {
  it('maps needs-human/needs-fix/in-progress to "In progress"', () => {
    expect(desiredStatus(open(['automation:needs-human']))).toBe('In progress')
    expect(desiredStatus(open(['automation:needs-fix']))).toBe('In progress')
    expect(desiredStatus(open(['automation:in-progress']))).toBe('In progress')
  })

  it('maps ready to "Todo"', () => {
    expect(desiredStatus(open(['automation:ready']))).toBe('Todo')
  })

  it('maps needs-review and review-pass to "In progress"', () => {
    expect(desiredStatus(open(['automation:needs-review']))).toBe('In progress')
    expect(desiredStatus(open(['automation:review-pass']))).toBe('In progress')
  })

  it('maps blocked to "Todo"', () => {
    expect(desiredStatus(open(['blocked']))).toBe('Todo')
  })

  it('returns null when no known label is present', () => {
    expect(desiredStatus(open(['P3', 'automation:enabled']))).toBeNull()
  })

  it('first matching label in priority order wins over a co-present blocked/ready', () => {
    expect(desiredStatus(open(['blocked', 'automation:needs-human']))).toBe('In progress')
  })

  it('open item still carrying in-progress maps to "In progress" (non-régression)', () => {
    expect(desiredStatus({ labelNames: ['automation:in-progress'], state: 'OPEN', stateReason: null })).toBe(
      'In progress',
    )
  })

  it('a closed item with state_reason completed maps to "Done", regardless of leftover labels', () => {
    expect(desiredStatus({ labelNames: ['automation:in-progress'], state: 'CLOSED', stateReason: 'COMPLETED' })).toBe(
      'Done',
    )
  })

  it('a closed item with state_reason not_planned is not forced to "Done"', () => {
    expect(
      desiredStatus({ labelNames: ['automation:in-progress'], state: 'CLOSED', stateReason: 'NOT_PLANNED' }),
    ).toBeNull()
  })

  it('a merged PR (no native stateReason, MERGED stands in for completed) maps to "Done"', () => {
    expect(desiredStatus({ labelNames: ['automation:review-pass'], state: 'MERGED', stateReason: 'COMPLETED' })).toBe(
      'Done',
    )
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Same regression class as close-linked-issues.mjs (#161): GITHUB_EVENT_PATH
  // and PROJECT_TOKEN are both set for every step of every Actions job,
  // including `pnpm test`, so an unguarded main() would run to completion on
  // import — observable here as a fetch call, instead of only surfacing as an
  // unhandled rejection outside any assertion.
  it('does not run main() on import even when PROJECT_TOKEN and GITHUB_EVENT_PATH are set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sync-project-status-'))
    const eventPath = join(dir, 'event.json')
    writeFileSync(eventPath, JSON.stringify({ issue: { number: 1 } }))
    vi.stubEnv('GITHUB_EVENT_PATH', eventPath)
    vi.stubEnv('PROJECT_TOKEN', 'fake-token')
    vi.stubEnv('GITHUB_EVENT_NAME', 'issues')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })

    try {
      vi.resetModules()
      await import('./sync-project-status.mjs')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
