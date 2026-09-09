import { describe, expect, it } from 'vitest'
import {
  loadConfigFile,
  loadModelCatalog,
  loadRoutinesConfig,
  loadRoutingPolicy,
  parseRoutinesYaml,
  resolveRoutine,
  validateModelCatalog,
  validateRoutinesConfig,
  validateRoutingPolicy,
  validateRoutingPolicyCoverage,
} from './automation-dispatch.mjs'

const VALID_CONFIG = {
  version: 1,
  routines: {
    'implement-task': {
      entity: 'issue',
      trigger_label: 'automation:ready',
      skill: 'implement-task',
      concurrency_key: 'issue',
      routing_policy: 'implement-task',
    },
    'pr-review': {
      entity: 'pull_request',
      trigger_label: 'automation:needs-review',
      skill: 'pr-review',
      concurrency_key: 'pull-request',
      deduplicate_by: 'head_sha',
      routing_policy: 'pr-review',
    },
    'address-feedback': {
      entity: 'pull_request',
      trigger_label: 'automation:needs-fix',
      skill: 'address-feedback',
      concurrency_key: 'pull-request',
      max_iterations: 3,
      routing_policy: 'address-feedback',
    },
  },
}

const VALID_CATALOG = {
  version: 1,
  models: {
    'haiku-4-5': {
      provider: 'anthropic',
      model: 'claude-haiku-4-5-20251001',
      agent_alias: 'haiku',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
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
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 80,
      cost_tier: 'medium',
      latency_tier: 'medium',
      max_risk: 'high',
      max_complexity: 'very-complex',
      fallback: 'opus-5',
    },
    'opus-5': {
      provider: 'anthropic',
      model: 'claude-opus-5',
      agent_alias: 'opus',
      enabled: true,
      capabilities: { tools: true, structured_output: true, long_context: true },
      quality_score: 95,
      cost_tier: 'high',
      latency_tier: 'slow',
      max_risk: 'high',
      max_complexity: 'very-complex',
    },
    'disabled-model': {
      provider: 'anthropic',
      model: 'claude-disabled-example',
      enabled: false,
      capabilities: { tools: false, structured_output: false, long_context: false },
      quality_score: 50,
      cost_tier: 'medium',
      latency_tier: 'medium',
      max_risk: 'low',
      max_complexity: 'trivial',
    },
  },
}

const VALID_BAND = {
  candidates: { primary: { model: 'sonnet-5', weight: 100 } },
  min_score: 60,
  fallback: 'opus-5',
}

const VALID_ROUTINE_POLICY = {
  required_capabilities: { tools: true, structured_output: false, long_context: true },
  bands: {
    trivial: { candidates: { primary: { model: 'haiku-4-5', weight: 100 } }, min_score: 40, fallback: 'opus-5' },
    standard: VALID_BAND,
    complex: {
      candidates: { primary: { model: 'sonnet-5', weight: 60 }, secondary: { model: 'opus-5', weight: 40 } },
      min_score: 75,
      fallback: 'opus-5',
    },
    'very-complex': { candidates: { primary: { model: 'opus-5', weight: 100 } }, min_score: 90, fallback: 'opus-5' },
  },
  risk_overrides: { high: { model: 'opus-5' } },
}

const VALID_POLICY = {
  version: 1,
  routines: {
    'implement-task': structuredClone(VALID_ROUTINE_POLICY),
    'pr-review': structuredClone(VALID_ROUTINE_POLICY),
    'address-feedback': structuredClone(VALID_ROUTINE_POLICY),
  },
}

