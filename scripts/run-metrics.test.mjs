import { describe, expect, it } from 'vitest'
import { RUN_METRICS_VERSION, buildRunMetrics, validateRunMetrics } from './run-metrics.mjs'

function fullInput(overrides = {}) {
  return {
    routine: 'coordinator-implement',
    entity: { type: 'issue', number: 477 },
    startedAt: '2026-09-09T10:00:00.000Z',
    endedAt: '2026-09-09T10:12:30.000Z',
    complexity: { band: 'standard', provenance: 'heuristic' },
    risk: { level: 'low' },
    routing: {
      proposedModel: 'claude-sonnet-5',
      actualModel: 'claude-sonnet-5',
      activationMode: 'observe',
      fallbacks: ['claude-haiku-4-5'],
    },
    configVersions: { taskContext: 1, routingPolicy: 1, modelCatalog: 1 },
    outcome: { status: 'succeeded', fixIterations: 1, ciGreenFirstPass: false, escalation: null },
    findings: { functional: 2, technical: 0 },
    usage: { compactionObserved: false, usageLimitApproached: false },
    generatedAt: '2026-09-09T10:12:31.000Z',
    ...overrides,
  }
}

describe('buildRunMetrics — assemblage nominal', () => {
  it('produces a complete, valid record from a fully-known run', () => {
    const { valid, errors, metrics } = buildRunMetrics(fullInput())

    expect(valid).toBe(true)
    expect(errors).toEqual([])
    expect(metrics).toMatchObject({
      version: RUN_METRICS_VERSION,
      routine: 'coordinator-implement',
      entity: { type: 'issue', number: 477 },
      durationSeconds: 750,
      complexity: { band: 'standard', provenance: 'heuristic' },
      risk: { level: 'low' },
      routing: {
        proposedModel: 'claude-sonnet-5',
        actualModel: 'claude-sonnet-5',
        activationMode: 'observe',
        fallbacks: ['claude-haiku-4-5'],
      },
      configVersions: { taskContext: 1, routingPolicy: 1, modelCatalog: 1 },
      outcome: { status: 'succeeded', fixIterations: 1, ciGreenFirstPass: false, escalation: null },
      findings: { functional: 2, technical: 0 },
      usage: { compactionObserved: false, usageLimitApproached: false },
      complete: true,
      missingFields: [],
    })
  })

  it('throws when "routine" is missing — a record can never identify no run at all', () => {
    expect(() => buildRunMetrics(fullInput({ routine: undefined }))).toThrow(/"routine" est requis/)
  })

  it('throws when "outcome.status" is missing — this record only describes a run that reached an end', () => {
    expect(() => buildRunMetrics(fullInput({ outcome: { fixIterations: 0, ciGreenFirstPass: true, escalation: null } }))).toThrow(
      /outcome\.status/,
    )
  })
})

