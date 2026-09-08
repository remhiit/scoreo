import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORE_WEIGHTS,
  EXPECTED_MODEL_CATALOG_VERSION,
  bumpBandForLowConfidence,
  computeWeightedScore,
  evaluateCandidate,
  resolveRiskOverride,
  routeModel,
  validateRoutingDecision,
} from './model-router.mjs'

const CATALOG = {
  version: 1,
  models: {
    'haiku-mini': {
      provider: 'anthropic',
      model: 'claude-haiku',
      agent_alias: 'haiku',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 40,
      cost_tier: 'low',
      latency_tier: 'fast',
      max_risk: 'low',
      max_complexity: 'trivial',
      fallback: 'sonnet-mid',
    },
    'sonnet-mid': {
      provider: 'anthropic',
      model: 'claude-sonnet',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 70,
      cost_tier: 'medium',
      latency_tier: 'medium',
      max_risk: 'medium',
      max_complexity: 'standard',
      fallback: 'opus-max',
    },
    'opus-max': {
      provider: 'anthropic',
      model: 'claude-opus',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 95,
      cost_tier: 'high',
      latency_tier: 'slow',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
    'unsafe-fallback': {
      provider: 'anthropic',
      model: 'claude-unsafe-fallback',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 60,
      cost_tier: 'low',
      latency_tier: 'fast',
      max_risk: 'medium',
      max_complexity: 'standard',
    },
    'no-tools': {
      provider: 'anthropic',
      model: 'claude-no-tools',
      enabled: true,
      capabilities: { tools: false, structured_output: true, long_context: true },
      quality_score: 80,
      cost_tier: 'low',
      latency_tier: 'fast',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
    'disabled-model': {
      provider: 'anthropic',
      model: 'claude-disabled',
      enabled: false,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 99,
      cost_tier: 'low',
      latency_tier: 'fast',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
    'low-quality': {
      provider: 'anthropic',
      model: 'claude-low',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 10,
      cost_tier: 'low',
      latency_tier: 'fast',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
    'unsafe-dominant': {
      provider: 'anthropic',
      model: 'claude-unsafe-dominant',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 99,
      cost_tier: 'low',
      latency_tier: 'fast',
      max_risk: 'low',
      max_complexity: 'very-complex',
    },
    'other-provider': {
      provider: 'openai-compatible',
      model: 'gpt-y',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 60,
      cost_tier: 'low',
      latency_tier: 'fast',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
    'model-x': {
      provider: 'anthropic',
      model: 'claude-x',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 70,
      cost_tier: 'medium',
      latency_tier: 'medium',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
    'model-y': {
      provider: 'anthropic',
      model: 'claude-y',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 70,
      cost_tier: 'medium',
      latency_tier: 'medium',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
  },
}

const ROUTINE_DEFINITION = { routing_policy: 'implement-task' }
const NO_CAPABILITIES = { tools: false, structured_output: false, long_context: false }

function policyWith(bands, riskOverrides) {
  return {
    version: 1,
    routines: {
      'implement-task': {
        required_capabilities: NO_CAPABILITIES,
        bands,
        ...(riskOverrides ? { risk_overrides: riskOverrides } : {}),
      },
    },
  }
}

function baseInput(overrides = {}) {
  return {
    routineName: 'implement-task',
    routineDefinition: ROUTINE_DEFINITION,
    modelCatalog: CATALOG,
    complexityAssessment: { level: 'trivial', confidence: 'high' },
    riskAssessment: { level: 'low' },
    generatedAt: '2026-09-08T10:00:00Z',
    ...overrides,
  }
}

describe('evaluateCandidate — exclusion par famille de contrainte', () => {
  const common = {
    catalog: CATALOG,
    requiredCapabilities: NO_CAPABILITIES,
    band: 'trivial',
    minScore: 0,
    riskLevel: 'low',
    constraints: null,
    providerStatus: {},
    excludedModelIds: [],
  }

  it('exclut un modèle absent du catalogue', () => {
    const result = evaluateCandidate({ ...common, modelId: 'ghost' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toEqual(['modèle "ghost" absent du catalogue'])
  })

  it('exclut un modèle désactivé', () => {
    const result = evaluateCandidate({ ...common, modelId: 'disabled-model', minScore: 0, riskLevel: 'high', band: 'very-complex' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('modèle désactivé dans le catalogue')
  })

  it('exclut un modèle qui ne couvre pas une capacité requise', () => {
    const result = evaluateCandidate({
      ...common,
      modelId: 'no-tools',
      requiredCapabilities: { tools: true, structured_output: false, long_context: false },
      riskLevel: 'high',
      band: 'very-complex',
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('capacité requise non couverte : tools')
  })

  it('exclut un modèle sous la bande de complexité cible (max_complexity)', () => {
    const result = evaluateCandidate({ ...common, modelId: 'haiku-mini', band: 'standard' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('max_complexity du modèle (trivial) sous la bande cible (standard)')
  })

  it('exclut un modèle sous le niveau de risque requis (max_risk)', () => {
    const result = evaluateCandidate({ ...common, modelId: 'sonnet-mid', riskLevel: 'high' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('max_risk du modèle (medium) sous le niveau de risque requis (high)')
  })

  it('exclut un modèle sous le min_score de la bande', () => {
    const result = evaluateCandidate({ ...common, modelId: 'low-quality', minScore: 50, riskLevel: 'high', band: 'very-complex' })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('quality_score du modèle (10) sous le min_score requis (50)')
  })

  it('exclut un fournisseur non couvert par allowedProviders', () => {
    const result = evaluateCandidate({
      ...common,
      modelId: 'other-provider',
      riskLevel: 'high',
      band: 'very-complex',
      constraints: { allowedProviders: ['anthropic'] },
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('fournisseur "openai-compatible" non autorisé par les contraintes de la routine')
  })

  it('exclut un fournisseur explicitement dans deniedProviders', () => {
    const result = evaluateCandidate({
      ...common,
      modelId: 'other-provider',
      riskLevel: 'high',
      band: 'very-complex',
      constraints: { deniedProviders: ['openai-compatible'] },
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('fournisseur "openai-compatible" explicitement exclu par les contraintes de la routine')
  })

  it('exclut un modèle dépassant le budget (cost_tier) autorisé', () => {
    const result = evaluateCandidate({
      ...common,
      modelId: 'opus-max',
      riskLevel: 'high',
      band: 'very-complex',
      constraints: { maxCostTier: 'medium' },
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('cost_tier du modèle (high) dépasse le budget maximal autorisé (medium)')
  })

  it('exclut un modèle dépassant la latence maximale autorisée', () => {
    const result = evaluateCandidate({
      ...common,
      modelId: 'opus-max',
      riskLevel: 'high',
      band: 'very-complex',
      constraints: { maxLatencyTier: 'medium' },
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('latency_tier du modèle (slow) dépasse la latence maximale autorisée (medium)')
  })

  it('exclut un modèle dont le fournisseur est signalé indisponible', () => {
    const result = evaluateCandidate({
      ...common,
      modelId: 'sonnet-mid',
      riskLevel: 'medium',
      band: 'standard',
      providerStatus: { anthropic: { available: false, reason: 'incident #42' } },
    })
    expect(result.eligible).toBe(false)
    expect(result.reasons).toContain('fournisseur "anthropic" signalé indisponible pour ce run (incident #42)')
  })

  it('exclut un modèle explicitement listé par l\'appelant (échec transitoire déjà tenté)', () => {
    const result = evaluateCandidate({ ...common, modelId: 'haiku-mini', excludedModelIds: ['haiku-mini'] })
    expect(result.eligible).toBe(false)
    expect(result.reasons[0]).toMatch(/échec transitoire/)
  })

  it('accepte un candidat qui passe tous les filtres', () => {
    const result = evaluateCandidate({ ...common, modelId: 'haiku-mini' })
    expect(result.eligible).toBe(true)
    expect(result.reasons).toEqual([])
  })
})

describe('resolveRiskOverride', () => {
  it('retourne null en l\'absence de risk_overrides', () => {
    expect(resolveRiskOverride({}, 'high')).toBeNull()
  })

  it('applique le palier atteint par le risque réel', () => {
    const policy = { risk_overrides: { high: { model: 'opus-max' } } }
    expect(resolveRiskOverride(policy, 'high')).toEqual({ level: 'high', model: 'opus-max' })
  })

  it('n\'applique pas un palier au-dessus du risque réel', () => {
    const policy = { risk_overrides: { high: { model: 'opus-max' } } }
    expect(resolveRiskOverride(policy, 'medium')).toBeNull()
  })

  it('retient le palier le plus sévère parmi ceux atteints', () => {
    const policy = { risk_overrides: { medium: { model: 'sonnet-mid' }, high: { model: 'opus-max' } } }
    expect(resolveRiskOverride(policy, 'high')).toEqual({ level: 'high', model: 'opus-max' })
    expect(resolveRiskOverride(policy, 'medium')).toEqual({ level: 'medium', model: 'sonnet-mid' })
  })
})

describe('bumpBandForLowConfidence', () => {
  it('majore la bande d\'un cran', () => {
    expect(bumpBandForLowConfidence('standard')).toBe('complex')
  })

  it('plafonne à very-complex', () => {
    expect(bumpBandForLowConfidence('very-complex')).toBe('very-complex')
  })
})

describe('computeWeightedScore', () => {
  it('neutralise une dimension absente plutôt que de la traiter comme un score nul', () => {
    const withHistorical = computeWeightedScore(
      { quality: 1, contextFit: 1, cost: 1, latency: 1, providerAvailability: 1, policyPreference: 1, historicalPerformance: 1 },
      DEFAULT_SCORE_WEIGHTS,
    )
    const withoutHistorical = computeWeightedScore(
      { quality: 1, contextFit: 1, cost: 1, latency: 1, providerAvailability: 1, policyPreference: 1, historicalPerformance: null },
      DEFAULT_SCORE_WEIGHTS,
    )
    expect(withHistorical.score).toBe(1)
    expect(withoutHistorical.score).toBe(1)
    expect(withoutHistorical.breakdown.historicalPerformance).toBeUndefined()
  })
})

describe('routeModel — sélection nominale', () => {
  it('sélectionne le candidat de bande au meilleur score pondéré', () => {
    const policy = policyWith({
      trivial: {
        candidates: { primary: { model: 'haiku-mini', weight: 70 }, secondary: { model: 'sonnet-mid', weight: 30 } },
        min_score: 0,
        fallback: 'opus-max',
      },
    })
    const decision = routeModel(baseInput({ routingPolicy: policy }))
    expect(decision.status).toBe('selected')
    expect(decision.selectedModel).toEqual({ id: 'haiku-mini', provider: 'anthropic', model: 'claude-haiku', agentAlias: 'haiku', origin: 'band' })
    expect(decision.fallbacks.map((f) => f.id)).toEqual(['sonnet-mid', 'opus-max'])
    expect(decision.input.complexity.effectiveLevel).toBe('trivial')
  })
})

describe('routeModel — égalité de score', () => {
  it('départage deux candidats identiques par ordre alphabétique d\'identifiant', () => {
    const policy = policyWith({
      trivial: {
        candidates: { a: { model: 'model-x', weight: 50 }, b: { model: 'model-y', weight: 50 } },
        min_score: 0,
        fallback: 'opus-max',
      },
    })
    const decision = routeModel(baseInput({ routingPolicy: policy, riskAssessment: { level: 'high' } }))
    expect(decision.selectedModel.id).toBe('model-x')
    expect(decision.fallbacks[0].id).toBe('model-y')
  })
})

describe('routeModel — épuisement de la chaîne de fallback', () => {
  it('retombe sur le fallback de bande puis la chaîne de catalogue quand les candidats sont exclus', () => {
    const policy = policyWith({
      trivial: {
        candidates: { primary: { model: 'haiku-mini', weight: 100 } },
        min_score: 0,
        fallback: 'sonnet-mid',
      },
    })
    // Risque "high" : haiku-mini (low) et sonnet-mid (medium) sont sous le
    // seuil, sonnet-mid.fallback (opus-max, high) doit prendre le relais.
    const decision = routeModel(baseInput({ routingPolicy: policy, riskAssessment: { level: 'high' } }))
    expect(decision.status).toBe('selected')
    expect(decision.selectedModel).toMatchObject({ id: 'opus-max', origin: 'catalog_fallback' })
    const haiku = decision.candidates.find((c) => c.id === 'haiku-mini')
    const sonnet = decision.candidates.find((c) => c.id === 'sonnet-mid')
    expect(haiku.eligible).toBe(false)
    expect(sonnet.eligible).toBe(false)
  })

  it('produit la même sortie que l\'absence de candidat quand toute la chaîne est épuisée', () => {
    const policy = policyWith({
      trivial: {
        candidates: { primary: { model: 'haiku-mini', weight: 100 } },
        min_score: 0,
        fallback: 'unsafe-fallback',
      },
    })
    // unsafe-fallback n'a pas de fallback propre et son max_risk (medium)
    // reste sous "high" : la chaîne entière est épuisée.
    const decision = routeModel(baseInput({ routingPolicy: policy, riskAssessment: { level: 'high' } }))
    expect(decision.status).toBe('no-candidate')
    expect(decision.selectedModel).toBeNull()
    expect(decision.fallbacks).toEqual([])
    expect(decision.candidates.every((c) => !c.eligible)).toBe(true)
  })
})

describe('routeModel — absence de candidat dès le départ', () => {
  it('renvoie une décision explicite "no-candidate", jamais un choix par défaut', () => {
    const policy = policyWith({
      'very-complex': {
        candidates: { primary: { model: 'disabled-model', weight: 100 } },
        min_score: 0,
        fallback: 'disabled-model',
      },
    })
    const decision = routeModel(
      baseInput({
        routingPolicy: policy,
        complexityAssessment: { level: 'very-complex', confidence: 'high' },
        riskAssessment: { level: 'high' },
      }),
    )
    expect(decision.status).toBe('no-candidate')
    expect(decision.selectedModel).toBeNull()
    expect(decision.candidates.length).toBeGreaterThan(0)
    expect(decision.candidates.every((c) => c.exclusionReasons.length > 0)).toBe(true)
  })
})

describe('routeModel — override humain', () => {
  it('retient un override manuel éligible sans le mettre en concurrence avec les candidats de bande', () => {
    const policy = policyWith({
      trivial: { candidates: { primary: { model: 'haiku-mini', weight: 100 } }, min_score: 0, fallback: 'opus-max' },
    })
    const decision = routeModel(
      baseInput({ routingPolicy: policy, manualOverride: { modelId: 'opus-max', source: 'label:model:opus-max' } }),
    )
    expect(decision.selectedModel).toMatchObject({ id: 'opus-max', origin: 'manual_override' })
    expect(decision.rulesApplied.some((r) => r.includes('override manuel demandé'))).toBe(true)
  })

  it('rejette un override manuel non éligible et retombe sur le routage normal', () => {
    const policy = policyWith({
      trivial: { candidates: { primary: { model: 'haiku-mini', weight: 100 } }, min_score: 0, fallback: 'opus-max' },
    })
    const decision = routeModel(
      baseInput({
        routingPolicy: policy,
        riskAssessment: { level: 'high' },
        manualOverride: { modelId: 'unsafe-dominant', source: 'label:model:unsafe-dominant' },
      }),
    )
    const overrideCandidate = decision.candidates.find((c) => c.id === 'unsafe-dominant')
    expect(overrideCandidate.eligible).toBe(false)
    expect(overrideCandidate.exclusionReasons.some((r) => r.includes('max_risk'))).toBe(true)
    expect(decision.selectedModel.id).not.toBe('unsafe-dominant')
  })
})

describe('routeModel — cas de sécurité (risque vs coût)', () => {
  it('ne sélectionne jamais un modèle sous le seuil de risque même s\'il domine tous les autres critères', () => {
    const policy = policyWith({
      trivial: {
        candidates: {
          primary: { model: 'unsafe-dominant', weight: 90 },
          secondary: { model: 'opus-max', weight: 10 },
        },
        min_score: 0,
        fallback: 'opus-max',
      },
    })
    const decision = routeModel(baseInput({ routingPolicy: policy, riskAssessment: { level: 'high' } }))
    expect(decision.selectedModel.id).toBe('opus-max')
    const unsafe = decision.candidates.find((c) => c.id === 'unsafe-dominant')
    expect(unsafe.eligible).toBe(false)
    expect(unsafe.exclusionReasons.some((r) => r.includes('max_risk du modèle (low) sous le niveau de risque requis (high)'))).toBe(true)
  })
})

describe('routeModel — risk_override', () => {
  it('force un modèle hors bande quand le risque atteint le palier configuré', () => {
    const policy = policyWith(
      {
        trivial: { candidates: { primary: { model: 'haiku-mini', weight: 100 } }, min_score: 0, fallback: 'unsafe-fallback' },
      },
      { high: { model: 'opus-max' } },
    )
    const decision = routeModel(baseInput({ routingPolicy: policy, riskAssessment: { level: 'high' } }))
    expect(decision.selectedModel).toMatchObject({ id: 'opus-max', origin: 'risk_override' })
    expect(decision.rulesApplied.some((r) => r.includes('risk_override "high" applicable'))).toBe(true)
  })
})

describe('routeModel — confiance basse', () => {
  it('majore la bande effective d\'un cran', () => {
    const policy = policyWith({
      complex: { candidates: { primary: { model: 'sonnet-mid', weight: 100 } }, min_score: 0, fallback: 'opus-max' },
    })
    const decision = routeModel(
      baseInput({
        routingPolicy: policy,
        complexityAssessment: { level: 'standard', confidence: 'low' },
        riskAssessment: { level: 'medium' },
      }),
    )
    expect(decision.input.complexity.level).toBe('standard')
    expect(decision.input.complexity.effectiveLevel).toBe('complex')
    expect(decision.rulesApplied.some((r) => r.includes('bande majorée de "standard" à "complex"'))).toBe(true)
  })
})

describe('routeModel — versions inattendues', () => {
  it('refuse un catalogue dans une version inattendue, en nommant la version lue et attendue', () => {
    const policy = policyWith({ trivial: { candidates: { a: { model: 'haiku-mini', weight: 100 } }, min_score: 0, fallback: 'opus-max' } })
    expect(() => routeModel(baseInput({ routingPolicy: policy, modelCatalog: { ...CATALOG, version: 2 } }))).toThrow(
      `lue: 2, attendue: ${EXPECTED_MODEL_CATALOG_VERSION}`,
    )
  })

  it('refuse une politique dans une version inattendue', () => {
    const policy = policyWith({ trivial: { candidates: { a: { model: 'haiku-mini', weight: 100 } }, min_score: 0, fallback: 'opus-max' } })
    expect(() => routeModel(baseInput({ routingPolicy: { ...policy, version: 2 } }))).toThrow('lue: 2, attendue: 1')
  })
})

describe('routeModel — reproductibilité', () => {
  it('produit une décision identique pour les mêmes entrées', () => {
    const policy = policyWith({
      trivial: { candidates: { primary: { model: 'haiku-mini', weight: 70 }, secondary: { model: 'sonnet-mid', weight: 30 } }, min_score: 0, fallback: 'opus-max' },
    })
    const input = baseInput({ routingPolicy: policy })
    expect(routeModel(input)).toEqual(routeModel(input))
  })
})

describe('routeModel — métriques historiques absentes', () => {
  it('signale la neutralisation plutôt que de pénaliser silencieusement un candidat', () => {
    const policy = policyWith({
      trivial: { candidates: { primary: { model: 'haiku-mini', weight: 100 } }, min_score: 0, fallback: 'opus-max' },
    })
    const decision = routeModel(baseInput({ routingPolicy: policy }))
    expect(decision.limits).toContain(
      'métriques historiques absentes pour au moins un candidat — poids neutralisé, jamais traité comme un score nul',
    )
  })
})

describe('validateRoutingDecision', () => {
  const policy = policyWith({
    trivial: { candidates: { primary: { model: 'haiku-mini', weight: 100 } }, min_score: 0, fallback: 'opus-max' },
  })
  const decision = routeModel(baseInput({ routingPolicy: policy }))

  it('accepte une décision conforme', () => {
    expect(validateRoutingDecision(decision)).toEqual({ valid: true, errors: [] })
  })

  it('rejette un statut "selected" sans selectedModel', () => {
    const { valid, errors } = validateRoutingDecision({ ...decision, selectedModel: null })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('selectedModel'))).toBe(true)
  })

  it('rejette un candidat inéligible sans raison d\'exclusion', () => {
    const broken = { ...decision, candidates: [...decision.candidates, { id: 'ghost', origin: 'band', eligible: false, exclusionReasons: [], score: null, scoreBreakdown: null }] }
    const { valid, errors } = validateRoutingDecision(broken)
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('ghost'))).toBe(true)
  })
})

describe('entry-point guard', () => {
  it('ne déclenche pas main() à l\'import', async () => {
    const originalExitCode = process.exitCode
    await import('./model-router.mjs')
    expect(process.exitCode).toBe(originalExitCode)
  })
})
