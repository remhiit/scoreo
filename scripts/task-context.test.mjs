import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LIMITS,
  buildTaskContext,
  derivePackages,
  extractRelevantFiles,
  redactSecrets,
  validateTaskContext,
} from './task-context.mjs'

const ISSUE_BODY = `## Contexte

Un contexte.

## Fichiers impactés

- \`scripts/task-context.mjs\` (nouveau)
- \`scripts/task-context.mjs\` (doublon, dédupliqué)
- \`schemas/automation/task-context.schema.json\` (nouveau)
- \`apps/scoreo/src/ui/matches/matchesReducer.ts\`

## Dépendances

Dépend de #12 (bloqueur)
`

const ISSUE_PAYLOAD = {
  action: 'labeled',
  label: { name: 'automation:ready' },
  sender: { login: 'remhiit' },
  repository: { name: 'scoreo', owner: { login: 'remhiit' } },
  issue: {
    number: 401,
    title: 'Construire le TaskContext',
    html_url: 'https://github.com/remhiit/scoreo/issues/401',
    state: 'open',
    labels: [{ name: 'P1' }, { name: 'automation:ready' }],
    body: ISSUE_BODY,
  },
}

const PR_PAYLOAD = {
  action: 'labeled',
  label: { name: 'automation:needs-review' },
  sender: { login: 'remhiit' },
  repository: { name: 'scoreo', owner: { login: 'remhiit' } },
  pull_request: {
    number: 402,
    title: 'Implémenter le TaskContext',
    html_url: 'https://github.com/remhiit/scoreo/pull/402',
    state: 'open',
    labels: [{ name: 'automation:needs-review' }],
    body: '## Résumé\n\nImplémente #401.',
    draft: false,
    merged: false,
    head: { sha: 'abc123' },
    base: { ref: 'main' },
    changed_files: 3,
    additions: 120,
    deletions: 4,
  },
}

const BASE_ARGS = {
  routine: 'implement-task',
  runId: '999',
  attempt: 1,
  generatedAt: '2026-09-04T12:00:00.000Z',
  repository: { owner: 'remhiit', name: 'scoreo' },
}

describe('redactSecrets', () => {
  it('leaves ordinary text untouched', () => {
    expect(redactSecrets('rien à cacher ici')).toEqual({ text: 'rien à cacher ici', count: 0 })
  })

  it('returns count 0 for empty/nullish input', () => {
    expect(redactSecrets('')).toEqual({ text: '', count: 0 })
    expect(redactSecrets(null)).toEqual({ text: '', count: 0 })
    expect(redactSecrets(undefined)).toEqual({ text: '', count: 0 })
  })

  it('redacts a GitHub token', () => {
    const { text, count } = redactSecrets('token: ghp_abcdefghijklmnopqrstuvwxyz0123456789')
    expect(count).toBe(1)
    expect(text).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123456789')
  })

  it('redacts an env-var-looking secret assignment, keeping the key name visible', () => {
    const { text, count } = redactSecrets('DEPLOY_API_KEY=s3cr3t-value-not-for-logs')
    expect(count).toBe(1)
    expect(text).toContain('DEPLOY_API_KEY=[REDACTED]')
    expect(text).not.toContain('s3cr3t-value-not-for-logs')
  })

  it('redacts a PEM private key block', () => {
    const pem = '-----BEGIN PRIVATE KEY-----\nMIIBogIBAAJ...\n-----END PRIVATE KEY-----'
    const { text, count } = redactSecrets(`before\n${pem}\nafter`)
    expect(count).toBe(1)
    expect(text).not.toContain('MIIBogIBAAJ')
  })
})

describe('extractRelevantFiles', () => {
  it('extracts and dedupes backtick-quoted paths from "## Fichiers impactés"', () => {
    expect(extractRelevantFiles(ISSUE_BODY)).toEqual([
      'scripts/task-context.mjs',
      'schemas/automation/task-context.schema.json',
      'apps/scoreo/src/ui/matches/matchesReducer.ts',
    ])
  })

  it('returns null when the section is absent (explicitly unavailable, not empty)', () => {
    expect(extractRelevantFiles('## Contexte\n\nRien.')).toBeNull()
    expect(extractRelevantFiles(null)).toBeNull()
  })
})

describe('derivePackages', () => {
  it('maps file paths to their workspace package, deduped and sorted', () => {
    expect(
      derivePackages([
        'apps/scoreo/src/ui/matches/matchesReducer.ts',
        'apps/scoreo/src/ui/matches/matchesReducer.test.ts',
        'packages/module-tori-valley/src/index.ts',
        'CLAUDE.md',
      ]),
    ).toEqual(['root', 'scoreo', 'module-tori-valley'].sort())
  })

  it('returns an empty list for an empty input', () => {
    expect(derivePackages([])).toEqual([])
  })
})

