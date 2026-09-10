import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { buildRunMetrics } from './run-metrics.mjs'
import { CALIBRATION_THRESHOLDS, CALIBRATION_VERSION, aggregateRunMetrics, proposeCalibration } from './routing-calibration.mjs'

function record(overrides = {}) {
  const { valid, errors, metrics } = buildRunMetrics({
    routine: 'implement-task',
    entity: { type: 'issue', number: 1 },
    startedAt: '2026-09-01T10:00:00.000Z',
    endedAt: '2026-09-01T10:10:00.000Z',
    complexity: { band: 'standard', provenance: 'heuristic' },
    risk: { level: 'low' },
    routing: { proposedModel: 'sonnet-5', actualModel: 'sonnet-5', activationMode: 'observe', fallbacks: [] },
    configVersions: { taskContext: 1, routingPolicy: 1, modelCatalog: 1 },
    outcome: { status: 'succeeded', fixIterations: 0, ciGreenFirstPass: true, escalation: null },
    findings: { functional: 0, technical: 0 },
    usage: { compactionObserved: false, usageLimitApproached: false },
    generatedAt: '2026-09-01T10:10:01.000Z',
    ...overrides,
  })
  if (!valid) throw new Error(`fixture invalide : ${errors.join(' ; ')}`)
  return metrics
}

describe('aggregateRunMetrics — agrégation', () => {
  it('groups by routine and band, computes correct averages, and excludes incomplete records from them', () => {
    const records = [
      record({ outcome: { status: 'succeeded', fixIterations: 0, ciGreenFirstPass: true, escalation: null }, routing: { proposedModel: 'sonnet-5', actualModel: 'sonnet-5', activationMode: 'observe', fallbacks: [] } }),
      record({ outcome: { status: 'succeeded', fixIterations: 1, ciGreenFirstPass: true, escalation: null }, routing: { proposedModel: 'sonnet-5', actualModel: 'sonnet-5', activationMode: 'observe', fallbacks: [] } }),
      record({ outcome: { status: 'failed', fixIterations: 2, ciGreenFirstPass: false, escalation: null }, routing: { proposedModel: 'sonnet-5', actualModel: 'sonnet-5', activationMode: 'observe', fallbacks: [] } }),
      record({ outcome: { status: 'succeeded', fixIterations: 0, ciGreenFirstPass: true, escalation: null }, routing: { proposedModel: 'opus-5', actualModel: 'opus-5', activationMode: 'observe', fallbacks: [] } }),
      record({ outcome: { status: 'succeeded', fixIterations: 1, ciGreenFirstPass: true, escalation: 'automation:needs-human' }, routing: { proposedModel: 'sonnet-5', actualModel: 'sonnet-5', activationMode: 'observe', fallbacks: [] } }),
      record({ outcome: { status: 'failed', fixIterations: 3, ciGreenFirstPass: false, escalation: null }, routing: { proposedModel: 'sonnet-5', actualModel: 'sonnet-5', activationMode: 'observe', fallbacks: [] } }),
      // Incomplete records (missing usage) in the very same group — must be
      // excluded from every average above, and counted separately.
      record({ usage: undefined }),
      record({ usage: undefined }),
      // A different group entirely (routine + band both differ).
      record({ routine: 'pr-review', complexity: { band: 'complex', provenance: 'heuristic' } }),
    ]

    const aggregate = aggregateRunMetrics(records)

    expect(aggregate.rejected).toBe(0)
    expect(aggregate.completeRecords).toBe(7)
    expect(aggregate.incompleteRecords).toBe(2)
    expect(aggregate.insufficientData).toBe(false)

    const standard = aggregate.groups.find((g) => g.routine === 'implement-task' && g.band === 'standard')
    expect(standard.totalRuns).toBe(6)
    expect(standard.incompleteRuns).toBe(2)
    expect(standard.ciGreenFirstPassRate).toBeCloseTo(4 / 6)
    expect(standard.avgFixIterations).toBeCloseTo(7 / 6)
    expect(standard.escalatedRate).toBeCloseTo(1 / 6)
    expect(standard.proposedModels).toEqual({ 'sonnet-5': 5, 'opus-5': 1 })
    expect(standard.actualModels).toEqual({ 'sonnet-5': 5, 'opus-5': 1 })

    const complex = aggregate.groups.find((g) => g.routine === 'pr-review' && g.band === 'complex')
    expect(complex.totalRuns).toBe(1)
    expect(complex.incompleteRuns).toBe(0)
    expect(complex.ciGreenFirstPassRate).toBe(1)
  })

  it('never averages a group with zero complete runs', () => {
    const aggregate = aggregateRunMetrics([record({ usage: undefined })])
    const group = aggregate.groups.find((g) => g.routine === 'implement-task' && g.band === 'standard')
    expect(group.totalRuns).toBe(0)
    expect(group.incompleteRuns).toBe(1)
    expect(group.ciGreenFirstPassRate).toBeNull()
    expect(group.avgFixIterations).toBeNull()
    expect(group.escalatedRate).toBeNull()
  })

  it('applies the "since" filter on generatedAt', () => {
    const records = [
      record({ generatedAt: '2026-08-01T00:00:00.000Z' }),
      record({ generatedAt: '2026-09-05T00:00:00.000Z' }),
    ]
    const aggregate = aggregateRunMetrics(records, { since: '2026-09-01T00:00:00.000Z' })
    expect(aggregate.completeRecords).toBe(1)
  })
})

