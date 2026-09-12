import { describe, expect, it } from 'vitest'
import {
  ARBITRABLE_MOTIFS,
  applyArbitrationVerdict,
  isArbitrableMotif,
  resolveArbitration,
  selectArbiter,
  validateArbitrationVerdict,
} from './arbitration.mjs'

const LEAD_MOTIFS = ['spec-ambigue', 'derive-vs-spec']
const EXPERT_MOTIFS = ['tentatives-epuisees', 'derive-vs-review', 'validation-rouge', 'findings-contradictoires', 'finding-trop-vague']
const NON_ARBITRABLE_MOTIFS = ['relecteur-manquant', 'sous-agent-hs', 'routage-no-candidate', 'budget-depasse', 'possession-perimee']

describe('isArbitrableMotif', () => {
  for (const motif of [...LEAD_MOTIFS, ...EXPERT_MOTIFS]) {
    it(`"${motif}" est arbitrable`, () => {
      expect(isArbitrableMotif(motif)).toBe(true)
    })
  }

  for (const motif of NON_ARBITRABLE_MOTIFS) {
    it(`"${motif}" n'est pas arbitrable`, () => {
      expect(isArbitrableMotif(motif)).toBe(false)
    })
  }

  it('un motif inconnu renvoie false, jamais true par défaut', () => {
    expect(isArbitrableMotif('motif-jamais-vu')).toBe(false)
    expect(isArbitrableMotif(undefined)).toBe(false)
  })
})

describe('selectArbiter', () => {
  for (const motif of LEAD_MOTIFS) {
    it(`"${motif}" va à arbiter-lead`, () => {
      expect(selectArbiter(motif)).toBe('arbiter-lead')
    })
  }

  for (const motif of EXPERT_MOTIFS) {
    it(`"${motif}" va à arbiter-expert`, () => {
      expect(selectArbiter(motif)).toBe('arbiter-expert')
    })
  }

  it('un motif non arbitrable ne renvoie aucun arbitre', () => {
    for (const motif of NON_ARBITRABLE_MOTIFS) {
      expect(selectArbiter(motif)).toBeNull()
    }
    expect(selectArbiter('motif-jamais-vu')).toBeNull()
  })

  it("aucun motif arbitrable ne renvoie les deux arbitres à la fois — un seul par motif", () => {
    for (const motif of ARBITRABLE_MOTIFS) {
      const arbiter = selectArbiter(motif)
      expect(['arbiter-lead', 'arbiter-expert']).toContain(arbiter)
    }
  })
})