describe('parseRoutinesYaml', () => {
  it('parses the nested label → routine → skill mapping', () => {
    const yaml = `
version: 1
routines:
  implement-task:
    entity: issue
    trigger_label: automation:ready
    skill: implement-task
    concurrency_key: issue
  pr-review:
    entity: pull_request
    trigger_label: automation:needs-review
    skill: pr-review
    concurrency_key: pull-request
    deduplicate_by: head_sha
`
    expect(parseRoutinesYaml(yaml)).toEqual({
      version: 1,
      routines: {
        'implement-task': {
          entity: 'issue',
          trigger_label: 'automation:ready',
          skill: 'implement-task',
          concurrency_key: 'issue',
        },
        'pr-review': {
          entity: 'pull_request',
          trigger_label: 'automation:needs-review',
          skill: 'pr-review',
          concurrency_key: 'pull-request',
          deduplicate_by: 'head_sha',
        },
      },
    })
  })

  it('preserves a colon embedded in a scalar value (e.g. an automation:-prefixed label)', () => {
    const yaml = `
version: 1
routines:
  implement-task:
    entity: issue
    trigger_label: automation:ready
    skill: implement-task
    concurrency_key: issue
`
    expect(parseRoutinesYaml(yaml).routines['implement-task'].trigger_label).toBe('automation:ready')
  })

  it('parses true/false scalars as booleans (model-catalog.yml/routing-policy.yml, issue #400)', () => {
    const yaml = `
version: 1
models:
  sonnet-5:
    enabled: true
    capabilities:
      tools: false
`
    const parsed = parseRoutinesYaml(yaml)
    expect(parsed.models['sonnet-5'].enabled).toBe(true)
    expect(parsed.models['sonnet-5'].capabilities.tools).toBe(false)
  })

  it('ignores blank lines and comments', () => {
    const yaml = `
# top-level comment
version: 1

routines:
  implement-task:
    # nested comment
    entity: issue
    trigger_label: automation:ready
    skill: implement-task
    concurrency_key: issue
`
    expect(parseRoutinesYaml(yaml).routines['implement-task'].entity).toBe('issue')
  })
})

describe('loadRoutinesConfig', () => {
  it('loads and parses the real .automation/routines.yml', () => {
    const config = loadRoutinesConfig('.automation/routines.yml')
    expect(config.version).toBe(1)
    expect(Object.keys(config.routines).length).toBeGreaterThan(0)
    expect(validateRoutinesConfig(config)).toEqual({ valid: true, errors: [] })
  })
})

describe('validateRoutinesConfig', () => {
  it('accepts a well-formed configuration', () => {
    expect(validateRoutinesConfig(VALID_CONFIG)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a missing required field with a clear message', () => {
    const config = {
      version: 1,
      routines: {
        'implement-task': {
          entity: 'issue',
          skill: 'implement-task',
          concurrency_key: 'issue',
        },
      },
    }
    const { valid, errors } = validateRoutinesConfig(config)
    expect(valid).toBe(false)
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringContaining('routines.implement-task.trigger_label')]),
    )
  })

  it('rejects an invalid entity value', () => {
    const config = {
      version: 1,
      routines: {
        'implement-task': {
          entity: 'pr',
          trigger_label: 'automation:ready',
          skill: 'implement-task',
          concurrency_key: 'issue',
        },
      },
    }
    const { valid, errors } = validateRoutinesConfig(config)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('routines.implement-task.entity')]))
  })

  it('rejects two routines sharing the same entity + trigger_label (double-fire risk)', () => {
    const config = {
      version: 1,
      routines: {
        'implement-task': {
          entity: 'issue',
          trigger_label: 'automation:ready',
          skill: 'implement-task',
          concurrency_key: 'issue',
        },
        duplicate: {
          entity: 'issue',
          trigger_label: 'automation:ready',
          skill: 'some-other-skill',
          concurrency_key: 'issue',
        },
      },
    }
    const { valid, errors } = validateRoutinesConfig(config)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('déjà utilisé')]))
  })

  it('rejects an unknown top-level field', () => {
    const config = { ...VALID_CONFIG, extra: true }
    const { valid, errors } = validateRoutinesConfig(config)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('champ inconnu à la racine')]))
  })
})