describe('buildTaskContext', () => {
  it('builds a reproducible context from an issue event (same input → same output)', () => {
    const args = { eventName: 'issues', payload: ISSUE_PAYLOAD, ...BASE_ARGS }
    const first = buildTaskContext(args)
    const second = buildTaskContext(args)
    expect(first).toEqual(second)
    expect(validateTaskContext(first)).toEqual({ valid: true, errors: [] })
  })

  it('describes the issue entity, its relevant files and its declared dependency', () => {
    const context = buildTaskContext({ eventName: 'issues', payload: ISSUE_PAYLOAD, ...BASE_ARGS })
    expect(context.entity).toMatchObject({
      type: 'issue',
      number: 401,
      title: 'Construire le TaskContext',
      state: 'open',
      labels: ['P1', 'automation:ready'],
    })
    expect(context.files.relevant.available).toBe(true)
    expect(context.files.relevant.items).toContain('scripts/task-context.mjs')
    expect(context.dependencies.declaredAvailable).toBe(true)
    expect(context.dependencies.declared).toEqual([12])
  })

  it('builds a reproducible context from a pull_request event, with a diff summary', () => {
    const args = { eventName: 'pull_request', payload: PR_PAYLOAD, ...BASE_ARGS }
    const first = buildTaskContext(args)
    const second = buildTaskContext(args)
    expect(first).toEqual(second)
    expect(validateTaskContext(first)).toEqual({ valid: true, errors: [] })
    expect(first.entity).toMatchObject({ type: 'pull_request', number: 402, headSha: 'abc123', baseRef: 'main' })
    expect(first.diff).toEqual({
      available: true,
      summary: { changedFiles: 3, additions: 120, deletions: 4 },
      unavailableReason: null,
    })
  })

  describe('edge cases', () => {
    it('marks the diff explicitly unavailable for an issue (no PR at all)', () => {
      const context = buildTaskContext({ eventName: 'issues', payload: ISSUE_PAYLOAD, ...BASE_ARGS })
      expect(context.diff.available).toBe(false)
      expect(context.diff.summary).toBeNull()
      expect(context.diff.unavailableReason).toBeTruthy()
    })

    it('marks the diff explicitly unavailable, not omitted, for an oversized pull request', () => {
      const hugePr = { ...PR_PAYLOAD, pull_request: { ...PR_PAYLOAD.pull_request, changed_files: 999 } }
      const context = buildTaskContext({
        eventName: 'pull_request',
        payload: hugePr,
        ...BASE_ARGS,
        limits: { ...DEFAULT_LIMITS, maxChangedFiles: 200 },
      })
      expect(context.diff.available).toBe(false)
      expect(context.diff.summary).toBeNull()
      expect(context.diff.unavailableReason).toMatch(/too large|volumineuse/i)
    })

    it('applies and reports truncation when the relevant-files list exceeds the bound', () => {
      const manyFiles = Array.from({ length: 5 }, (_, i) => `\`src/file-${i}.ts\``).join('\n')
      const payload = {
        ...ISSUE_PAYLOAD,
        issue: { ...ISSUE_PAYLOAD.issue, body: `## Fichiers impactés\n\n${manyFiles}\n` },
      }
      const context = buildTaskContext({
        eventName: 'issues',
        payload,
        ...BASE_ARGS,
        limits: { ...DEFAULT_LIMITS, maxRelevantFiles: 2 },
      })
      expect(context.files.relevant.items).toHaveLength(2)
      expect(context.files.relevant.truncated).toBe(true)
      expect(context.truncation.applied).toBe(true)
      expect(context.truncation.fields).toContain('files.relevant')
    })

    it('throws explicitly instead of producing a partial context for an unhandled event type', () => {
      expect(() =>
        buildTaskContext({ eventName: 'release', payload: { release: { tag_name: 'v1' } }, ...BASE_ARGS }),
      ).toThrow(/unhandled|incomplete/i)
    })

    it('throws explicitly instead of producing a partial context for an incomplete issue event', () => {
      expect(() => buildTaskContext({ eventName: 'issues', payload: {}, ...BASE_ARGS })).toThrow(
        /unhandled|incomplete/i,
      )
    })

    it('redacts a secret-looking value found in the issue body before it reaches the context', () => {
      const payload = {
        ...ISSUE_PAYLOAD,
        issue: {
          ...ISSUE_PAYLOAD.issue,
          body: `${ISSUE_BODY}\n\nNe pas commit : GOOGLE_CLIENT_SECRET=abcdef0123456789`,
        },
      }
      const context = buildTaskContext({ eventName: 'issues', payload, ...BASE_ARGS })
      expect(context.redaction.applied).toBe(true)
      expect(context.redaction.occurrences).toBeGreaterThan(0)
      expect(JSON.stringify(context)).not.toContain('abcdef0123456789')
    })
  })
})

describe('validateTaskContext', () => {
  it('rejects a context missing required fields', () => {
    const { valid, errors } = validateTaskContext({ version: 1 })
    expect(valid).toBe(false)
    expect(errors.length).toBeGreaterThan(0)
  })

  it('rejects a context with the wrong version', () => {
    const context = buildTaskContext({ eventName: 'issues', payload: ISSUE_PAYLOAD, ...BASE_ARGS })
    const { valid, errors } = validateTaskContext({ ...context, version: 2 })
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('version')]))
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  // Same regression class covered in sync-issue-dependencies.test.mjs /
  // close-linked-issues.test.mjs: GITHUB_EVENT_PATH and friends are set for
  // every step of every Actions job, including `pnpm test`, so an unguarded
  // main() would run to completion (here: writing task-context.json) on
  // import instead of only when this file is the actual entry point.
  it('does not run main() on import even when GitHub Actions env vars are set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'task-context-'))
    const eventPath = join(dir, 'event.json')
    writeFileSync(eventPath, JSON.stringify(ISSUE_PAYLOAD))
    vi.stubEnv('GITHUB_EVENT_PATH', eventPath)
    vi.stubEnv('GITHUB_EVENT_NAME', 'issues')
    vi.stubEnv('GITHUB_RUN_ID', '1')
    vi.stubEnv('TASK_CONTEXT_OUTPUT_PATH', join(dir, 'task-context.json'))
    const writeSpy = vi.spyOn(process.stdout, 'write')

    try {
      vi.resetModules()
      await import('./task-context.mjs')
      await new Promise((resolve) => setTimeout(resolve, 0))

      // No log line from main() means main() never ran.
      expect(writeSpy.mock.calls.join('')).not.toContain('task-context: écrit dans')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
