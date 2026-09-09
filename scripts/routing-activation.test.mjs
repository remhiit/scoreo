import { describe, expect, it } from 'vitest'
import { resolveActivation } from './routing-activation.mjs'

const POLICY = {
  version: 1,
  routines: {
    'implement-task': {},
    'pr-review': {},
  },
  activation: {
    'implement-task': {
      trivial: 'apply',
      standard: 'observe',
      complex: 'observe',
      'very-complex': 'observe',
    },
  },
}

describe('resolveActivation', () => {
  describe('résolution', () => {
    it('keeps a triplet declared "apply"', () => {
      expect(resolveActivation(POLICY, { routine: 'implement-task', band: 'trivial', riskLevel: 'low' })).toEqual({
        mode: 'apply',
        reason: 'activation.implement-task.trivial déclare "apply"',
      })
    })

    it('keeps a triplet declared "observe"', () => {
      const result = resolveActivation(POLICY, { routine: 'implement-task', band: 'standard', riskLevel: 'medium' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('activation.implement-task.standard déclare "observe"')
    })

    it('resolves "observe" for a triplet not covered by the matrix, naming the missing declaration', () => {
      const result = resolveActivation(POLICY, { routine: 'pr-review', band: 'trivial', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('activation.pr-review.trivial')
      expect(result.reason).toContain('non couvert')
    })
  })

  describe('précédence du risque', () => {
    it('overrides a declared "apply" to "observe" when risk is high, naming the discarded declaration', () => {
      const result = resolveActivation(POLICY, { routine: 'implement-task', band: 'trivial', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('activation.implement-task.trivial')
      expect(result.reason).toContain('écartée')
    })

    it('stays "observe" when risk is high and the triplet is already declared "observe"', () => {
      const result = resolveActivation(POLICY, { routine: 'implement-task', band: 'standard', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('force toujours "observe"')
    })

    it('stays "observe" when risk is high and the triplet is not declared at all', () => {
      const result = resolveActivation(POLICY, { routine: 'pr-review', band: 'complex', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('force toujours "observe"')
    })
  })

  describe('refus', () => {
    it('rejects an unknown mode, naming the file and the key', () => {
      const policy = structuredClone(POLICY)
      policy.activation['implement-task'].trivial = 'sometimes'
      expect(() => resolveActivation(policy, { routine: 'implement-task', band: 'trivial', riskLevel: 'low' })).toThrow(
        /\.automation\/routing-policy\.yml: activation\.implement-task\.trivial: mode inconnu "sometimes"/,
      )
    })

    it('rejects a routine absent from "routines", naming the file and the key', () => {
      expect(() => resolveActivation(POLICY, { routine: 'does-not-exist', band: 'trivial', riskLevel: 'low' })).toThrow(
        /\.automation\/routing-policy\.yml: routines\.does-not-exist: routine inconnue/,
      )
    })

    it('rejects an unknown band, naming the file and the key', () => {
      expect(() =>
        resolveActivation(POLICY, { routine: 'implement-task', band: 'medium', riskLevel: 'low' }),
      ).toThrow(/\.automation\/routing-policy\.yml: activation\.implement-task\.medium: bande inconnue/)
    })
  })

  describe('matrice absente', () => {
    it('resolves "observe" for any triplet and says the section is absent', () => {
      const policy = { version: 1, routines: { 'implement-task': {} } }
      const result = resolveActivation(policy, { routine: 'implement-task', band: 'complex', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('section "activation" absente ou vide')
    })

    it('resolves "observe" for an empty activation object', () => {
      const policy = { version: 1, routines: { 'implement-task': {} }, activation: {} }
      const result = resolveActivation(policy, { routine: 'implement-task', band: 'complex', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('section "activation" absente ou vide')
    })
  })
})
