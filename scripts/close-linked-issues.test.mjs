import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractClosedIssueNumbers } from './close-linked-issues.mjs'

describe('extractClosedIssueNumbers', () => {
  it('extracts a single "Closes #N" reference', () => {
    expect(extractClosedIssueNumbers('Some context.\n\nCloses #120')).toEqual([120])
  })

  it('is case-insensitive and accepts fix/resolve variants', () => {
    expect(extractClosedIssueNumbers('fixes #12')).toEqual([12])
    expect(extractClosedIssueNumbers('Resolved #34')).toEqual([34])
    expect(extractClosedIssueNumbers('CLOSE #56')).toEqual([56])
  })

  it('extracts a comma/and-separated list after one keyword', () => {
    expect(extractClosedIssueNumbers('Closes #10, #12 and #14')).toEqual([10, 12, 14])
  })

  it('dedupes repeated references', () => {
    expect(extractClosedIssueNumbers('Closes #10\n\nAlso closes #10')).toEqual([10])
  })

  it('ignores cross-repo references (owner/repo#N)', () => {
    expect(extractClosedIssueNumbers('Closes remhiit/other-repo#5')).toEqual([])
  })

  it('returns an empty list when there is no closing keyword', () => {
    expect(extractClosedIssueNumbers('See #120 for context.')).toEqual([])
    expect(extractClosedIssueNumbers(null)).toEqual([])
    expect(extractClosedIssueNumbers(undefined)).toEqual([])
  })
})

describe('resolvePullRequest', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('fetches the PR by number when PR_NUMBER is set', async () => {
    vi.stubEnv('PR_NUMBER', '219')
    vi.stubEnv('GH_TOKEN', 'token')
    vi.stubEnv('REPO_OWNER', 'remhiit')
    vi.stubEnv('REPO_NAME', 'scoreo')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ number: 219, body: 'Closes #208' }) })

    vi.resetModules()
    const { resolvePullRequest } = await import('./close-linked-issues.mjs')
    const pr = await resolvePullRequest()

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/remhiit/scoreo/pulls/219',
      expect.anything(),
    )
    expect(pr).toEqual({ number: 219, body: 'Closes #208' })
  })

  it('throws when the PR fetch fails', async () => {
    vi.stubEnv('PR_NUMBER', '999')
    vi.stubEnv('GH_TOKEN', 'token')
    vi.stubEnv('REPO_OWNER', 'remhiit')
    vi.stubEnv('REPO_NAME', 'scoreo')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 })

    vi.resetModules()
    const { resolvePullRequest } = await import('./close-linked-issues.mjs')

    await expect(resolvePullRequest()).rejects.toThrow('PR #999')
  })

  it('falls back to the GITHUB_EVENT_PATH payload when PR_NUMBER is not set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'close-linked-issues-'))
    const eventPath = join(dir, 'event.json')
    writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 219, body: 'Closes #208' } }))
    vi.stubEnv('PR_NUMBER', '')
    vi.stubEnv('GITHUB_EVENT_PATH', eventPath)

    try {
      vi.resetModules()
      const { resolvePullRequest } = await import('./close-linked-issues.mjs')
      const pr = await resolvePullRequest()
      expect(pr).toEqual({ number: 219, body: 'Closes #208' })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('entry-point guard (PR_NUMBER mode)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Regression test for #223: auto-merge-sync.yml polls its own bot-enabled
  // auto-merge to completion and then closes linked issues in the same job,
  // since GitHub never spawns a new workflow run (and so never fires
  // close-linked-issues.yml) for a pull_request.closed event caused by the
  // GITHUB_TOKEN. This mode fetches the PR by number instead of reading
  // GITHUB_EVENT_PATH — importing the module must still not run main().
  it('does not run main() on import when PR_NUMBER is set instead of GITHUB_EVENT_PATH', async () => {
    vi.stubEnv('PR_NUMBER', '219')
    vi.stubEnv('GITHUB_EVENT_PATH', '')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })

    vi.resetModules()
    await import('./close-linked-issues.mjs')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Regression test for the red main build fixed by #161: GITHUB_EVENT_PATH is
  // set for every step of every Actions job, including `pnpm test`, so a guard
  // based on it ran main() whenever this test file imported the module in CI.
  // The payload deliberately carries a closing reference: a regressed guard
  // would run main() to completion and become observable as a fetch call,
  // instead of only surfacing as an unhandled rejection outside any assertion.
  it('does not run main() on import even when GITHUB_EVENT_PATH is set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'close-linked-issues-'))
    const eventPath = join(dir, 'event.json')
    writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 1, body: 'Closes #2' } }))
    vi.stubEnv('GITHUB_EVENT_PATH', eventPath)
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })

    try {
      vi.resetModules()
      await import('./close-linked-issues.mjs')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
