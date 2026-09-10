import { describe, expect, it } from 'vitest'
import { checkBudget, loadBudgets } from './routing-budget.mjs'

const POLICY = {
  version: 1,
  budgets: {
    coordinator: {
      per_run: {
        subagents_launched: 10,
        fix_iterations: 3,
      },
      per_period: {
        runs_per_day: 5,
      },
    },
  },
}

describe('loadBudgets', () => {
  it('normalizes a well-formed budgets section to camelCase', () => {
    expect(loadBudgets(POLICY)).toEqual({
      coordinator: {
        perRun: { subagentsLaunched: 10, fixIterations: 3 },
        perPeriod: { runsPerDay: 5 },
      },
    })
  })

  it('returns an empty object when the section is absent — non-binding, not an error', () => {
    expect(loadBudgets({ version: 1 })).toEqual({})
  })

  it('accepts a routine declaring only per_run', () => {
    const policy = { version: 1, budgets: { coordinator: { per_run: { subagents_launched: 4 } } } }
    expect(loadBudgets(policy)).toEqual({ coordinator: { perRun: { subagentsLaunched: 4 } } })
  })

  describe('refus au chargement', () => {
    it('rejects a zero budget, naming the file and the key', () => {
      const policy = structuredClone(POLICY)
      policy.budgets.coordinator.per_run.subagents_launched = 0
      expect(() => loadBudgets(policy)).toThrow(
        /\.automation\/routing-policy\.yml: budgets\.coordinator\.per_run\.subagents_launched: doit être un entier positif/,
      )
    })

    it('rejects a negative budget, naming the file and the key', () => {
      const policy = structuredClone(POLICY)
      policy.budgets.coordinator.per_period.runs_per_day = -1
      expect(() => loadBudgets(policy)).toThrow(
        /\.automation\/routing-policy\.yml: budgets\.coordinator\.per_period\.runs_per_day: doit être un entier positif/,
      )
    })

    it('rejects a non-numeric budget, naming the file and the key', () => {
      const policy = structuredClone(POLICY)
      policy.budgets.coordinator.per_run.fix_iterations = 'trois'
      expect(() => loadBudgets(policy)).toThrow(
        /\.automation\/routing-policy\.yml: budgets\.coordinator\.per_run\.fix_iterations: doit être un entier positif/,
      )
    })

    it('rejects an unknown field inside per_run', () => {
      const policy = { version: 1, budgets: { coordinator: { per_run: { reviews_launched: 5 } } } }
      expect(() => loadBudgets(policy)).toThrow(/budgets\.coordinator\.per_run: champ inconnu "reviews_launched"/)
    })

    it('rejects an unknown bucket', () => {
      const policy = { version: 1, budgets: { coordinator: { per_hour: { subagents_launched: 5 } } } }
      expect(() => loadBudgets(policy)).toThrow(/budgets\.coordinator: champ inconnu "per_hour"/)
    })

    it('rejects a non-object routine entry', () => {
      const policy = { version: 1, budgets: { coordinator: 5 } }
      expect(() => loadBudgets(policy)).toThrow(/budgets\.coordinator: doit être un objet/)
    })

    it('rejects a non-object budgets section', () => {
      expect(() => loadBudgets({ version: 1, budgets: 'oui' })).toThrow(/budgets: doit être un objet/)
    })
  })
})

describe('checkBudget', () => {
  const BUDGETS = loadBudgets(POLICY)

  describe('décision', () => {
    it('is "ok" under the limit', () => {
      const result = checkBudget(BUDGETS, { subagentsLaunched: 3 }, { routine: 'coordinator', scope: 'subagentsLaunched' })
      expect(result.status).toBe('ok')
      expect(result.limit).toBe(10)
      expect(result.observed).toBe(3)
      expect(result.limits).toEqual([])
    })

    it('is "ok" exactly at the limit — an inclusive bound', () => {
      const result = checkBudget(BUDGETS, { subagentsLaunched: 10 }, { routine: 'coordinator', scope: 'subagentsLaunched' })
      expect(result.status).toBe('ok')
      expect(result.reason).toContain('sous le plafond')
    })

    it('is "exceeded" above the limit, naming the crossed budget', () => {
      const result = checkBudget(BUDGETS, { subagentsLaunched: 11 }, { routine: 'coordinator', scope: 'subagentsLaunched' })
      expect(result.status).toBe('exceeded')
      expect(result.limit).toBe(10)
      expect(result.observed).toBe(11)
      expect(result.reason).toBe('budgets.coordinator.per_run.subagents_launched: plafond dépassé (observé 11 > plafond 10)')
    })
  })

  describe('portées évaluées indépendamment', () => {
    it('checks the per-run budget without touching the per-period one', () => {
      const result = checkBudget(BUDGETS, { fixIterations: 4 }, { routine: 'coordinator', scope: 'fixIterations' })
      expect(result.status).toBe('exceeded')
      expect(result.reason).toContain('budgets.coordinator.per_run.fix_iterations')
    })

    it('checks the per-period budget without touching any per-run one', () => {
      const result = checkBudget(BUDGETS, { runsPerDay: 6 }, { routine: 'coordinator', scope: 'runsPerDay' })
      expect(result.status).toBe('exceeded')
      expect(result.reason).toContain('budgets.coordinator.per_period.runs_per_day')
    })

    it('a per-run overrun never reports the untouched per-period budget as exceeded', () => {
      const result = checkBudget(BUDGETS, { runsPerDay: 1 }, { routine: 'coordinator', scope: 'runsPerDay' })
      expect(result.status).toBe('ok')
    })
  })

  describe('absence — non contraignant', () => {
    it('returns "ok" for a routine with no declared budgets at all, and logs it in limits', () => {
      const result = checkBudget({}, { subagentsLaunched: 999 }, { routine: 'address-feedback', scope: 'subagentsLaunched' })
      expect(result.status).toBe('ok')
      expect(result.limit).toBeNull()
      expect(result.limits).toEqual([expect.stringContaining('aucun plafond déclaré')])
    })

    it('returns "ok" for a scope not declared on an otherwise-budgeted routine', () => {
      const budgets = { coordinator: { perRun: { subagentsLaunched: 10 } } }
      const result = checkBudget(budgets, { fixIterations: 999 }, { routine: 'coordinator', scope: 'fixIterations' })
      expect(result.status).toBe('ok')
      expect(result.limits).toEqual([expect.stringContaining('aucun plafond déclaré')])
    })
  })

  describe('compteurs indisponibles', () => {
    it('skips the per-period budget when its counter is unavailable, and says so in limits', () => {
      const result = checkBudget(BUDGETS, {}, { routine: 'coordinator', scope: 'runsPerDay' })
      expect(result.status).toBe('ok')
      expect(result.observed).toBeNull()
      expect(result.limits).toEqual([expect.stringContaining('compteur indisponible')])
    })

    it('still applies the per-run budget when only the period counter is missing', () => {
      const result = checkBudget(BUDGETS, { subagentsLaunched: 11 }, { routine: 'coordinator', scope: 'subagentsLaunched' })
      expect(result.status).toBe('exceeded')
    })
  })

  describe('refus', () => {
    it('rejects a missing routine', () => {
      expect(() => checkBudget(BUDGETS, {}, { scope: 'subagentsLaunched' })).toThrow(/"routine" est requis/)
    })

    it('rejects an unknown scope', () => {
      expect(() => checkBudget(BUDGETS, {}, { routine: 'coordinator', scope: 'tokensSpent' })).toThrow(
        /scope inconnu "tokensSpent"/,
      )
    })
  })
})
