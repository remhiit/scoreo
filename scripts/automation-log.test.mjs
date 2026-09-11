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

  it('surfaces the LLM fallback trail (heuristic/LLM/consolidated levels, confidence, prompt version) via limits', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const { consolidateComplexity } = await import('./complexity-llm.mjs')
    const heuristic = {
      level: 'complex',
      score: 52,
      confidence: 'high',
      provenance: 'heuristic',
      override: null,
      dimensions: {},
      reasons: [],
      limits: [],
      thresholds: { version: 1, bands: [] },
      generatedAt: '2026-09-08T10:00:00Z',
      escalationRequired: false,
    }
    const consolidated = consolidateComplexity(heuristic, {
      level: 'standard',
      confidence: 'medium',
      reasons: ['spec claire une fois lue en entier'],
      uncertainties: [],
      promptVersion: 1,
    })

    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      complexity: consolidated,
    })

    expect(body).toContain('- Complexité : `standard` (score 52/100, confiance `medium`, provenance `llm`)')
    expect(body).toContain('- Limites : fallback LLM (version de prompt 1)')
    expect(body).toContain('heuristique "complex"')
    expect(body).toContain('LLM "standard"')
    expect(body).toContain('niveau retenu "standard"')
    expect(body).toContain('confiance consolidée "medium"')
    expect(body).not.toContain('Escalade requise')
  })

  it('surfaces a dedicated escalation line when the LLM fallback disagrees by two or more bands, distinct from an ordinary low confidence', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const { consolidateComplexity } = await import('./complexity-llm.mjs')
    const heuristic = {
      level: 'trivial',
      score: 5,
      confidence: 'high',
      provenance: 'heuristic',
      override: null,
      dimensions: {},
      reasons: [],
      limits: [],
      thresholds: { version: 1, bands: [] },
      generatedAt: '2026-09-08T10:00:00Z',
      escalationRequired: false,
    }
    const consolidated = consolidateComplexity(heuristic, {
      level: 'very-complex',
      confidence: 'high',
      reasons: ['spec sous-estimée par le score heuristique'],
      uncertainties: [],
      promptVersion: 1,
    })

    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      complexity: consolidated,
    })

    expect(body).toContain('confiance `low`')
    expect(body).toContain('⚠️ Escalade requise')
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

  it('publishes the RoutingDecision in a structured readable form when provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [{ id: 'opus-5', provider: 'anthropic', model: 'claude-opus-5', agentAlias: 'opus', origin: 'band_fallback' }],
        input: { complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' }, risk: { level: 'medium' } },
        rulesApplied: ['candidat retenu : "sonnet-5" (origine: band)'],
        limits: [],
      },
    })
    expect(body).toContain('- Routage : `sonnet-5` (origine `band`, risque `medium`, bande `standard`)')
    expect(body).toContain('  - Fallbacks : opus-5')
    expect(body).toContain('  - Règles appliquées : candidat retenu : "sonnet-5" (origine: band)')
  })

  it('publishes a "no candidate" RoutingDecision explicitly rather than omitting it', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      routing: {
        status: 'no-candidate',
        selectedModel: null,
        fallbacks: [],
        input: { complexity: { level: 'complex', effectiveLevel: 'complex', confidence: 'high' }, risk: { level: 'high' } },
        rulesApplied: ['aucun candidat éligible sur toute la chaîne (bande, fallback de bande, fallback de catalogue) → no-candidate'],
        limits: [],
      },
    })
    expect(body).toContain('- Routage : `aucun candidat` (risque `high`, bande `complex`)')
  })

  it('renders the three config versions and an explicit "not applied" mention for an observed routing decision (#406)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      taskContextVersion: 1,
      routingApplied: false,
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [],
        input: {
          complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' },
          risk: { level: 'low' },
          catalogVersion: 1,
          policyVersion: 1,
        },
        rulesApplied: [],
        limits: [],
      },
    })
    expect(body).toContain('- Configuration : TaskContext v1, politique v1, catalogue v1')
    expect(body).toContain('- Modèle appliqué : non (mode observation) — le sous-agent réel a été lancé sans override de modèle')
  })

  it('renders "Modèle appliqué : oui" once routingApplied is true', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      taskContextVersion: 1,
      routingApplied: true,
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [],
        input: {
          complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' },
          risk: { level: 'low' },
          catalogVersion: 1,
          policyVersion: 1,
        },
        rulesApplied: [],
        limits: [],
      },
    })
    expect(body).toContain('- Modèle appliqué : oui — le sous-agent a été lancé avec ce modèle')
  })

  it('renders the resolved activation mode and its reason next to the proposed model (issue #476)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      taskContextVersion: 1,
      routingApplied: false,
      activation: { mode: 'observe', reason: 'activation.implement-task.standard déclare "observe"' },
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [],
        input: {
          complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' },
          risk: { level: 'low' },
          catalogVersion: 1,
          policyVersion: 1,
        },
        rulesApplied: [],
        limits: [],
      },
    })
    expect(body).toContain('  - Activation : `observe` — activation.implement-task.standard déclare "observe"')
  })

  it('flags an in-flight run affected by a rollback, distinct from a plain rollback-free activation line (issue #480)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      taskContextVersion: 1,
      routingApplied: false,
      activation: {
        mode: 'observe',
        reason: 'activation.implement-task.standard déclare "observe"',
        rollbackDuringRun: true,
      },
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [],
        input: {
          complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' },
          risk: { level: 'low' },
          catalogVersion: 1,
          policyVersion: 1,
        },
        rulesApplied: [],
        limits: [],
      },
    })
    expect(body).toContain('  - Activation : `observe` — activation.implement-task.standard déclare "observe"')
    expect(body).toContain(
      "  - ⚠️ Rollback intervenu pendant ce run : le modèle déjà retenu à l'ouverture est conservé, aucun sous-agent déjà lancé n'est interrompu — le prochain run partira en observation.",
    )
  })

  it('omits the rollback-during-run line when the activation decision does not flag one', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      taskContextVersion: 1,
      routingApplied: false,
      activation: { mode: 'observe', reason: 'activation.implement-task.standard déclare "observe"' },
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [],
        input: {
          complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' },
          risk: { level: 'low' },
          catalogVersion: 1,
          policyVersion: 1,
        },
        rulesApplied: [],
        limits: [],
      },
    })
    expect(body).not.toContain('Rollback intervenu')
  })

  it('omits the Activation line when no activation decision is provided (pre-#476 callers)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      taskContextVersion: 1,
      routingApplied: false,
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [],
        input: {
          complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' },
          risk: { level: 'low' },
          catalogVersion: 1,
          policyVersion: 1,
        },
        rulesApplied: [],
        limits: [],
      },
    })
    expect(body).not.toContain('Activation :')
  })

  it('omits the config-versions/applied lines entirely when routingApplied is not provided (pre-#406 callers)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      routing: {
        status: 'selected',
        selectedModel: { id: 'sonnet-5', provider: 'anthropic', model: 'claude-sonnet-5', agentAlias: 'sonnet', origin: 'band' },
        fallbacks: [],
        input: { complexity: { level: 'standard', effectiveLevel: 'standard', confidence: 'high' }, risk: { level: 'medium' } },
        rulesApplied: [],
        limits: [],
      },
    })
    expect(body).not.toContain('Configuration :')
    expect(body).not.toContain('Modèle appliqué')
  })

  it('omits the Routage line entirely when no routing decision is provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'running',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).not.toContain('Routage')
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

  it('uses a distinct marker per coordinator role (#469)', async () => {
    const { renderAutomationLog, markerFor } = await import('./automation-log.mjs')
    const implementBody = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    const fixBody = renderAutomationLog({
      routine: 'coordinator-fix',
      triggeredAt: '2026-09-08T10:05:00Z',
      sha: 'def5678',
      status: 'succeeded',
      iteration: '2',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })

    expect(markerFor('coordinator-implement')).toBe('<!-- automation-log:coordinator-implement -->')
    expect(markerFor('coordinator-fix')).toBe('<!-- automation-log:coordinator-fix -->')
    expect(implementBody.startsWith(markerFor('coordinator-implement'))).toBe(true)
    expect(fixBody.startsWith(markerFor('coordinator-fix'))).toBe(true)
    expect(implementBody).toContain('## Automation — Coordinateur — implémentation')
    expect(fixBody).toContain('## Automation — Coordinateur — correctif')
  })

  it('publishes the coordinator metrics fields when provided (#469)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-fix',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '2',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      metrics: { fixIterations: 2, compactionObserved: false, usageLimitApproached: true },
    })
    expect(body).toContain(
      "- Métriques : itérations de correction : 2, compaction observée : non, limite d'usage approchée : oui",
    )
  })

  it('publishes a complete RunMetrics record with all its structured lines (#477)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      runMetrics: {
        routine: 'coordinator-implement',
        complete: true,
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
        usage: { compactionObserved: false, usageLimitApproached: true },
        missingFields: [],
      },
    })
    expect(body).toContain('- Run metrics : `complet` (routine `coordinator-implement`, statut `succeeded`)')
    expect(body).toContain('  - Durée : 750s')
    expect(body).toContain('  - Complexité : `standard` (provenance `heuristic`)')
    expect(body).toContain('  - Risque : `low`')
    expect(body).toContain(
      '  - Modèle proposé / réellement utilisé : `claude-sonnet-5` / `claude-sonnet-5` (activation `observe`)',
    )
    expect(body).toContain('  - Fallbacks : claude-haiku-4-5')
    expect(body).toContain('  - Itérations de correctif : 1')
    expect(body).toContain('  - CI verte au premier passage : non')
    expect(body).toContain('  - Findings : fonctionnel 2, technique 0')
    expect(body).toContain("  - Usage : compaction observée non, limite d'usage approchée oui")
    expect(body).toContain('  - Versions : TaskContext v1, politique v1, catalogue v1')
    expect(body).not.toContain('Enregistrement incomplet')
  })

  it('never renders a missing usage indicator as a false "non" (#484)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      runMetrics: {
        routine: 'coordinator-implement',
        complete: false,
        durationSeconds: 750,
        complexity: { band: 'standard', provenance: 'heuristic' },
        risk: { level: 'low' },
        routing: null,
        configVersions: { taskContext: 1, routingPolicy: 1, modelCatalog: 1 },
        outcome: { status: 'succeeded', fixIterations: 1, ciGreenFirstPass: false, escalation: null },
        findings: { functional: 2, technical: 0 },
        usage: { compactionObserved: null, usageLimitApproached: false },
        missingFields: ['routing', 'usage.compactionObserved'],
      },
    })
    expect(body).toContain("  - Usage : compaction observée ?, limite d'usage approchée non")
  })

  it('names the missing fields of an incomplete RunMetrics record instead of hiding the gap (#477)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'failed',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      runMetrics: {
        routine: 'coordinator-implement',
        complete: false,
        durationSeconds: null,
        complexity: null,
        risk: { level: 'high' },
        routing: null,
        configVersions: { taskContext: 1, routingPolicy: null, modelCatalog: null },
        outcome: { status: 'failed', fixIterations: null, ciGreenFirstPass: null, escalation: 'relecteur technique manquant' },
        findings: null,
        usage: null,
        missingFields: ['durationSeconds', 'complexity', 'routing', 'findings', 'usage'],
      },
    })
    expect(body).toContain('- Run metrics : `incomplet` (routine `coordinator-implement`, statut `failed`)')
    expect(body).toContain('  - Escalade : relecteur technique manquant')
    expect(body).toContain(
      '  - ⚠️ Enregistrement incomplet — champs manquants : durationSeconds, complexity, routing, findings, usage',
    )
  })

  it('omits the Run metrics line entirely when no runMetrics record is provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-09T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).not.toContain('Run metrics')
  })

  it('publishes an exceeded budget with the crossed limit and the observed value (#478)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'failed',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      budget: {
        status: 'exceeded',
        limit: 12,
        observed: 13,
        reason: 'budgets.coordinator.per_run.subagents_launched: plafond dépassé (observé 13 > plafond 12)',
        limits: [],
      },
    })
    expect(body).toContain(
      '- Budget : ⚠️ `exceeded` — budgets.coordinator.per_run.subagents_launched: plafond dépassé (observé 13 > plafond 12)',
    )
  })

  it('renders an "ok" budget check with the success icon', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      budget: {
        status: 'ok',
        limit: 12,
        observed: 3,
        reason: 'budgets.coordinator.per_run.subagents_launched: sous le plafond (observé 3 <= plafond 12)',
        limits: [],
      },
    })
    expect(body).toContain(
      '- Budget : ✅ `ok` — budgets.coordinator.per_run.subagents_launched: sous le plafond (observé 3 <= plafond 12)',
    )
  })

  it('omits the Budget line entirely when no budget check is provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-implement',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).not.toContain('- Budget :')
  })

  it('renders the Arbitrage line from a full arbitration field (#498)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-fix',
      triggeredAt: '2026-09-11T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '3',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      arbitration: {
        motif: 'derive-vs-review',
        arbiter: 'arbiter-expert',
        model: 'claude-opus-4-5',
        verdict: 'resolve',
        action: 'extra-fix-round',
        sameModelAsRun: false,
      },
    })
    expect(body).toContain(
      '- Arbitrage : motif `derive-vs-review`, arbitre `arbiter-expert`, modèle `claude-opus-4-5`, verdict `resolve`, action appliquée `extra-fix-round`, même modèle `false`',
    )
  })

  it('omits the Arbitrage line entirely when no arbitration field is provided — non-regression of existing rendering', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-fix',
      triggeredAt: '2026-09-11T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).not.toContain('- Arbitrage :')
  })

  it('uses a distinct marker per reviewer corpus (#470)', async () => {
    const { markerFor } = await import('./automation-log.mjs')
    expect(markerFor('coordinator-review-functional')).toBe('<!-- automation-log:coordinator-review-functional -->')
    expect(markerFor('coordinator-review-technical')).toBe('<!-- automation-log:coordinator-review-technical -->')
  })

  it('attributes each finding to the reviewer(s) that raised it (#470)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      findings: [
        { summary: 'Critère non satisfait', severity: 'blocking', reviewers: ['functional'] },
        {
          summary: 'Champ sans .default() zod',
          severity: 'blocking',
          reviewers: ['functional', 'technical'],
        },
        { summary: 'La spec ne demande pas ce champ', severity: 'important', reviewers: ['technical'], corpus: 'out' },
      ],
    })
    expect(body).toContain('- Findings :')
    expect(body).toContain('  - **blocking** (functional) : Critère non satisfait')
    expect(body).toContain('  - **blocking** (functional + technical) : Champ sans .default() zod')
    expect(body).toContain(
      "  - **important** (technical) : La spec ne demande pas ce champ _(hors corpus — exclu de l'arbitrage)_",
    )
  })

  it('omits the Findings line entirely when no findings are provided', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).not.toContain('Findings')
  })

  it('names the missing reviewer(s) instead of a computed verdict (#470)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-09-08T10:00:00Z',
      sha: 'abc1234',
      status: 'failed',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      missingReviewers: ['technical'],
    })
    expect(body).toContain('- Relecteur(s) manquant(s) : technical')
  })

  it('omits the Métriques line entirely when no metrics are provided', async () => {
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
    expect(body).not.toContain('Métriques')
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

  it('renders the skill and the model actually executed when executedBy is provided (#494)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      executedBy: { skill: 'implement-task', model: 'claude-sonnet-5' },
    })
    expect(body).toContain('- Exécuté par : skill `implement-task`, modèle `claude-sonnet-5`')
  })

  it('renders "inconnu" for both skill and model when executedBy is not provided, rather than omitting the line (#494)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'pr-review',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
    })
    expect(body).toContain('- Exécuté par : skill `inconnu`, modèle `inconnu`')
  })

  it('renders "inconnu" for whichever of skill/model is missing from an incomplete executedBy (#494)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-review-technical',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      executedBy: { skill: 'pr-review' },
    })
    expect(body).toContain('- Exécuté par : skill `pr-review`, modèle `inconnu`')
  })

  it('logs why the model is unknown via executedBy.limits, same convention as complexity/routing (#494)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'coordinator-fix',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      executedBy: { skill: 'address-feedback', model: 'inconnu', limits: ['get_session indisponible avant auto-rapport'] },
    })
    expect(body).toContain('- Exécuté par : skill `address-feedback`, modèle `inconnu`')
    expect(body).toContain('  - Limites : get_session indisponible avant auto-rapport')
  })

  it('omits the Limites line under "Exécuté par" when executedBy carries no reason (#494)', async () => {
    const { renderAutomationLog } = await import('./automation-log.mjs')
    const body = renderAutomationLog({
      routine: 'implement-task',
      triggeredAt: '2026-09-10T10:00:00Z',
      sha: 'abc1234',
      status: 'succeeded',
      iteration: '1',
      validation: 'lint / typecheck / tests',
      resultUrl: 'https://github.com/remhiit/scoreo/actions/runs/999',
      executedBy: { skill: 'implement-task', model: 'claude-sonnet-5' },
    })
    expect(body).toContain('- Exécuté par : skill `implement-task`, modèle `claude-sonnet-5`')
    expect(body).not.toContain('  - Limites :')
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

    expect(result).toEqual({ commentId: 555, created: true, alreadyProcessed: false, previous: null, skipped: false })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/remhiit/scoreo/issues/42/comments',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('forwards `arbitration` through to the rendered Arbitrage line — not just renderAutomationLog directly (#504 review)', async () => {
    stubEnv()
    let postedBody = null
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/42/comments' && opts?.method === 'POST') {
        postedBody = JSON.parse(opts.body).body
        return Promise.resolve({ ok: true, json: async () => ({ id: 555 }) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    await upsertAutomationLog({
      number: 42,
      routine: 'coordinator-fix',
      sha: 'abc1234',
      status: 'succeeded',
      triggeredAt: '2026-09-11T10:00:00Z',
      arbitration: {
        motif: 'derive-vs-review',
        arbiter: 'arbiter-expert',
        model: 'claude-opus-4-5',
        verdict: 'resolve',
        action: 'extra-fix-round',
        sameModelAsRun: false,
      },
    })

    expect(postedBody).toContain(
      '- Arbitrage : motif `derive-vs-review`, arbitre `arbiter-expert`, modèle `claude-opus-4-5`, verdict `resolve`, action appliquée `extra-fix-round`, même modèle `false`',
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

  it('closes a fix journal left in `running`, reusing its own iteration (#473)', async () => {
    stubEnv()
    const existingBody = [
      '<!-- automation-log:coordinator-fix -->',
      '## Automation — Coordinateur — correctif',
      '',
      '- Routine : `coordinator-fix`',
      '- Commit analysé : `abc1234`',
      '- Statut : `running`',
      '- Itération : `2`',
    ].join('\n')

    let patchedBody = null
    vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 111, body: existingBody }] })
      }
      if (url === 'https://api.github.com/repos/remhiit/scoreo/issues/comments/111' && opts?.method === 'PATCH') {
        patchedBody = JSON.parse(opts.body).body
        return Promise.resolve({ ok: true, json: async () => ({}) })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    const result = await upsertAutomationLog({
      number: 42,
      routine: 'coordinator-fix',
      sha: 'abc1234',
      status: 'succeeded',
      onlyIfRunning: true,
      summary: 'Coordinateur : dernier tour de correction terminé, PR convergée.',
    })

    expect(result.skipped).toBe(false)
    // L'événement de clôture (label de verdict) ne porte pas le numéro du
    // tour : il est repris du journal ouvert, pas remis au défaut `1`.
    expect(patchedBody).toContain('- Itération : `2`')
    expect(patchedBody).toContain('- Statut : `succeeded`')
  })

  it('writes nothing when there is no fix journal to close (#473)', async () => {
    stubEnv()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url, opts) => {
      if (url === COMMENTS_URL && !opts?.method) {
        return Promise.resolve({ ok: true, json: async () => [] })
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    })

    vi.resetModules()
    const { upsertAutomationLog } = await import('./automation-log.mjs')
    const result = await upsertAutomationLog({
      number: 42,
      routine: 'coordinator-fix',
      sha: 'abc1234',
      status: 'succeeded',
      onlyIfRunning: true,
    })

    // Un run convergé dès la première review n'a eu aucun tour de correctif :
    // aucun journal « correctif » ne doit apparaître rétroactivement.
    expect(result.skipped).toBe(true)
    expect(result.created).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'POST' }))
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'PATCH' }))
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