describe('resolveArbitration', () => {
  const POLICY = {
    version: 1,
    arbitration: {
      'spec-ambigue': 'apply',
      'derive-vs-spec': 'observe',
    },
  }

  describe('résolution', () => {
    it('keeps a motif declared "apply"', () => {
      expect(resolveArbitration(POLICY, { motif: 'spec-ambigue', riskLevel: 'low' })).toEqual({
        mode: 'apply',
        reason: 'arbitration.spec-ambigue déclare "apply"',
      })
    })

    it('keeps a motif declared "observe"', () => {
      const result = resolveArbitration(POLICY, { motif: 'derive-vs-spec', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('arbitration.derive-vs-spec déclare "observe"')
    })

    it('resolves "observe" for a motif not covered by the matrix, naming the missing declaration', () => {
      const result = resolveArbitration(POLICY, { motif: 'validation-rouge', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('arbitration.validation-rouge')
      expect(result.reason).toContain('non couvert')
    })
  })

  describe('précédence du risque', () => {
    it('overrides a declared "apply" to "observe" when risk is high, naming the discarded declaration', () => {
      const result = resolveArbitration(POLICY, { motif: 'spec-ambigue', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('arbitration.spec-ambigue')
      expect(result.reason).toContain('écartée')
    })

    it('stays "observe" when risk is high and the motif is already declared "observe"', () => {
      const result = resolveArbitration(POLICY, { motif: 'derive-vs-spec', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('force toujours "observe"')
    })

    it('stays "observe" when risk is high and the motif is not declared at all', () => {
      const result = resolveArbitration(POLICY, { motif: 'findings-contradictoires', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('force toujours "observe"')
    })

    it('treats an absent riskLevel as "high", never as "low"', () => {
      const result = resolveArbitration(POLICY, { motif: 'spec-ambigue', riskLevel: undefined })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('illisible')
      expect(result.reason).toContain('absent')
    })

    it('treats an unreadable riskLevel as "high", never as "low"', () => {
      const result = resolveArbitration(POLICY, { motif: 'spec-ambigue', riskLevel: 'medium' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('illisible')
    })
  })

  describe('refus', () => {
    it('rejects an unknown mode, naming the file and the key', () => {
      const policy = structuredClone(POLICY)
      policy.arbitration['spec-ambigue'] = 'sometimes'
      expect(() => resolveArbitration(policy, { motif: 'spec-ambigue', riskLevel: 'low' })).toThrow(
        /\.automation\/routing-policy\.yml: arbitration\.spec-ambigue: mode inconnu "sometimes"/,
      )
    })

    it('rejects a motif absent from the arbitrable list, naming the file and the key', () => {
      expect(() => resolveArbitration(POLICY, { motif: 'relecteur-manquant', riskLevel: 'low' })).toThrow(
        /\.automation\/routing-policy\.yml: arbitration\.relecteur-manquant: motif inconnu/,
      )
    })

    it('rejects a non-boolean rollback, naming the file and the key, never interpreted as false', () => {
      const policy = { ...structuredClone(POLICY), rollback: 'true' }
      expect(() => resolveArbitration(policy, { motif: 'spec-ambigue', riskLevel: 'low' })).toThrow(
        /\.automation\/routing-policy\.yml: rollback: doit être un booléen/,
      )
    })
  })

  describe('rollback (#480, aussi couvre l\'arbitrage)', () => {
    const ROLLBACK_POLICY = {
      version: 1,
      rollback: true,
      arbitration: { 'spec-ambigue': 'apply' },
    }

    it('forces every motif to "observe" when active, even against a matrix declaring "apply", citing the rollback in the reason', () => {
      const result = resolveArbitration(ROLLBACK_POLICY, { motif: 'spec-ambigue', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('rollback actif')
    })

    it('wins over the high-risk guard too, citing rollback rather than risk in the reason', () => {
      const result = resolveArbitration(ROLLBACK_POLICY, { motif: 'spec-ambigue', riskLevel: 'high' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('rollback actif')
    })
  })

  describe('matrice absente', () => {
    it('resolves "observe" for any motif and says the section is absent', () => {
      const result = resolveArbitration({ version: 1 }, { motif: 'validation-rouge', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('section "arbitration" absente ou vide')
    })

    it('resolves "observe" for an empty arbitration object', () => {
      const result = resolveArbitration({ version: 1, arbitration: {} }, { motif: 'validation-rouge', riskLevel: 'low' })
      expect(result.mode).toBe('observe')
      expect(result.reason).toContain('section "arbitration" absente ou vide')
    })
  })

  describe('distinction des reason (#497)', () => {
    it('distinguishes rollback, high-risk, not-covered and plain-declaration "observe" from one another', () => {
      const declaredObserve = resolveArbitration(POLICY, { motif: 'derive-vs-spec', riskLevel: 'low' })
      const notCovered = resolveArbitration(POLICY, { motif: 'validation-rouge', riskLevel: 'low' })
      const highRisk = resolveArbitration(POLICY, { motif: 'derive-vs-spec', riskLevel: 'high' })
      const rollback = resolveArbitration(
        { version: 1, rollback: true, arbitration: POLICY.arbitration },
        { motif: 'derive-vs-spec', riskLevel: 'low' },
      )

      const reasons = [declaredObserve.reason, notCovered.reason, highRisk.reason, rollback.reason]
      expect(new Set(reasons).size).toBe(4)
    })
  })
})

describe('validateArbitrationVerdict', () => {
  const VALID_RESOLVE = {
    verdict: 'resolve',
    motif: 'validation-rouge',
    arbiter: 'arbiter-expert',
    reasoning: 'La suite reste rouge à cause d’un flake identifié, pas d’une vraie régression.',
    instruction: 'Relancer le test e2e concerné avant de conclure.',
    sameModelAsRun: false,
  }

  const VALID_OVERRIDE = {
    verdict: 'override',
    motif: 'findings-contradictoires',
    arbiter: 'arbiter-expert',
    reasoning: 'Le finding technique contredit la convention documentée, écarté.',
    overriddenFinding: 'Le reducer appelle directement un repository',
    sameModelAsRun: true,
  }

  const VALID_ESCALATE = {
    verdict: 'escalate',
    motif: 'spec-ambigue',
    arbiter: 'arbiter-lead',
    reasoning: 'Les deux lectures de la spec sont également plausibles, aucune ne l’emporte.',
    sameModelAsRun: false,
  }

  it('accepts a valid "resolve" verdict', () => {
    expect(validateArbitrationVerdict(VALID_RESOLVE)).toEqual({ valid: true, errors: [] })
  })

  it('accepts a valid "override" verdict', () => {
    expect(validateArbitrationVerdict(VALID_OVERRIDE)).toEqual({ valid: true, errors: [] })
  })

  it('accepts a valid "escalate" verdict', () => {
    expect(validateArbitrationVerdict(VALID_ESCALATE)).toEqual({ valid: true, errors: [] })
  })

  it('rejects a verdict outside the enum', () => {
    const result = validateArbitrationVerdict({ ...VALID_ESCALATE, verdict: 'ignore' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('verdict'))).toBe(true)
  })

  it('rejects a non-arbitrable motif', () => {
    const result = validateArbitrationVerdict({ ...VALID_ESCALATE, motif: 'relecteur-manquant' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('motif'))).toBe(true)
  })

  it('rejects an unknown arbiter', () => {
    const result = validateArbitrationVerdict({ ...VALID_ESCALATE, arbiter: 'arbiter-junior' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('arbiter'))).toBe(true)
  })

  it('rejects a valid arbiter that does not match selectArbiter(motif) — arbiter-expert on a condition-1 motif', () => {
    // spec-ambigue is a LEAD_MOTIFS entry (selectArbiter → arbiter-lead) —
    // arbiter-expert structurally never reads the issue spec it would need
    // to rule on this motif.
    const result = validateArbitrationVerdict({ ...VALID_ESCALATE, motif: 'spec-ambigue', arbiter: 'arbiter-expert' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('arbiter') && e.includes('spec-ambigue'))).toBe(true)
  })

  it('rejects a valid arbiter that does not match selectArbiter(motif) — arbiter-lead on a condition-3 motif', () => {
    // validation-rouge is an EXPERT_MOTIFS entry (selectArbiter → arbiter-expert)
    // — arbiter-lead structurally never reads the technical review it would
    // need to rule on this motif.
    const result = validateArbitrationVerdict({ ...VALID_RESOLVE, motif: 'validation-rouge', arbiter: 'arbiter-lead' })
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('arbiter') && e.includes('validation-rouge'))).toBe(true)
  })

  it('rejects a "resolve" without instruction', () => {
    const { instruction, ...withoutInstruction } = VALID_RESOLVE
    const result = validateArbitrationVerdict(withoutInstruction)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('instruction'))).toBe(true)
  })

  it('rejects an "override" without overriddenFinding', () => {
    const { overriddenFinding, ...withoutTarget } = VALID_OVERRIDE
    const result = validateArbitrationVerdict(withoutTarget)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('overriddenFinding'))).toBe(true)
  })

  it('rejects a missing sameModelAsRun', () => {
    const { sameModelAsRun, ...withoutFlag } = VALID_ESCALATE
    const result = validateArbitrationVerdict(withoutFlag)
    expect(result.valid).toBe(false)
    expect(result.errors.some((e) => e.includes('sameModelAsRun'))).toBe(true)
  })

  it('rejects an entry that is not an object', () => {
    expect(validateArbitrationVerdict('resolve').valid).toBe(false)
    expect(validateArbitrationVerdict(null).valid).toBe(false)
    expect(validateArbitrationVerdict(undefined).valid).toBe(false)
    expect(validateArbitrationVerdict(['resolve']).valid).toBe(false)
  })
})

describe('chaîne complète isArbitrableMotif → selectArbiter → resolveArbitration → applyArbitrationVerdict (#498)', () => {
  // Reflète la matrice réelle de .automation/routing-policy.yml (tranche
  // 2/5, #498) : seul `derive-vs-review` est en "apply", tous les autres
  // motifs arbitrables restent en "observe".
  const REAL_POLICY = {
    version: 1,
    arbitration: {
      'spec-ambigue': 'observe',
      'finding-trop-vague': 'observe',
      'derive-vs-spec': 'observe',
      'tentatives-epuisees': 'observe',
      'derive-vs-review': 'apply',
      'validation-rouge': 'observe',
      'findings-contradictoires': 'observe',
    },
  }

  it('triplet actif derive-vs-review × low → resolve : la chaîne complète mène à un tour de correctif supplémentaire', () => {
    const motif = 'derive-vs-review'
    const riskLevel = 'low'

    expect(isArbitrableMotif(motif)).toBe(true)

    const arbiter = selectArbiter(motif)
    expect(arbiter).toBe('arbiter-expert')

    const { mode, reason } = resolveArbitration(REAL_POLICY, { motif, riskLevel })
    expect(mode).toBe('apply')
    expect(reason).toContain('arbitration.derive-vs-review déclare "apply"')

    // Le mode résolu à "apply" est ce qui autorise le coordinateur à
    // effectivement lancer l'arbitre — son verdict "resolve" est alors
    // appliqué mécaniquement, jamais interprété.
    const verdict = {
      verdict: 'resolve',
      motif,
      arbiter,
      reasoning: 'La review a signalé une dérive de périmètre réelle, un correctif ciblé la résout.',
      instruction: 'Restreindre le correctif au finding désigné par le relecteur technique.',
      sameModelAsRun: true,
    }
    expect(validateArbitrationVerdict(verdict)).toEqual({ valid: true, errors: [] })

    const applied = applyArbitrationVerdict(verdict, {
      verdict: 'needs-fix',
      findings: [{ summary: 'Dérive de périmètre constatée', severity: 'important', reviewers: ['technical'] }],
      outOfCorpusFindings: [],
    })
    expect(applied.action).toBe('extra-fix-round')
    expect(applied.instruction).toBe(verdict.instruction)
  })

  it('triplet voisin tentatives-epuisees × low : reste en observe, jamais lancé', () => {
    const motif = 'tentatives-epuisees'
    const riskLevel = 'low'

    expect(isArbitrableMotif(motif)).toBe(true)

    const arbiter = selectArbiter(motif)
    expect(arbiter).toBe('arbiter-expert')

    const { mode, reason } = resolveArbitration(REAL_POLICY, { motif, riskLevel })
    expect(mode).toBe('observe')
    expect(reason).toContain('arbitration.tentatives-epuisees déclare "observe"')

    // Mode "observe" : le coordinateur ne lance jamais l'arbitre pour ce
    // triplet — la chaîne s'arrête ici, la décision reste l'escalade
    // directe habituelle, jamais un appel à applyArbitrationVerdict.
  })
})

describe('applyArbitrationVerdict', () => {
  const REVIEW_VERDICT = {
    verdict: 'needs-fix',
    findings: [
      { summary: 'Le reducer appelle directement un repository', severity: 'blocking', reviewers: ['technical'] },
      { summary: 'Nom de variable améliorable', severity: 'suggestion', reviewers: ['functional'] },
    ],
    outOfCorpusFindings: [],
  }

  it('"resolve" → extra-fix-round, carrying the arbiter instruction', () => {
    const result = applyArbitrationVerdict(
      {
        verdict: 'resolve',
        motif: 'validation-rouge',
        arbiter: 'arbiter-expert',
        reasoning: 'Flake identifié.',
        instruction: 'Relancer le test e2e concerné.',
        sameModelAsRun: false,
      },
      REVIEW_VERDICT,
    )
    expect(result.action).toBe('extra-fix-round')
    expect(result.instruction).toBe('Relancer le test e2e concerné.')
  })

  it('"escalate" → escalate', () => {
    const result = applyArbitrationVerdict(
      {
        verdict: 'escalate',
        motif: 'spec-ambigue',
        arbiter: 'arbiter-lead',
        reasoning: 'Les deux lectures sont plausibles.',
        sameModelAsRun: false,
      },
      REVIEW_VERDICT,
    )
    expect(result.action).toBe('escalate')
  })

  it('"override" that clears the last blocking/important finding → converge', () => {
    const reviewVerdict = {
      verdict: 'needs-fix',
      findings: [{ summary: 'Le reducer appelle directement un repository', severity: 'blocking', reviewers: ['technical'] }],
      outOfCorpusFindings: [],
    }
    const result = applyArbitrationVerdict(
      {
        verdict: 'override',
        motif: 'findings-contradictoires',
        arbiter: 'arbiter-expert',
        reasoning: 'Contredit la convention documentée.',
        overriddenFinding: 'le reducer appelle directement un repository',
        sameModelAsRun: true,
      },
      reviewVerdict,
    )
    expect(result.action).toBe('converge')
  })

  it('"override" that leaves another blocking/important finding → extra-fix-round, not converge', () => {
    const result = applyArbitrationVerdict(
      {
        verdict: 'override',
        motif: 'findings-contradictoires',
        arbiter: 'arbiter-expert',
        reasoning: 'Contredit la convention documentée.',
        overriddenFinding: 'Le reducer appelle directement un repository',
        sameModelAsRun: true,
      },
      {
        verdict: 'needs-fix',
        findings: [
          { summary: 'Le reducer appelle directement un repository', severity: 'blocking', reviewers: ['technical'] },
          { summary: 'Champ sans .default() zod', severity: 'important', reviewers: ['technical'] },
        ],
        outOfCorpusFindings: [],
      },
    )
    expect(result.action).toBe('extra-fix-round')
  })

  it('a verdict outside the schema → escalate, never a free-text interpretation', () => {
    const result = applyArbitrationVerdict({ verdict: 'do-whatever' }, REVIEW_VERDICT)
    expect(result.action).toBe('escalate')
    expect(result.instruction).toBeNull()
  })

  it('a "resolve" without instruction → escalate', () => {
    const result = applyArbitrationVerdict(
      {
        verdict: 'resolve',
        motif: 'validation-rouge',
        arbiter: 'arbiter-expert',
        reasoning: 'Flake identifié.',
        sameModelAsRun: false,
      },
      REVIEW_VERDICT,
    )
    expect(result.action).toBe('escalate')
  })
})
