import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  CLASSIFIER_PROMPT_VERSION,
  consolidateComplexity,
  resolveClassifierModel,
  shouldRunLlmFallback,
  validateLlmComplexityResponse,
} from './complexity-llm.mjs'
import { loadModelCatalog, loadRoutingPolicy } from './automation-dispatch.mjs'

function baseAssessment(overrides = {}) {
  return {
    version: 1,
    level: 'standard',
    score: 25,
    confidence: 'high',
    provenance: 'heuristic',
    dimensions: {
      dispersion: { available: true, score: 0, max: 20, reason: 'ok' },
      fileVolume: { available: true, score: 0, max: 15, reason: 'ok' },
      ambiguity: { available: true, score: 0, max: 15, reason: 'ok' },
      dependencies: { available: true, score: 0, max: 10, reason: 'ok' },
      changeVolume: { available: true, score: 0, max: 15, reason: 'ok' },
      validationLoad: { available: true, score: 0, max: 10, reason: 'ok' },
      novelty: { available: true, score: 0, max: 10, reason: 'ok' },
      crossCuttingSurfaces: { available: true, score: 0, max: 5, reason: 'ok' },
    },
    reasons: ['ok'],
    limits: [],
    override: null,
    thresholds: { version: 1, bands: [] },
    generatedAt: '2026-09-08T10:00:00Z',
    ...overrides,
  }
}

function baseLlmResponse(overrides = {}) {
  return {
    level: 'standard',
    confidence: 'medium',
    reasons: ['spec claire une fois lue en entier'],
    uncertainties: [],
    promptVersion: 1,
    ...overrides,
  }
}

describe('shouldRunLlmFallback', () => {
  it('runs when the heuristic confidence is low', () => {
    expect(shouldRunLlmFallback(baseAssessment({ confidence: 'low' }))).toBe(true)
  })

  it('runs when at least two dimensions are unavailable', () => {
    const assessment = baseAssessment()
    assessment.dimensions.dispersion.available = false
    assessment.dimensions.fileVolume.available = false
    expect(shouldRunLlmFallback(assessment)).toBe(true)
  })

  it('does not run when only one dimension is unavailable', () => {
    const assessment = baseAssessment()
    assessment.dimensions.dispersion.available = false
    expect(shouldRunLlmFallback(assessment)).toBe(false)
  })

  it('runs when the entity carries the complexity:llm label', () => {
    expect(shouldRunLlmFallback(baseAssessment(), ['complexity:llm'])).toBe(true)
  })

  it('does not run on a nominal high-confidence, fully-available assessment', () => {
    expect(shouldRunLlmFallback(baseAssessment())).toBe(false)
  })

  it('never runs when a manual override is present, regardless of everything else', () => {
    const assessment = baseAssessment({
      confidence: 'low',
      override: { level: 'very-complex', heuristicLevel: 'trivial', source: 'label:complexity:very-complex' },
    })
    assessment.dimensions.dispersion.available = false
    assessment.dimensions.fileVolume.available = false
    expect(shouldRunLlmFallback(assessment, ['complexity:llm'])).toBe(false)
  })
})

describe('validateLlmComplexityResponse', () => {
  it('accepts a well-formed response', () => {
    expect(validateLlmComplexityResponse(baseLlmResponse())).toEqual({ valid: true, errors: [] })
  })

  it('rejects a non-object payload', () => {
    const { valid, errors } = validateLlmComplexityResponse('not json')
    expect(valid).toBe(false)
    expect(errors).toEqual(['complexity-llm-response: la racine doit être un objet'])
  })

  it('rejects a response missing a required field', () => {
    const response = baseLlmResponse()
    delete response.confidence
    const { valid, errors } = validateLlmComplexityResponse(response)
    expect(valid).toBe(false)
    expect(errors).toContain('complexity-llm-response.confidence: champ requis manquant')
  })

  it('rejects a level outside the enum', () => {
    const { valid, errors } = validateLlmComplexityResponse(baseLlmResponse({ level: 'astronomical' }))
    expect(valid).toBe(false)
    expect(errors.some((e) => e.startsWith('complexity-llm-response.level:'))).toBe(true)
  })

  it('rejects a confidence outside the enum', () => {
    const { valid, errors } = validateLlmComplexityResponse(baseLlmResponse({ confidence: 'certain' }))
    expect(valid).toBe(false)
    expect(errors.some((e) => e.startsWith('complexity-llm-response.confidence:'))).toBe(true)
  })

  it('rejects a non-integer promptVersion', () => {
    const { valid, errors } = validateLlmComplexityResponse(baseLlmResponse({ promptVersion: 1.5 }))
    expect(valid).toBe(false)
    expect(errors.some((e) => e.startsWith('complexity-llm-response.promptVersion:'))).toBe(true)
  })

  it('rejects empty reasons', () => {
    const { valid, errors } = validateLlmComplexityResponse(baseLlmResponse({ reasons: [] }))
    expect(valid).toBe(false)
    expect(errors.some((e) => e.startsWith('complexity-llm-response.reasons:'))).toBe(true)
  })
})

