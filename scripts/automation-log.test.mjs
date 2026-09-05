import { afterEach, describe, expect, it, vi } from 'vitest'

const COMMENTS_URL = 'https://api.github.com/repos/remhiit/scoreo/issues/42/comments?per_page=100'

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

describe('renderAutomationLog / parseAutomationLog', () => {
  afterEach(resetAll)

  it('round-trips sha, status and iteration through the rendered markdown', async () => {
    const { renderAutomationLog, parseAutomationLog, markerFor } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-08-31T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      summary: 'Conforme à la spec, aucun changement demandé.',
    })

    expect(body.startsWith(markerFor('pr-review'))).toBe(true)
    expect(body).toContain('## Automation — PR review')
    expect(body).toContain('[voir le run](https://github.com/remhiit/scoreo/actions/runs/999)')
    expect(body).toContain('Conforme à la spec, aucun changement demandé.')
    expect(parseAutomationLog(body)).toEqual({ sha: 'abc1234', status: 'succeeded', iteration: '1' })
  })

  it('links back to the TaskContext artifact when a contextUrl is provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-08-31T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      contextUrl: 'https://github.com/remhiit/scoreo/actions/runs/999#artifacts',
    })
    expect(body).toContain("- Contexte : [voir l'artefact](https://github.com/remhiit/scoreo/actions/runs/999#artifacts)")
  })

  it('publishes the ComplexityAssessment in a structured readable form when provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-05T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      complexity: {
        level: 'complex',
        score: 52,
        confidence: 'medium',
        provenance: 'heuristic',
        reasons: ['Dispersion : 3 paquets touchés (root, scoreo, module-tori-valley) → 20/20'],
      },
    })
    expect(body).toContain('- Complexité : `complex` (score 52/100, confiance `medium`, provenance `heuristic`)')
    expect(body).toContain('- Raisons : Dispersion : 3 paquets touchés (root, scoreo, module-tori-valley) → 20/20')
    expect(body).not.toContain('Override manuel')
  })

  it('surfaces a manual complexity override without hiding the underlying heuristic level', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-05T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      complexity: {
        level: 'very-complex',
        score: 10,
        confidence: 'high',
        provenance: 'manual',
        override: { level: 'very-complex', heuristicLevel: 'trivial', source: 'label:complexity:very-complex' },
        reasons: [],
      },
    })
    expect(body).toContain('- Complexité : `very-complex` (score 10/100, confiance `high`, provenance `manual`)')
    expect(body).toContain('- Override manuel : `very-complex` (heuristique : `trivial`, source : label:complexity:very-complex)')
  })

  it('omits the Complexité line entirely when no complexity assessment is provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-05T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).not.toContain('Complexité')
  })

  it('omits the Contexte line entirely when no contextUrl is provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-08-31T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).not.toContain('Contexte')
  })

  it('falls back to a placeholder when no result URL is available yet', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-08-31T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: undefined,
    })
    expect(body).toContain('- Résultat : _à venir_')
  })
})

describe('upsertAutomationLog', () => {
  afterEach(resetAll)

  it('creates a new journal comment when none exists yet', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/42/comments' && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 555 }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    const result = await upsertAutomationLog({
      number: 42,
      routine: 'pr-review',
      sha: 'abc1234',
      status: 'running',
      triggeredAt: '2026-08-31T10:00:00Z',
    })

    expect(result).toEqual({ commentId: 555, created: true, alreadyProcessed: false, previous: null })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/remhiit/scoreo/issues/42/comments',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates the existing journal comment instead of posting a new one', async () => {
    stubEnv()
    const existingBody = [
      '<!-- automation-log:pr-review -->',
      '## Automation — PR review',
      '',
      '- Routine : `pr-review`',
      '- Commit analysé : `old-sha`',
      '- Statut : `running`',
      '- Itération : `1`',
    ].join('\n')

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 111, body: existingBody }] })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/comments/111' && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    const result = await upsertAutomationLog({
      number: 42,
      routine: 'pr-review',
      sha: 'new-sha',
      status: 'succeeded',
      triggeredAt: '2026-08-31T11:00:00Z',
    })

    expect(result.created).toBe(false)
    expect(result.commentId).toBe(111)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/remhiit/scoreo/issues/comments/111',
      expect.objectContaining({ method: 'PATCH' }),
    )
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'POST' }))
  })

  it('flags a rerun on the same already-completed SHA as already processed', async () => {
    stubEnv()
    const existingBody = [
      '<!-- automation-log:pr-review -->',
      '## Automation — PR review',
      '',
      '- Commit analysé : `same-sha`',
      '- Statut : `succeeded`',
      '- Itération : `1`',
    ].join('\n')

    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 111, body: existingBody }] })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/comments/111' && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    const result = await upsertAutomationLog({
      number: 42,
      routine: 'pr-review',
      sha: 'same-sha',
      status: 'succeeded',
    })

    expect(result.alreadyProcessed).toBe(true)
  })

  it('does not flag a rerun still marked running as already processed', async () => {
    stubEnv()
    const existingBody = ['<!-- automation-log:pr-review -->', '- Commit analysé : `same-sha`', '- Statut : `running`'].join('\n')

    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 111, body: existingBody }] })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/comments/111' && opts?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    const result = await upsertAutomationLog({
      number: 42,
      routine: 'pr-review',
      sha: 'same-sha',
      status: 'running',
    })

    expect(result.alreadyProcessed).toBe(false)
  })

  it('ignores a journal comment belonging to a different routine', async () => {
    stubEnv()
    const otherRoutineBody = '<!-- automation-log:implement-task -->\n- Commit analysé : `x`\n- Statut : `succeeded`'

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 111, body: otherRoutineBody }] })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/42/comments' && opts?.method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ id: 222 }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    const result = await upsertAutomationLog({
      number: 42,
      routine: 'pr-review',
      sha: 'abc',
      status: 'running',
    })

    expect(result.created).toBe(true)
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/remhiit/scoreo/issues/42/comments',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})

describe('entry-point guard', () => {
  afterEach(resetAll)

  it('does not run main() on import', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('should not fetch')))

    vi.resetModules()
    await import('./automation-log.mjs')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
