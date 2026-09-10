import { describe, expect, it } from 'vitest'
import { detectRollbackDuringRun, resolveActivation } from './routing-activation.mjs'

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

  describe('rollback (#480)', () => {
    const ROLLBACK_POLICY = {
      version: 1,
      rollback: true,
      routines: {
        'implement-task': {},
        'pr-review': {},
      },
      activation: {
        'implement-task': {
          trivial: 'apply',
          standard: 'apply',
          complex: 'apply',
          'very-complex': 'apply',
        },
      },
    }

    it('forces every triplet to "observe" when active, even against a matrix declaring "apply" everywhere, citing the rollback in the reason', () => {
      for (const band of ['trivial', 'standard', 'complex', 'very-complex']) {
        const result = resolveActivation(ROLLBACK_POLICY, { routine: 'implement-task', band, riskLevel: 'low' })
        expect(result.mode).toBe('observe')
        expect(result.reason).toContain('rollback actif')
      }
    })

    it('wins over the high-risk guard too, citing rollback rather than risk in the reason', () => {
      const result = resolveActivation(ROLLBACK_POLICY, { routine: 'implement-task', band: 'trivial', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('rollback actif')
    })

    it('still rejects an incoherent matrix loudly even when rollback is active — malformed config is never silently resolved to "observe"', () => {
      const policy = structuredClone(ROLLBACK_POLICY)
      policy.activation['implement-task'].trivial = 'aply'
      expect(() =>
        resolveActivation(policy, { routine: 'implement-task', band: 'trivial', riskLevel: 'low' }),
      ).toThrow(/\.automation\/routing-policy\.yml: activation\.implement-task\.trivial: mode inconnu "aply"/)
    })

    it('treats an absent switch as false, the nominal case — the matrix applies normally', () => {
      const result = resolveActivation(POLICY, { routine: 'implement-task', band: 'trivial', riskLevel: 'low' })
      expect(result).toEqual({ mode: 'apply', reason: 'activation.implement-task.trivial déclare "apply"' })
    })

    it('rejects a non-boolean value, naming the file and the key, never interpreted as false', () => {
      const policy = { ...structuredClone(POLICY), rollback: 'true' }
      expect(() =>
        resolveActivation(policy, { routine: 'implement-task', band: 'trivial', riskLevel: 'low' }),
      ).toThrow(/\.automation\/routing-policy\.yml: rollback: doit être un booléen/)
    })

    it('distinguishes a rollback-driven "observe" from a plain matrix-driven "observe" via the reason', () => {
      const matrixObserve = resolveActivation(POLICY, { routine: 'implement-task', band: 'standard', riskLevel: 'low' })
      const rollbackObserve = resolveActivation(ROLLBACK_POLICY, {
        routine: 'implement-task',
        band: 'standard',
        riskLevel: 'low',
      })
      expect(matrixObserve.mode).toBe('observe')
      expect(rollbackObserve.mode).toBe('observe')
      expect(matrixObserve.reason).not.toContain('rollback')
      expect(rollbackObserve.reason).toContain('rollback')
      expect(matrixObserve.reason).not.toBe(rollbackObserve.reason)
    })
  })

  describe('detectRollbackDuringRun (#490)', () => {
    it('detects the transition absent/false → true', () => {
      expect(detectRollbackDuringRun(undefined, true)).toBe(true)
      expect(detectRollbackDuringRun(false, true)).toBe(true)
    })

    it('does not detect true → true — already active at open, covered by resolveActivation\'s own reason', () => {
      expect(detectRollbackDuringRun(true, true)).toBe(false)
    })

    it('does not detect true → false — cancelled before the journal closes', () => {
      expect(detectRollbackDuringRun(true, false)).toBe(false)
    })

    it('does not detect false → false — the nominal case', () => {
      expect(detectRollbackDuringRun(false, false)).toBe(false)
      expect(detectRollbackDuringRun(undefined, false)).toBe(false)
      expect(detectRollbackDuringRun(undefined, undefined)).toBe(false)
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