describe('buildRunMetrics — complétude', () => {
  const cases = [
    ['entity', { entity: null }, 'entity'],
    ['startedAt/endedAt', { startedAt: null, endedAt: null }, 'durationSeconds'],
    ['complexity', { complexity: null }, 'complexity'],
    ['risk', { risk: null }, 'risk'],
    ['routing entier', { routing: null }, 'routing'],
    ['routing.actualModel', { routing: { proposedModel: 'claude-sonnet-5', actualModel: null, activationMode: 'observe', fallbacks: [] } }, 'routing.actualModel'],
    ['configVersions.modelCatalog', { configVersions: { taskContext: 1, routingPolicy: 1, modelCatalog: null } }, 'configVersions.modelCatalog'],
    ['outcome.fixIterations', { outcome: { status: 'succeeded', fixIterations: null, ciGreenFirstPass: true, escalation: null } }, 'outcome.fixIterations'],
    ['outcome.ciGreenFirstPass', { outcome: { status: 'succeeded', fixIterations: 0, ciGreenFirstPass: null, escalation: null } }, 'outcome.ciGreenFirstPass'],
    ['findings entier', { findings: null }, 'findings'],
    ['findings.technical', { findings: { functional: 1, technical: null } }, 'findings.technical'],
    ['usage entier', { usage: null }, 'usage'],
    ['usage.compactionObserved', { usage: { compactionObserved: null, usageLimitApproached: false } }, 'usage.compactionObserved'],
  ]

  it.each(cases)('removing %s produces complete=false and names it', (_label, overrides, expectedMissing) => {
    const { valid, metrics } = buildRunMetrics(fullInput(overrides))
    expect(valid).toBe(true)
    expect(metrics.complete).toBe(false)
    expect(metrics.missingFields).toContain(expectedMissing)
  })

  it('never defaults an unknown actualModel to the proposed model', () => {
    const { metrics } = buildRunMetrics(
      fullInput({ routing: { proposedModel: 'claude-sonnet-5', actualModel: null, activationMode: 'observe', fallbacks: [] } }),
    )
    expect(metrics.routing.actualModel).toBeNull()
    expect(metrics.routing.proposedModel).toBe('claude-sonnet-5')
  })

  it('names routing fields as missing, and keeps the record, when no routing decision was computable', () => {
    const { valid, metrics } = buildRunMetrics(fullInput({ routing: null }))
    expect(valid).toBe(true)
    expect(metrics.routing).toBeNull()
    expect(metrics.complete).toBe(false)
    expect(metrics.missingFields).toContain('routing')
  })

  it('does not treat a null proposedModel/actualModel as missing when routing.status is "no-candidate"', () => {
    const { valid, metrics } = buildRunMetrics(
      fullInput({
        routing: { status: 'no-candidate', proposedModel: null, actualModel: null, activationMode: 'observe', fallbacks: [] },
      }),
    )
    expect(valid).toBe(true)
    expect(metrics.complete).toBe(true)
    expect(metrics.missingFields).not.toContain('routing.proposedModel')
    expect(metrics.missingFields).not.toContain('routing.actualModel')
  })

  it('still treats a null proposedModel/actualModel as missing when routing.status is absent or unknown', () => {
    const { metrics: withoutStatus } = buildRunMetrics(
      fullInput({ routing: { proposedModel: null, actualModel: null, activationMode: 'observe', fallbacks: [] } }),
    )
    expect(withoutStatus.missingFields).toContain('routing.proposedModel')
    expect(withoutStatus.missingFields).toContain('routing.actualModel')

    const { metrics: unknownStatus } = buildRunMetrics(
      fullInput({ routing: { status: 'bogus', proposedModel: null, actualModel: null, activationMode: 'observe', fallbacks: [] } }),
    )
    expect(unknownStatus.missingFields).toContain('routing.proposedModel')
    expect(unknownStatus.missingFields).toContain('routing.actualModel')
  })
})

describe('buildRunMetrics — validation', () => {
  it('rejects a record built from an out-of-enum complexity band instead of publishing it truncated', () => {
    const result = buildRunMetrics(fullInput({ complexity: { band: 'medium', provenance: 'heuristic' } }))
    expect(result.valid).toBe(false)
    expect(result.metrics).toBeNull()
    expect(result.errors.some((e) => e.includes('complexity'))).toBe(true)
  })
})

describe('buildRunMetrics — rédaction', () => {
  it('redacts a secret-looking pattern found in the escalation reason', () => {
    const { metrics } = buildRunMetrics(
      fullInput({ outcome: { status: 'failed', fixIterations: 3, ciGreenFirstPass: false, escalation: 'token: ghp_abcdefghijklmnopqrstuvwxyz0123456789' } }),
    )
    expect(metrics.outcome.escalation).not.toContain('ghp_abcdefghijklmnopqrstuvwxyz0123456789')
    expect(metrics.outcome.escalation).toContain('[REDACTED')
  })
})

describe('validateRunMetrics', () => {
  it('accepts a well-formed record', () => {
    const { metrics } = buildRunMetrics(fullInput())
    expect(validateRunMetrics(metrics)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a non-object root', () => {
    expect(validateRunMetrics(null).valid).toBe(false)
    expect(validateRunMetrics('nope').valid).toBe(false)
  })

  it('rejects the wrong version', () => {
    const { metrics } = buildRunMetrics(fullInput())
    const result = validateRunMetrics({ ...metrics, version: 2 })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('version'))).toBe(true)
  })

  it('rejects an out-of-enum risk level', () => {
    const { metrics } = buildRunMetrics(fullInput())
    const result = validateRunMetrics({ ...metrics, risk: { level: 'critical' } })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('risk'))).toBe(true)
  })

  it('rejects a missing required field', () => {
    const { metrics } = buildRunMetrics(fullInput())
    const { version: _version, ...withoutVersion } = metrics
    const result = validateRunMetrics(withoutVersion)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('version'))).toBe(true)
  })

  it('rejects a wrong-typed field', () => {
    const { metrics } = buildRunMetrics(fullInput())
    const result = validateRunMetrics({ ...metrics, durationSeconds: 'quick' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('durationSeconds'))).toBe(true)
  })

  it('rejects complete=true left standing next to a non-empty missingFields', () => {
    const { metrics } = buildRunMetrics(fullInput())
    const result = validateRunMetrics({ ...metrics, complete: true, missingFields: ['risk'] })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('complete'))).toBe(true)
  })

  it('rejects a wrong-typed generatedAt', () => {
    const { metrics } = buildRunMetrics(fullInput())
    const result = validateRunMetrics({ ...metrics, generatedAt: new Date() })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('generatedAt'))).toBe(true)
  })
})
