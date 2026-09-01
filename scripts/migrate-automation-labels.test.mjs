import { afterEach, describe, expect, it, vi } from 'vitest'

function issue(number, labelNames, { isPR = false } = {}) {
  return {
    number,
    labels: labelNames.map((name) => ({ name })),
    ...(isPR ? { pull_request: {} } : {}),
  }
}

describe('detectConflicts', () => {
  it('returns no conflict when labels are clean', async () => {
    const { detectConflicts } = await import('./migrate-automation-labels.mjs')
    expect(detectConflicts(['P1', 'ready'])).toEqual([])
    expect(detectConflicts(['P1', 'automation:ready'])).toEqual([])
  })

  it('flags an old label coexisting with its new equivalent', async () => {
    const { detectConflicts } = await import('./migrate-automation-labels.mjs')
    const conflicts = detectConflicts(['needs-fix', 'automation:needs-fix'])
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]).toContain('needs-fix')
  })

  it('flags more than one attempt-N counter (old, new, or mixed forms)', async () => {
    const { detectConflicts } = await import('./migrate-automation-labels.mjs')
    expect(detectConflicts(['attempt-1', 'attempt-2'])).toHaveLength(1)
    expect(detectConflicts(['automation:attempt-1', 'automation:attempt-2'])).toHaveLength(1)
    expect(detectConflicts(['attempt-1', 'automation:attempt-2'])).toHaveLength(1)
    expect(detectConflicts(['attempt-1'])).toEqual([])
  })

  it('flags review-pass and needs-fix present simultaneously', async () => {
    const { detectConflicts } = await import('./migrate-automation-labels.mjs')
    expect(detectConflicts(['automation:review-pass', 'automation:needs-fix'])).toHaveLength(1)
    expect(detectConflicts(['review-pass', 'needs-fix'])).toHaveLength(1)
  })

  it('flags needs-human present with a queue/trigger label', async () => {
    const { detectConflicts } = await import('./migrate-automation-labels.mjs')
    expect(detectConflicts(['needs-human', 'ready'])).toHaveLength(1)
    expect(detectConflicts(['automation:needs-human', 'automation:needs-review'])).toHaveLength(1)
    expect(detectConflicts(['automation:needs-human', 'automation:needs-fix'])).toHaveLength(1)
    expect(detectConflicts(['needs-human'])).toEqual([])
  })

  it('can report multiple simultaneous conflicts', async () => {
    const { detectConflicts } = await import('./migrate-automation-labels.mjs')
    const conflicts = detectConflicts(['attempt-1', 'attempt-2', 'review-pass', 'needs-fix'])
    expect(conflicts.length).toBeGreaterThanOrEqual(2)
  })
})

describe('migrationsFor', () => {
  it('returns nothing when no old label is present', async () => {
    const { migrationsFor } = await import('./migrate-automation-labels.mjs')
    expect(migrationsFor(['P1', 'automation:ready', 'blocked'])).toEqual([])
  })

  it('lists every old label needing migration, preserving business labels implicitly', async () => {
    const { migrationsFor } = await import('./migrate-automation-labels.mjs')
    expect(migrationsFor(['P1', 'ready', 'blocked'])).toEqual([{ oldName: 'ready', newName: 'automation:ready' }])
  })
})

