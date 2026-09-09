import { describe, expect, it } from 'vitest'
import { extractRiskLevel, resolveRoutingDryRun } from './routing-dry-run.mjs'
import { assessComplexity } from './complexity-assessment.mjs'
import { consolidateComplexity } from './complexity-llm.mjs'
import { buildTaskContext } from './task-context.mjs'

function issueBody({ risk = '**Faible** — justification de test', files = true, includeRisk = true } = {}) {
  const parts = [
    "## Critères d'acceptation",
    '- [ ] critère un',
    '',
  ]
  if (files) {
    parts.push('## Fichiers impactés', '`scripts/foo.mjs`', '')
  }
  parts.push('## Hors scope', 'rien', '')
  if (includeRisk) {
    parts.push('## Catégorie de risque', '', risk, '')
  }
  return parts.join('\n')
}

function baseTaskContext(overrides = {}) {
  const { body, labels = [], routine = 'coordinator', ...rest } = overrides
  return buildTaskContext({
    eventName: 'issues',
    payload: {
      issue: {
        number: 406,
        title: 'Test',
        html_url: 'https://github.com/remhiit/scoreo/issues/406',
        state: 'open',
        labels,
        body: body ?? issueBody(),
      },
    },
    routine,
    runId: 'run-1',
    generatedAt: '2026-09-09T10:00:00Z',
    ...rest,
  })
}

function baseCatalog(overrides = {}) {
  return {
    version: 1,
    models: {
      'haiku-4-5': {
        provider: 'anthropic',
        model: 'claude-haiku-4-5',
        agent_alias: 'haiku',
        enabled: true,
        capabilities: { tools: false, structured_output: false, long_context: false },
        quality_score: 55,
        cost_tier: 'low',
        latency_tier: 'fast',
        max_risk: 'medium',
        max_complexity: 'standard',
        fallback: 'sonnet-5',
      },
      'sonnet-5': {
        provider: 'anthropic',
        model: 'claude-sonnet-5',
        agent_alias: 'sonnet',
        enabled: true,
        capabilities: { tools: false, structured_output: false, long_context: false },
        quality_score: 80,
        cost_tier: 'medium',
        latency_tier: 'medium',
        max_risk: 'high',
        max_complexity: 'very-complex',
      },
      ...overrides,
    },
  }
}

function basePolicy({ dryRun = true, band = 'trivial', model = 'haiku-4-5', fallback = 'sonnet-5', minScore = 0 } = {}) {
  return {
    version: 1,
    ...(dryRun === undefined ? {} : { dry_run: dryRun }),
    routines: {
      'implement-task': {
        required_capabilities: { tools: false, structured_output: false, long_context: false },
        bands: {
          trivial: { candidates: { primary: { model: band === 'trivial' ? model : 'haiku-4-5', weight: 100 } }, min_score: minScore, fallback: band === 'trivial' ? fallback : 'sonnet-5' },
          standard: { candidates: { primary: { model: 'sonnet-5', weight: 100 } }, min_score: 0, fallback: 'sonnet-5' },
          complex: { candidates: { primary: { model: 'sonnet-5', weight: 100 } }, min_score: 0, fallback: 'sonnet-5' },
          'very-complex': { candidates: { primary: { model: 'sonnet-5', weight: 100 } }, min_score: 0, fallback: 'sonnet-5' },
        },
      },
    },
  }
}

function baseRoutines() {
  return {
    version: 1,
    routines: {
      coordinator: {
        entity: 'issue',
        trigger_label: 'automation:ready',
        skill: 'coordinator',
        concurrency_key: 'issue',
        routing_policy: 'implement-task',
      },
    },
  }
}

describe('extractRiskLevel', () => {
  it('reads "Faible" as low', () => {
    expect(extractRiskLevel(issueBody({ risk: '**Faible** — contenu seulement' }))).toEqual({
      level: 'low',
      source: '## Catégorie de risque: **Faible**',
    })
  })

  it('reads "Élevé" as high', () => {
    expect(extractRiskLevel(issueBody({ risk: '**Élevé** — touche un port' }))).toEqual({
      level: 'high',
      source: '## Catégorie de risque: **Élevé**',
    })
  })

  it('returns null when the section is absent', () => {
    expect(extractRiskLevel(issueBody({ includeRisk: false }))).toBeNull()
  })

  it('returns null for an empty body', () => {
    expect(extractRiskLevel('')).toBeNull()
    expect(extractRiskLevel(undefined)).toBeNull()
  })

  it('returns null for an unknown label, never a guessed level', () => {
    expect(extractRiskLevel(issueBody({ risk: '**Moyen** — libellé inconnu' }))).toBeNull()
  })
})