describe('resolveRoutine', () => {
  it('resolves the routine, skill and target label for a matching event', () => {
    expect(resolveRoutine(VALID_CONFIG, { entity: 'issue', label: 'automation:ready' })).toEqual({
      name: 'implement-task',
      skill: 'implement-task',
      entity: 'issue',
      triggerLabel: 'automation:ready',
      targetLabel: 'automation:in-progress',
    })
  })

  it('returns null when no routine matches the entity/label pair', () => {
    expect(resolveRoutine(VALID_CONFIG, { entity: 'issue', label: 'automation:needs-review' })).toBeNull()
  })
})

describe('loadConfigFile', () => {
  it('loads and parses an existing file', () => {
    const { config, errors } = loadConfigFile('.automation/routines.yml')
    expect(errors).toEqual([])
    expect(config.version).toBe(1)
  })

  it('reports a missing file explicitly instead of throwing (issue #400)', () => {
    const { config, errors } = loadConfigFile('.automation/does-not-exist.yml')
    expect(config).toBeNull()
    expect(errors).toEqual([expect.stringContaining('fichier introuvable')])
  })
})

describe('loadModelCatalog / loadRoutingPolicy', () => {
  it('load and validate the real .automation/model-catalog.yml and routing-policy.yml', () => {
    const catalog = loadModelCatalog('.automation/model-catalog.yml')
    expect(validateModelCatalog(catalog)).toEqual({ valid: true, errors: [] })

    const policy = loadRoutingPolicy('.automation/routing-policy.yml')
    expect(validateRoutingPolicy(policy, catalog)).toEqual({ valid: true, errors: [] })

    const routines = loadRoutinesConfig('.automation/routines.yml')
    expect(validateRoutingPolicyCoverage(routines, policy)).toEqual({ valid: true, errors: [] })
  })
})

describe('validateModelCatalog', () => {
  it('accepts a well-formed catalog', () => {
    expect(validateModelCatalog(VALID_CATALOG)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a missing required field with a clear message', () => {
    const catalog = { version: 1, models: { 'sonnet-5': { ...VALID_CATALOG.models['sonnet-5'] } } }
    delete catalog.models['sonnet-5'].quality_score
    const { valid, errors } = validateModelCatalog(catalog)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('models.sonnet-5.quality_score')]))
  })

  it('rejects an invalid enum value', () => {
    const catalog = { version: 1, models: { 'sonnet-5': { ...VALID_CATALOG.models['sonnet-5'], cost_tier: 'astronomical' } } }
    const { valid, errors } = validateModelCatalog(catalog)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('models.sonnet-5.cost_tier')]))
  })

  it('rejects a fallback pointing at a model absent from the catalogue', () => {
    const catalog = {
      version: 1,
      models: { 'sonnet-5': { ...VALID_CATALOG.models['sonnet-5'], fallback: 'does-not-exist' } },
    }
    const { valid, errors } = validateModelCatalog(catalog)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('introuvable dans le catalogue')]))
  })

  it('rejects a circular fallback chain and displays the cycle', () => {
    const catalog = {
      version: 1,
      models: {
        a: { ...VALID_CATALOG.models['sonnet-5'], fallback: 'b' },
        b: { ...VALID_CATALOG.models['sonnet-5'], fallback: 'a' },
      },
    }
    const { valid, errors } = validateModelCatalog(catalog)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringMatching(/chaîne de fallback circulaire.*a -> b -> a/)]))
  })
})

