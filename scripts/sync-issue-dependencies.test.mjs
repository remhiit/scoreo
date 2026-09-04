import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { diffBlockers, extractBlockerNumbers } from './sync-issue-dependencies.mjs'

describe('extractBlockerNumbers', () => {
  it('extracts a single "Dépend de #N" reference', () => {
    expect(extractBlockerNumbers('## Dépendances\n\nDépend de #114 (pose le port)')).toEqual([114])
  })

  it('extracts several references and accepts the unaccented spelling', () => {
    expect(extractBlockerNumbers('## Dependances\n\nDepend de #10\nDépend de #12')).toEqual([10, 12])
  })

  it('dedupes repeated references', () => {
    expect(extractBlockerNumbers('## Dépendances\n\nDépend de #10\nDépend de #10 (encore)')).toEqual([10])
  })

  it('returns null when there is no Dépendances section at all', () => {
    expect(extractBlockerNumbers('## Contexte\n\nRien à voir ici.')).toBeNull()
    expect(extractBlockerNumbers(null)).toBeNull()
    expect(extractBlockerNumbers(undefined)).toBeNull()
    expect(extractBlockerNumbers('')).toBeNull()
  })

  it('returns an empty list when the section exists but declares nothing (empty section)', () => {
    expect(extractBlockerNumbers('## Dépendances\n\n## Hors scope\n\nRien.')).toEqual([])
  })

  it('returns an empty list when the section exists but only contains prose', () => {
    expect(extractBlockerNumbers('## Dépendances\n\nAucun bloqueur pour le moment.\n\n## Hors scope')).toEqual([])
  })

  it('stops at the next heading and does not bleed into the following section', () => {
    const body = '## Dépendances\n\nDépend de #10\n\n## Hors scope\n\nDépend de #999 (pas une vraie dépendance)'
    expect(extractBlockerNumbers(body)).toEqual([10])
  })

  it('is anchored at line start: a prose mention of the section name elsewhere does not hijack the match (régression #432)', () => {
    const body = [
      '## Contexte',
      '',
      'Ce ticket documente la section `## Dépendances` utilisée ailleurs.',
      '',
      '## Dépendances',
      '',
      'Dépend de #424',
    ].join('\n')
    expect(extractBlockerNumbers(body)).toEqual([424])
  })

  it('is anchored at line start: a mention inside a fenced code block does not hijack the match', () => {
    const body = [
      '## Contexte',
      '',
      '```',
      '## Dépendances',
      'Dépend de #1',
      '```',
      '',
      '## Dépendances',
      '',
      'Dépend de #2',
    ].join('\n')
    expect(extractBlockerNumbers(body)).toEqual([2])
  })

  it('when several real "## Dépendances" headings exist, the first one is authoritative', () => {
    const body = '## Dépendances\n\nDépend de #1\n\n## Dépendances\n\nDépend de #2'
    expect(extractBlockerNumbers(body)).toEqual([1])
  })
})

describe('diffBlockers', () => {
  it('returns everything as toAdd when there are no current blockers', () => {
    expect(diffBlockers([10, 12], [])).toEqual({ toAdd: [10, 12], toRemove: [] })
  })

  it('returns everything as toRemove when nothing is declared any more', () => {
    const current = [
      { id: 1001, number: 10 },
      { id: 1002, number: 12 },
    ]
    expect(diffBlockers([], current)).toEqual({ toAdd: [], toRemove: current })
  })

  it('adds what is newly declared and removes what is no longer declared', () => {
    const current = [
      { id: 1001, number: 10 },
      { id: 1003, number: 15 },
    ]
    expect(diffBlockers([10, 12], current)).toEqual({
      toAdd: [12],
      toRemove: [{ id: 1003, number: 15 }],
    })
  })

  it('is idempotent: an already-linked, still-declared blocker is neither added nor removed', () => {
    const current = [{ id: 1001, number: 10 }]
    expect(diffBlockers([10], current)).toEqual({ toAdd: [], toRemove: [] })
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Same regression class as close-linked-issues.mjs (#161) and
  // sync-project-status.mjs: GITHUB_EVENT_PATH and GITHUB_TOKEN are both set
  // for every step of every Actions job, including `pnpm test`, so an
  // unguarded main() would run to completion on import — observable here as a
  // fetch call, instead of only surfacing as an unhandled rejection outside
  // any assertion.
  it('does not run main() on import even when GITHUB_TOKEN and GITHUB_EVENT_PATH are set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sync-issue-dependencies-'))
    const eventPath = join(dir, 'event.json')
    writeFileSync(eventPath, JSON.stringify({ issue: { number: 1, body: 'Dépend de #2' } }))
    vi.stubEnv('GITHUB_EVENT_PATH', eventPath)
    vi.stubEnv('GITHUB_TOKEN', 'fake-token')
    vi.stubEnv('REPO_OWNER', 'remhiit')
    vi.stubEnv('REPO_NAME', 'scoreo')
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })

    try {
      vi.resetModules()
      await import('./sync-issue-dependencies.mjs')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(fetchSpy).not.toHaveBeenCalled()
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