describe('loadMetricsFromEnv', () => {
  afterEach(resetAll)

  it('reads the three coordinator metrics from the environment (#469)', async () => {
    vi.stubEnv('LOG_METRIC_FIX_ITERATIONS', '2')
    vi.stubEnv('LOG_METRIC_COMPACTION_OBSERVED', 'false')
    vi.stubEnv('LOG_METRIC_USAGE_LIMIT_APPROACHED', 'true')

    vi.resetModules()
    const { loadMetricsFromEnv } = await import('./automation-log.mjs')

    expect(loadMetricsFromEnv()).toEqual({
      fixIterations: 2,
      compactionObserved: false,
      usageLimitApproached: true,
    })
  })

  it('returns undefined when no metric variable is set', async () => {
    vi.resetModules()
    const { loadMetricsFromEnv } = await import('./automation-log.mjs')

    expect(loadMetricsFromEnv()).toBeUndefined()
  })
})

describe('loadExecutedByFromEnv', () => {
  afterEach(resetAll)

  it('reads skill and model from the environment (#494)', async () => {
    vi.stubEnv('LOG_EXECUTED_BY_SKILL', 'implement-task')
    vi.stubEnv('LOG_EXECUTED_BY_MODEL', 'claude-sonnet-5')

    vi.resetModules()
    const { loadExecutedByFromEnv } = await import('./automation-log.mjs')

    expect(loadExecutedByFromEnv()).toEqual({ skill: 'implement-task', model: 'claude-sonnet-5' })
  })

  it('returns an object with undefined fields, never throwing, when neither variable is set (#494)', async () => {
    vi.resetModules()
    const { loadExecutedByFromEnv } = await import('./automation-log.mjs')

    expect(loadExecutedByFromEnv()).toEqual({ skill: undefined, model: undefined })
  })

  it('reads the reason for an unknown model from LOG_EXECUTED_BY_LIMITS, semicolon-separated (#494)', async () => {
    vi.stubEnv('LOG_EXECUTED_BY_SKILL', 'address-feedback')
    vi.stubEnv('LOG_EXECUTED_BY_LIMITS', 'get_session indisponible ; sous-agent non relancé')

    vi.resetModules()
    const { loadExecutedByFromEnv } = await import('./automation-log.mjs')

    expect(loadExecutedByFromEnv()).toEqual({
      skill: 'address-feedback',
      model: undefined,
      limits: ['get_session indisponible', 'sous-agent non relancé'],
    })
  })

  it('omits the limits key entirely when LOG_EXECUTED_BY_LIMITS is not set (#494)', async () => {
    vi.stubEnv('LOG_EXECUTED_BY_SKILL', 'implement-task')
    vi.stubEnv('LOG_EXECUTED_BY_MODEL', 'claude-sonnet-5')

    vi.resetModules()
    const { loadExecutedByFromEnv } = await import('./automation-log.mjs')

    expect(loadExecutedByFromEnv()).toEqual({ skill: 'implement-task', model: 'claude-sonnet-5' })
  })
})