describe('aggregateRunMetrics — période vide', () => {
  it('reports "données insuffisantes" (insufficientData) and no groups for an empty input', () => {
    const aggregate = aggregateRunMetrics([])
    expect(aggregate.insufficientData).toBe(true)
    expect(aggregate.completeRecords).toBe(0)
    expect(aggregate.groups).toEqual([])
  })

  it('reports insufficientData when every record is incomplete', () => {
    const aggregate = aggregateRunMetrics([record({ usage: undefined }), record({ complexity: null, risk: { level: 'low' } })])
    expect(aggregate.insufficientData).toBe(true)
    expect(aggregate.completeRecords).toBe(0)
    expect(aggregate.incompleteRecords).toBe(2)
  })
})

describe('aggregateRunMetrics — rejets', () => {
  it('ignores off-schema records and counts them separately, without touching the aggregation', () => {
    const records = [record(), { foo: 'bar' }, null, { version: 1 }]
    const aggregate = aggregateRunMetrics(records)
    expect(aggregate.rejected).toBe(3)
    expect(aggregate.completeRecords).toBe(1)
  })
})

const POLICY = {
  version: 1,
  routines: {
    'implement-task': {
      required_capabilities: { tools: true, structured_output: false, long_context: true },
      bands: {
        trivial: { candidates: { primary: { model: 'haiku-4-5', weight: 70 }, secondary: { model: 'sonnet-5', weight: 30 } }, min_score: 40, fallback: 'opus-5' },
        standard: { candidates: { primary: { model: 'sonnet-5', weight: 60 }, secondary: { model: 'opus-5', weight: 40 } }, min_score: 60, fallback: 'opus-5' },
        complex: { candidates: { primary: { model: 'sonnet-5', weight: 60 }, secondary: { model: 'opus-5', weight: 40 } }, min_score: 75, fallback: 'opus-5' },
        'very-complex': { candidates: { primary: { model: 'opus-5', weight: 100 } }, min_score: 90, fallback: 'opus-5' },
      },
    },
  },
}

function groupFixture(overrides = {}) {
  return {
    routine: 'implement-task',
    band: 'standard',
    totalRuns: 10,
    incompleteRuns: 0,
    ciGreenFirstPassRate: 0.7,
    avgFixIterations: 1,
    escalatedRate: 0,
    proposedModels: { 'sonnet-5': 8, 'opus-5': 2 },
    actualModels: { 'sonnet-5': 8, 'opus-5': 2 },
    ...overrides,
  }
}