describe('resolveRoutingDryRun', () => {
  it('chains through to a selected model with applied:false on a complete TaskContext (nominal case)', () => {
    const taskContext = baseTaskContext()
    const result = resolveRoutingDryRun({
      taskContext,
      issueBody: issueBody(),
      labels: [],
      routines: baseRoutines(),
      routingPolicy: basePolicy(),
      modelCatalog: baseCatalog(),
    })

    expect(result.missing).toEqual([])
    expect(result.complexity).toBeTruthy()
    expect(['trivial', 'standard', 'complex', 'very-complex']).toContain(result.complexity.level)
    expect(result.routing.status).toBe('selected')
    expect(result.routing.selectedModel.id).toBeTruthy()
    expect(result.applied).toBe(false)
    expect(result.escalation).toBeNull()
  })

  it('names taskContext in missing and computes no decision when taskContext is absent', () => {
    const result = resolveRoutingDryRun({
      taskContext: null,
      issueBody: issueBody(),
      routines: baseRoutines(),
      routingPolicy: basePolicy(),
      modelCatalog: baseCatalog(),
    })
    expect(result.missing).toEqual(['taskContext'])
    expect(result.complexity).toBeNull()
    expect(result.routing).toBeNull()
    expect(result.applied).toBe(false)
  })

  it('names riskLevel in missing when the risk category section is absent, and computes no decision', () => {
    const taskContext = baseTaskContext({ body: issueBody({ includeRisk: false }) })
    const result = resolveRoutingDryRun({
      taskContext,
      issueBody: issueBody({ includeRisk: false }),
      routines: baseRoutines(),
      routingPolicy: basePolicy(),
      modelCatalog: baseCatalog(),
    })
    expect(result.missing).toEqual(['riskLevel'])
    expect(result.complexity).toBeNull()
    expect(result.routing).toBeNull()
  })

  it('applies the risk_overrides / no-candidate chain into an automation:needs-human escalation, never a default model', () => {
    const taskContext = baseTaskContext()
    const policy = basePolicy({ model: 'ghost-model', fallback: 'ghost-fallback' })
    const result = resolveRoutingDryRun({
      taskContext,
      issueBody: issueBody(),
      routines: baseRoutines(),
      routingPolicy: policy,
      modelCatalog: baseCatalog(),
    })
    expect(result.routing.status).toBe('no-candidate')
    expect(result.routing.selectedModel).toBeNull()
    expect(result.escalation).toBe('automation:needs-human')
  })

  it('propagates the router error verbatim on an invalid model catalog version, rather than a partial decision', () => {
    const taskContext = baseTaskContext()
    const catalog = { ...baseCatalog(), version: 2 }
    expect(() =>
      resolveRoutingDryRun({
        taskContext,
        issueBody: issueBody(),
        routines: baseRoutines(),
        routingPolicy: basePolicy(),
        modelCatalog: catalog,
      }),
    ).toThrow(/version de catalogue inattendue/)
  })

  it('treats an absent dry_run flag as true (most cautious mode) and says so in limits', () => {
    const taskContext = baseTaskContext()
    const policy = basePolicy({ dryRun: undefined })
    delete policy.dry_run
    const result = resolveRoutingDryRun({
      taskContext,
      issueBody: issueBody(),
      routines: baseRoutines(),
      routingPolicy: policy,
      modelCatalog: baseCatalog(),
    })
    expect(result.applied).toBe(false)
    expect(result.limits).toEqual(expect.arrayContaining([expect.stringContaining('dry_run" absent')]))
  })

  it('reflects applied:true once dry_run is set to false in the policy', () => {
    const taskContext = baseTaskContext()
    const result = resolveRoutingDryRun({
      taskContext,
      issueBody: issueBody(),
      routines: baseRoutines(),
      routingPolicy: basePolicy({ dryRun: false }),
      modelCatalog: baseCatalog(),
    })
    expect(result.applied).toBe(true)
  })

  describe('LLM fallback chaining', () => {
    // Forces shouldRunLlmFallback to true deterministically: dropping the
    // "## Fichiers impactés" section leaves >= 2 dimensions unavailable
    // (dispersion, fileVolume, validationLoad, crossCuttingSurfaces, novelty).
    function taskContextNeedingFallback() {
      return baseTaskContext({ body: issueBody({ files: false }) })
    }

    it('consolidates a valid classifier response into the decision', () => {
      const taskContext = taskContextNeedingFallback()
      const heuristic = assessComplexity(taskContext, { generatedAt: '2026-09-09T10:00:00Z' })
      const llmResponse = {
        level: 'standard',
        confidence: 'medium',
        reasons: ['spec claire une fois lue en entier'],
        uncertainties: [],
        promptVersion: 1,
      }

      const result = resolveRoutingDryRun({
        taskContext,
        issueBody: issueBody({ files: false }),
        routines: baseRoutines(),
        routingPolicy: basePolicy(),
        modelCatalog: baseCatalog(),
        llmResponse,
        generatedAt: '2026-09-09T10:00:00Z',
      })

      expect(result.complexity).toEqual(consolidateComplexity(heuristic, llmResponse))
    })

    it('rejects an invalid classifier response, keeps the heuristic level, and records it in limits', () => {
      const taskContext = taskContextNeedingFallback()
      const heuristic = assessComplexity(taskContext, { generatedAt: '2026-09-09T10:00:00Z' })
      const invalidResponse = { level: 'not-a-level', confidence: 'medium', reasons: [], uncertainties: [], promptVersion: 1 }

      const result = resolveRoutingDryRun({
        taskContext,
        issueBody: issueBody({ files: false }),
        routines: baseRoutines(),
        routingPolicy: basePolicy(),
        modelCatalog: baseCatalog(),
        llmResponse: invalidResponse,
        generatedAt: '2026-09-09T10:00:00Z',
      })

      expect(result.complexity).toEqual(heuristic)
      expect(result.limits).toEqual(expect.arrayContaining([expect.stringContaining('réponse du classifieur invalide')]))
    })

    it('keeps the heuristic and notes it in limits when a fallback was warranted but no classifier response was supplied', () => {
      const taskContext = taskContextNeedingFallback()
      const heuristic = assessComplexity(taskContext, { generatedAt: '2026-09-09T10:00:00Z' })

      const result = resolveRoutingDryRun({
        taskContext,
        issueBody: issueBody({ files: false }),
        routines: baseRoutines(),
        routingPolicy: basePolicy(),
        modelCatalog: baseCatalog(),
        generatedAt: '2026-09-09T10:00:00Z',
      })

      expect(result.complexity).toEqual(heuristic)
      expect(result.limits).toEqual(expect.arrayContaining([expect.stringContaining('aucune réponse de classifieur fournie')]))
    })
  })
})