describe('migrateItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing and reports noop when no old label is present', async () => {
    const { migrateItem } = await import('./migrate-automation-labels.mjs')
    const addLabel = vi.fn()
    const removeLabel = vi.fn()
    const getLabels = vi.fn()

    const result = await migrateItem(issue(1, ['P1', 'automation:ready']), { addLabel, removeLabel, getLabels })

    expect(result.status).toBe('noop')
    expect(addLabel).not.toHaveBeenCalled()
    expect(removeLabel).not.toHaveBeenCalled()
  })

  it('adds the new label, verifies it, then removes the old one', async () => {
    const { migrateItem } = await import('./migrate-automation-labels.mjs')
    const addLabel = vi.fn().mockResolvedValue(undefined)
    const removeLabel = vi.fn().mockResolvedValue(undefined)
    const getLabels = vi.fn().mockResolvedValue(['P2', 'automation:ready'])

    const result = await migrateItem(issue(42, ['P2', 'ready']), { addLabel, removeLabel, getLabels })

    expect(result.status).toBe('migrated')
    expect(addLabel).toHaveBeenCalledWith(42, 'automation:ready')
    expect(removeLabel).toHaveBeenCalledWith(42, 'ready')
    expect(result.actions).toEqual([{ oldName: 'ready', newName: 'automation:ready', result: 'migrated' }])
  })

  it('migrates a pull request the same way, reporting kind "pull_request"', async () => {
    const { migrateItem } = await import('./migrate-automation-labels.mjs')
    const addLabel = vi.fn().mockResolvedValue(undefined)
    const removeLabel = vi.fn().mockResolvedValue(undefined)
    const getLabels = vi.fn().mockResolvedValue(['automation:needs-fix'])

    const result = await migrateItem(issue(7, ['needs-fix'], { isPR: true }), { addLabel, removeLabel, getLabels })

    expect(result.kind).toBe('pull_request')
    expect(result.status).toBe('migrated')
  })

  it('does not remove the old label if the new one fails verification', async () => {
    const { migrateItem } = await import('./migrate-automation-labels.mjs')
    const addLabel = vi.fn().mockResolvedValue(undefined)
    const removeLabel = vi.fn().mockResolvedValue(undefined)
    const getLabels = vi.fn().mockResolvedValue(['P2']) // new label absent despite the POST

    const result = await migrateItem(issue(43, ['ready']), { addLabel, removeLabel, getLabels })

    expect(result.status).toBe('partial')
    expect(removeLabel).not.toHaveBeenCalled()
    expect(result.actions[0].result).toBe('failed')
  })

  it('is a no-op replay on an item already fully migrated', async () => {
    const { migrateItem } = await import('./migrate-automation-labels.mjs')
    const addLabel = vi.fn()
    const removeLabel = vi.fn()
    const getLabels = vi.fn()

    const result = await migrateItem(issue(44, ['P3', 'automation:needs-fix']), { addLabel, removeLabel, getLabels })

    expect(result.status).toBe('noop')
    expect(addLabel).not.toHaveBeenCalled()
    expect(removeLabel).not.toHaveBeenCalled()
  })

  it('touches nothing and reports a conflict when labels are incompatible', async () => {
    const { migrateItem } = await import('./migrate-automation-labels.mjs')
    const addLabel = vi.fn()
    const removeLabel = vi.fn()
    const getLabels = vi.fn()

    const result = await migrateItem(issue(45, ['needs-human', 'ready']), { addLabel, removeLabel, getLabels })

    expect(result.status).toBe('conflict')
    expect(result.conflicts.length).toBeGreaterThan(0)
    expect(addLabel).not.toHaveBeenCalled()
    expect(removeLabel).not.toHaveBeenCalled()
  })
})

describe('migrateAllOpenItems', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('aggregates results across items and flags a nonzero-exit condition when a conflict is found', async () => {
    const { migrateAllOpenItems } = await import('./migrate-automation-labels.mjs')
    const items = [issue(1, ['ready']), issue(2, ['needs-human', 'needs-review']), issue(3, ['automation:ready'])]
    const listOpenItems = vi.fn().mockResolvedValue(items)
    const addLabel = vi.fn().mockResolvedValue(undefined)
    const removeLabel = vi.fn().mockResolvedValue(undefined)
    const getLabels = vi.fn().mockResolvedValue(['automation:ready'])

    const summary = await migrateAllOpenItems({ listOpenItems, addLabel, removeLabel, getLabels })

    expect(summary.migratedCount).toBe(1)
    expect(summary.noopCount).toBe(1)
    expect(summary.conflictCount).toBe(1)
    expect(summary.partialCount).toBe(0)
  })

  it('reports zero conflicts and zero partial failures when every item is clean', async () => {
    const { migrateAllOpenItems } = await import('./migrate-automation-labels.mjs')
    const listOpenItems = vi.fn().mockResolvedValue([issue(1, ['automation:ready']), issue(2, ['P1'])])
    const addLabel = vi.fn()
    const removeLabel = vi.fn()
    const getLabels = vi.fn()

    const summary = await migrateAllOpenItems({ listOpenItems, addLabel, removeLabel, getLabels })

    expect(summary.conflictCount).toBe(0)
    expect(summary.partialCount).toBe(0)
  })
})

describe('entry-point guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('does not run main() on import', async () => {
    vi.stubEnv('GH_TOKEN', 'token')
    vi.stubEnv('REPO_OWNER', 'remhiit')
    vi.stubEnv('REPO_NAME', 'scoreo')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.reject(new Error('should not fetch')))

    vi.resetModules()
    await import('./migrate-automation-labels.mjs')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