describe('proposeCalibration — propositions', () => {
  it('carries the five required fields on every proposal', () => {
    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 0.3, escalatedRate: 0.1 })] }
    const { proposals } = proposeCalibration(aggregate, POLICY)

    expect(proposals.length).toBeGreaterThan(0)
    for (const proposal of proposals) {
      expect(proposal).toMatchObject({
        configKey: expect.any(String),
        currentValue: expect.anything(),
        proposedValue: expect.anything(),
        metric: expect.any(String),
        proposalVersion: CALIBRATION_VERSION,
      })
    }
    expect(proposals[0].configKey).toBe('routines.implement-task.bands.standard.min_score')
    expect(proposals[0].currentValue).toBe(60)
    expect(proposals[0].proposedValue).toBe(65)
  })

  it('proposes raising min_score when CI-green-first-pass is low', () => {
    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 0.3 })] }
    const { proposals, skipped } = proposeCalibration(aggregate, POLICY)
    expect(proposals).toEqual([
      expect.objectContaining({ configKey: 'routines.implement-task.bands.standard.min_score', currentValue: 60, proposedValue: 65 }),
    ])
    expect(skipped).toEqual([])
  })

  it('proposes lowering min_score and boosting the majority-proposed candidate weight when the band performs very well', () => {
    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 1, escalatedRate: 0, proposedModels: { 'sonnet-5': 9, 'opus-5': 1 } })] }
    const { proposals } = proposeCalibration(aggregate, POLICY)

    expect(proposals).toContainEqual(
      expect.objectContaining({ configKey: 'routines.implement-task.bands.standard.min_score', currentValue: 60, proposedValue: 55 }),
    )
    expect(proposals).toContainEqual(
      expect.objectContaining({ configKey: 'routines.implement-task.bands.standard.candidates.primary.weight', currentValue: 60, proposedValue: 70 }),
    )
  })

  it('produces no proposal for a group under the sample-size threshold, and states why', () => {
    const aggregate = { groups: [groupFixture({ totalRuns: 2, ciGreenFirstPassRate: 0.1 })] }
    const { proposals, skipped } = proposeCalibration(aggregate, POLICY)

    expect(proposals).toEqual([])
    expect(skipped).toEqual([
      expect.objectContaining({ routine: 'implement-task', band: 'standard', reason: expect.stringMatching(/seuil/) }),
    ])
  })

  it('honours a custom minSampleSize', () => {
    const aggregate = { groups: [groupFixture({ totalRuns: 2, ciGreenFirstPassRate: 0.1 })] }
    const { proposals } = proposeCalibration(aggregate, POLICY, { minSampleSize: 2 })
    expect(proposals.length).toBeGreaterThan(0)
  })

  it('states explicitly when no adjustment is justified by the data', () => {
    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 0.7, escalatedRate: 0.05 })] }
    const { proposals, skipped } = proposeCalibration(aggregate, POLICY)

    expect(proposals).toEqual([])
    expect(skipped).toEqual([
      expect.objectContaining({ routine: 'implement-task', band: 'standard', reason: expect.stringMatching(/aucun ajustement justifié/) }),
    ])
  })

  it('names the min_score bound explicitly, rather than the generic "no adjustment" reason, when it is already at its ceiling', () => {
    const policyAtCeiling = { routines: { 'implement-task': { bands: { standard: { ...POLICY.routines['implement-task'].bands.standard, min_score: 100 } } } } }
    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 0.1 })] }
    const { proposals, skipped } = proposeCalibration(aggregate, policyAtCeiling)

    expect(proposals).toEqual([])
    expect(skipped).toEqual([
      expect.objectContaining({ routine: 'implement-task', band: 'standard', reason: expect.stringMatching(/déjà au plafond/) }),
    ])
  })

  it('names the min_score bound explicitly when it is already at its floor', () => {
    const policyAtFloor = { routines: { 'implement-task': { bands: { standard: { candidates: { primary: { model: 'sonnet-5', weight: 100 } }, min_score: 0, fallback: 'opus-5' } } } } }
    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 1, escalatedRate: 0, proposedModels: {} })] }
    const { proposals, skipped } = proposeCalibration(aggregate, policyAtFloor)

    expect(proposals).toEqual([])
    expect(skipped).toEqual([
      expect.objectContaining({ routine: 'implement-task', band: 'standard', reason: expect.stringMatching(/déjà au plancher/) }),
    ])
  })

  it('skips a group whose routine has no matching entry in the policy, naming why', () => {
    const aggregate = { groups: [groupFixture({ routine: 'coordinator', ciGreenFirstPassRate: 0.1 })] }
    const { proposals, skipped } = proposeCalibration(aggregate, POLICY)

    expect(proposals).toEqual([])
    expect(skipped).toEqual([expect.objectContaining({ routine: 'coordinator', band: 'standard', reason: expect.stringMatching(/aucune politique/) })])
  })

  it('skips a group with an unknown complexity band — built by aggregateRunMetrics itself, not a hand-crafted aggregate', () => {
    // A `band: 'unknown'` group only ever arises from incomplete records
    // (buildRunMetrics guarantees `complexity` is known whenever
    // `complete: true`), so it never carries `totalRuns > 0` on its own —
    // exercising this guard for real requires disabling the sample-size
    // guard above it (`minSampleSize: 0`), not asserting on a synthetic
    // aggregate shape `aggregateRunMetrics` would never itself produce.
    const aggregate = aggregateRunMetrics([record({ complexity: null })])
    const unknownGroup = aggregate.groups.find((g) => g.band === 'unknown')
    expect(unknownGroup).toBeTruthy()

    const { proposals, skipped } = proposeCalibration(aggregate, POLICY, { minSampleSize: 0 })

    expect(proposals).toEqual([])
    expect(skipped).toEqual([expect.objectContaining({ routine: 'implement-task', band: 'unknown' })])
  })
})

describe('proposeCalibration — non-application', () => {
  it('never writes to .automation/routing-policy.yml', () => {
    const before = readFileSync('.automation/routing-policy.yml', 'utf8')

    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 0.2 })] }
    proposeCalibration(aggregate, POLICY)

    const after = readFileSync('.automation/routing-policy.yml', 'utf8')
    expect(after).toBe(before)
  })

  it('never mutates the policy object it was passed', () => {
    const policyBefore = JSON.parse(JSON.stringify(POLICY))
    const aggregate = { groups: [groupFixture({ ciGreenFirstPassRate: 1, escalatedRate: 0 })] }
    proposeCalibration(aggregate, POLICY)
    expect(POLICY).toEqual(policyBefore)
  })
})

describe('CALIBRATION_THRESHOLDS', () => {
  it('is exported for callers/tests to reference rather than duplicate', () => {
    expect(CALIBRATION_THRESHOLDS.minSampleSize).toBeGreaterThan(0)
    expect(CALIBRATION_THRESHOLDS.ciGreenLow).toBeLessThan(CALIBRATION_THRESHOLDS.ciGreenHigh)
  })
})