describe('consolidateComplexity', () => {
  it('keeps the heuristic level and provenance on agreement, taking the lower confidence', () => {
    const heuristic = baseAssessment({ level: 'standard', confidence: 'high' })
    const result = consolidateComplexity(heuristic, baseLlmResponse({ level: 'standard', confidence: 'medium' }))
    expect(result.level).toBe('standard')
    expect(result.provenance).toBe('heuristic')
    expect(result.confidence).toBe('medium')
  })

  it('adopts the LLM level and provenance on a one-band gap, taking the lower confidence', () => {
    const heuristic = baseAssessment({ level: 'standard', confidence: 'high' })
    const result = consolidateComplexity(heuristic, baseLlmResponse({ level: 'complex', confidence: 'medium' }))
    expect(result.level).toBe('complex')
    expect(result.provenance).toBe('llm')
    expect(result.confidence).toBe('medium')
  })

  it('forces low confidence and keeps the heuristic level on a two-or-more-band disagreement', () => {
    const heuristic = baseAssessment({ level: 'trivial', confidence: 'high' })
    const result = consolidateComplexity(heuristic, baseLlmResponse({ level: 'very-complex', confidence: 'high' }))
    expect(result.level).toBe('trivial')
    expect(result.provenance).toBe('heuristic')
    expect(result.confidence).toBe('low')
  })

  it('never touches score/dimensions/reasons/override/thresholds, whatever the outcome', () => {
    const heuristic = baseAssessment({ level: 'trivial', confidence: 'high' })
    for (const llmLevel of ['trivial', 'standard', 'complex', 'very-complex']) {
      const result = consolidateComplexity(heuristic, baseLlmResponse({ level: llmLevel }))
      expect(result.score).toBe(heuristic.score)
      expect(result.dimensions).toBe(heuristic.dimensions)
      expect(result.reasons).toBe(heuristic.reasons)
      expect(result.override).toBe(heuristic.override)
      expect(result.thresholds).toBe(heuristic.thresholds)
      expect(result.generatedAt).toBe(heuristic.generatedAt)
    }
  })

  it('logs the fallback trail (heuristic/LLM levels, confidence, prompt version) in limits', () => {
    const heuristic = baseAssessment({ level: 'standard', confidence: 'high', limits: ['existing limit'] })
    const result = consolidateComplexity(heuristic, baseLlmResponse({ level: 'complex', promptVersion: 3 }))
    expect(result.limits).toContain('existing limit')
    const fallbackLine = result.limits.find((l) => l.startsWith('fallback LLM'))
    expect(fallbackLine).toContain('version de prompt 3')
    expect(fallbackLine).toContain('heuristique "standard"')
    expect(fallbackLine).toContain('LLM "complex"')
  })
})

describe('resolveClassifierModel', () => {
  it('resolves the classifier model declared in the real .automation/routing-policy.yml + model-catalog.yml', () => {
    const routingPolicy = loadRoutingPolicy('.automation/routing-policy.yml')
    const modelCatalog = loadModelCatalog('.automation/model-catalog.yml')
    const { modelId, agentAlias } = resolveClassifierModel(routingPolicy, modelCatalog)
    expect(modelId).toBe('haiku-4-5')
    expect(agentAlias).toBe('haiku')
  })

  it('matches the model declared in .claude/agents/complexity-classifier.md frontmatter — never drifting apart', () => {
    const routingPolicy = loadRoutingPolicy('.automation/routing-policy.yml')
    const modelCatalog = loadModelCatalog('.automation/model-catalog.yml')
    const { agentAlias } = resolveClassifierModel(routingPolicy, modelCatalog)
    const agentFile = readFileSync('.claude/agents/complexity-classifier.md', 'utf8')
    expect(agentFile).toMatch(new RegExp(`^model: ${agentAlias}$`, 'm'))
  })

  it('refuses explicitly, naming the file and the missing key, when no classification model is named', () => {
    const routingPolicy = { version: 1, routines: {} }
    const modelCatalog = loadModelCatalog('.automation/model-catalog.yml')
    expect(() => resolveClassifierModel(routingPolicy, modelCatalog)).toThrowError(
      /routing-policy\.yml.*routines\.classification/s,
    )
  })

  it('refuses when the referenced model is absent from the catalogue', () => {
    const routingPolicy = {
      version: 1,
      routines: { classification: { bands: { standard: { candidates: { primary: { model: 'nonexistent', weight: 100 } } } } } },
    }
    const modelCatalog = loadModelCatalog('.automation/model-catalog.yml')
    expect(() => resolveClassifierModel(routingPolicy, modelCatalog)).toThrowError(/nonexistent/)
  })
})

describe('.claude/agents/complexity-classifier.md', () => {
  it('declares only read-only tools — no GitHub write, no file edit, no shell', () => {
    const agentFile = readFileSync('.claude/agents/complexity-classifier.md', 'utf8')
    const toolsLine = agentFile.match(/^tools: (.+)$/m)?.[1] ?? ''
    const tools = toolsLine.split(',').map((t) => t.trim())
    expect(tools.length).toBeGreaterThan(0)
    for (const tool of tools) {
      expect(tool).not.toMatch(/Edit|Write|Bash|Agent|mcp__github__/)
    }
  })

  it('states the same prompt version as CLASSIFIER_PROMPT_VERSION', () => {
    const agentFile = readFileSync('.claude/agents/complexity-classifier.md', 'utf8')
    expect(agentFile).toContain(`Prompt version: ${CLASSIFIER_PROMPT_VERSION}`)
  })
})