describe('validateRoutingPolicy', () => {
  it('accepts a well-formed policy against the catalogue', () => {
    expect(validateRoutingPolicy(VALID_POLICY, VALID_CATALOG)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a candidate model absent from the catalogue', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.routines['implement-task'].bands.standard.candidates.primary.model = 'ghost-model'
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('absent du catalogue')]))
  })

  it('rejects a candidate referencing a disabled model', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.routines['implement-task'].bands.standard.candidates.primary.model = 'disabled-model'
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('désactivé dans le catalogue')]))
  })

  it('rejects weights that do not sum to 100', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.routines['implement-task'].bands.complex.candidates.primary.weight = 50
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('la somme des poids doit être 100')]))
  })

  it('rejects a negative weight', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.routines['implement-task'].bands.standard.candidates.primary.weight = -10
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('doit être un entier positif')]))
  })

  it('rejects a candidate below the band min_score', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.routines['implement-task'].bands.trivial.min_score = 90
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('sous le min_score de la bande')]))
  })

  it('rejects a candidate missing a capability required by the routine', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.routines['implement-task'].required_capabilities.structured_output = true
    const catalog = structuredClone(VALID_CATALOG)
    catalog.models['haiku-4-5'].capabilities.structured_output = false
    policy.routines['implement-task'].bands.trivial.candidates.primary.model = 'haiku-4-5'
    const { valid, errors } = validateRoutingPolicy(policy, catalog)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('ne couvre pas la capacité requise')]))
  })

  it('rejects a routine missing one of the four complexity bands', () => {
    const policy = structuredClone(VALID_POLICY)
    delete policy.routines['implement-task'].bands['very-complex']
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('routines.implement-task.bands.very-complex: bande manquante')]))
  })

  it('rejects a risk override pointing at a model below the required max_risk', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.routines['implement-task'].risk_overrides = { high: { model: 'haiku-4-5' } }
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('sous le niveau de risque requis')]))
  })

  it('accepts a well-formed "activation" section (issue #476)', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.activation = {
      'implement-task': { trivial: 'observe', standard: 'apply', complex: 'observe', 'very-complex': 'observe' },
    }
    expect(validateRoutingPolicy(policy, VALID_CATALOG)).toEqual({ valid: true, errors: [] })
  })

  it('accepts a missing "activation" section (optional, issue #476)', () => {
    const policy = structuredClone(VALID_POLICY)
    delete policy.activation
    expect(validateRoutingPolicy(policy, VALID_CATALOG)).toEqual({ valid: true, errors: [] })
  })

  it('rejects an "activation" entry naming a routine absent from "routines"', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.activation = { 'does-not-exist': { trivial: 'observe' } }
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('activation.does-not-exist: routine inconnue')]))
  })

  it('rejects an "activation" entry naming a band absent from complexity-thresholds.yml', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.activation = { 'implement-task': { medium: 'observe' } }
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringContaining('activation.implement-task.medium: bande inconnue')]),
    )
  })

  it('rejects an "activation" entry with an unknown mode', () => {
    const policy = structuredClone(VALID_POLICY)
    policy.activation = { 'implement-task': { trivial: 'sometimes' } }
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(
      expect.arrayContaining([expect.stringContaining('activation.implement-task.trivial: mode inconnu')]),
    )
  })

  it('rejects the removed global "dry_run" flag as an unknown top-level field (issue #476)', () => {
    const policy = { ...structuredClone(VALID_POLICY), dry_run: true }
    const { valid, errors } = validateRoutingPolicy(policy, VALID_CATALOG)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('champ inconnu à la racine : "dry_run"')]))
  })
})

describe('validateRoutingPolicyCoverage', () => {
  it('accepts a routine whose routing_policy resolves to a real policy entry', () => {
    expect(validateRoutingPolicyCoverage(VALID_CONFIG, VALID_POLICY)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a routine whose routing_policy has no matching entry (issue #400, "routine sans routing_policy")', () => {
    const config = structuredClone(VALID_CONFIG)
    config.routines['pr-review'].routing_policy = 'does-not-exist'
    const { valid, errors } = validateRoutingPolicyCoverage(config, VALID_POLICY)
    expect(valid).toBe(false)
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('aucune politique nommée "does-not-exist"')]))
  })
})
