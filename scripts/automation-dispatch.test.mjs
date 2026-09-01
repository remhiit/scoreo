import { describe, expect, it } from 'vitest'
import {
  loadRoutinesConfig,
  parseRoutinesYaml,
  resolveRoutine,
  validateRoutinesConfig,
} from './automation-dispatch.mjs'

const VALID_CONFIG = {
  version: 1,
  routines: {
    'implement-task': {
      entity: 'issue',
      trigger_label: 'ready',
      skill: 'implement-task',
      concurrency_key: 'issue',
    },
    'pr-review': {
      entity: 'pull_request',
      trigger_label: 'needs-review',
      skill: 'pr-review',
      concurrency_key: 'pull-request',
      deduplicate_by: 'head_sha',
    },
    'address-feedback': {
      entity: 'pull_request',
      trigger_label: 'needs-fix',
      skill: 'address-feedback',
      concurrency_key: 'pull-request',
      max_iterations: 3,
    },
  },
}

describe('parseRoutinesYaml', () => {
  it('parses the nested label → routine → skill mapping', () => {
    const yaml = `
version: 1
routines:
  implement-task:
    entity: issue
    trigger_label: ready
    skill: implement-task
    concurrency_key: issue
  pr-review:
    entity: pull_request
    trigger_label: needs-review
    skill: pr-review
    concurrency_key: pull-request
    deduplicate_by: head_sha
`
    expect(parseRoutinesYaml(yaml)).toEqual({
      version: 1,
      routines: {
        'implement-task': {
          entity: 'issue',
          trigger_label: 'ready',
          skill: 'implement-task',
          concurrency_key: 'issue',
        },
        'pr-review': {
          entity: 'pull_request',
          trigger_label: 'needs-review',
          skill: 'pr-review',
          concurrency_key: 'pull-request',
          deduplicate_by: 'head_sha',
        },
      },
    })
  })

  it('ignores blank lines and comments', () => {
    const yaml = `
# top-level comment
version: 1

routines:
  implement-task:
    # nested comment
    entity: issue
    trigger_label: ready
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
          trigger_label: 'ready',
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
          trigger_label: 'ready',
          skill: 'implement-task',
          concurrency_key: 'issue',
        },
        duplicate: {
          entity: 'issue',
          trigger_label: 'ready',
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
    expect(resolveRoutine(VALID_CONFIG, { entity: 'issue', label: 'ready' })).toEqual({
      name: 'implement-task',
      skill: 'implement-task',
      entity: 'issue',
      triggerLabel: 'ready',
      targetLabel: 'in-progress',
    })
  })

  it('returns null when no routine matches the entity/label pair', () => {
    expect(resolveRoutine(VALID_CONFIG, { entity: 'issue', label: 'needs-review' })).toBeNull()
  })
})
