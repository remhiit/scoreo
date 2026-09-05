import { describe, expect, it } from 'vitest'
import { buildTaskContext } from './task-context.mjs'
import {
  DEFAULT_THRESHOLDS,
  analyzeSpecCompleteness,
  assessComplexity,
  levelForScore,
  loadThresholds,
  validateComplexityAssessment,
} from './complexity-assessment.mjs'

const GENERATED_AT = '2026-09-05T12:00:00.000Z'

function specBody({ files, extraSections = true, acceptance = true } = {}) {
  const filesLines = files
    .map((f) => {
      const isNew = f.endsWith('(nouveau)')
      const path = isNew ? f.replace(/\s*\(nouveau\)\s*$/, '') : f
      return `- \`${path}\`${isNew ? ' (nouveau)' : ''}`
    })
    .join('\n')
  const parts = ['## Contexte', '', 'Un changement décrit pour les tests.', '']
  if (acceptance) {
    parts.push('## Critères d\'acceptation', '', '- [ ] Un critère.', '- [ ] Un second critère.', '')
  }
  parts.push('## Fichiers impactés', '', filesLines, '')
  if (extraSections) {
    parts.push('## Hors scope', '', '- Rien de plus.', '')
  }
  return parts.join('\n')
}

function buildCtx({
  entityType = 'pull_request',
  number = 1,
  body,
  labels = [],
  changedFiles,
  knownBlockers,
  diff,
  runId = '1',
}) {
  if (entityType === 'pull_request') {
    return buildTaskContext({
      eventName: 'pull_request',
      payload: {
        pull_request: {
          number,
          title: 'PR de test',
          html_url: `https://github.com/remhiit/scoreo/pull/${number}`,
          state: 'open',
          labels: labels.map((name) => ({ name })),
          body,
          draft: false,
          merged: false,
          head: { sha: 'sha-test' },
          base: { ref: 'main' },
          ...(diff ?? { changed_files: (changedFiles ?? []).length, additions: 10, deletions: 2 }),
        },
      },
      routine: 'implement-task',
      runId,
      generatedAt: GENERATED_AT,
      changedFiles,
      knownBlockers,
    })
  }
  return buildTaskContext({
    eventName: 'issues',
    payload: {
      issue: {
        number,
        title: 'Issue de test',
        html_url: `https://github.com/remhiit/scoreo/issues/${number}`,
        state: 'open',
        labels: labels.map((name) => ({ name })),
        body,
      },
    },
    routine: 'implement-task',
    runId,
    generatedAt: GENERATED_AT,
    changedFiles,
    knownBlockers,
  })
}

describe('levelForScore — frontières de bande', () => {
  it.each([
    [0, 'trivial'],
    [19, 'trivial'],
    [20, 'standard'],
    [44, 'standard'],
    [45, 'complex'],
    [69, 'complex'],
    [70, 'very-complex'],
    [100, 'very-complex'],
  ])('score %i → %s (arrondi : >= min appartient à la bande)', (score, expected) => {
    expect(levelForScore(score, DEFAULT_THRESHOLDS)).toBe(expected)
  })
})

describe('loadThresholds', () => {
  it('lit .automation/complexity-thresholds.yml et reste synchronisé avec DEFAULT_THRESHOLDS', () => {
    const loaded = loadThresholds('.automation/complexity-thresholds.yml')
    expect(loaded).toEqual(DEFAULT_THRESHOLDS)
  })
})

describe('analyzeSpecCompleteness', () => {
  it('signale un corps vide avec toutes les sections manquantes', () => {
    expect(analyzeSpecCompleteness('')).toEqual({
      bodyEmpty: true,
      missingSections: ['acceptance', 'files', 'outOfScope'],
      acceptanceCriteriaCount: 0,
      newFileCount: 0,
    })
  })

  it('compte les critères cochables et les fichiers marqués "(nouveau)"', () => {
    const body = specBody({ files: ['apps/scoreo/src/ui/x.ts (nouveau)', 'apps/scoreo/src/ui/y.ts'] })
    const result = analyzeSpecCompleteness(body)
    expect(result.bodyEmpty).toBe(false)
    expect(result.missingSections).toEqual([])
    expect(result.acceptanceCriteriaCount).toBe(2)
    expect(result.newFileCount).toBe(1)
  })

  it('détecte une section "Critères d\'acceptation" absente', () => {
    const body = specBody({ files: ['apps/scoreo/src/ui/x.ts'], acceptance: false })
    expect(analyzeSpecCompleteness(body).missingSections).toContain('acceptance')
  })
})

describe('assessComplexity — stabilité et déterminisme', () => {
  it('produit exactement la même sortie sur plusieurs exécutions avec les mêmes entrées', () => {
    const ctx = buildCtx({
      body: specBody({ files: ['apps/scoreo/src/ui/scoredetail/scoreDetailReducer.ts'] }),
      changedFiles: ['apps/scoreo/src/ui/scoredetail/scoreDetailReducer.ts'],
      knownBlockers: [],
    })
    const first = assessComplexity(ctx, { generatedAt: GENERATED_AT })
    const second = assessComplexity(ctx, { generatedAt: GENERATED_AT })
    expect(second).toEqual(first)
  })
})

describe('assessComplexity — cas représentatifs (ordre relatif)', () => {
  it('une modification localisée dans un reducer obtient un score inférieur à un changement transverse multi-paquets', () => {
    const localized = buildCtx({
      number: 10,
      body: specBody({ files: ['apps/scoreo/src/ui/scoredetail/scoreDetailReducer.ts', 'apps/scoreo/src/ui/scoredetail/scoreDetailReducer.test.ts'] }),
      changedFiles: ['apps/scoreo/src/ui/scoredetail/scoreDetailReducer.ts', 'apps/scoreo/src/ui/scoredetail/scoreDetailReducer.test.ts'],
      knownBlockers: [],
      diff: { changed_files: 2, additions: 18, deletions: 4 },
    })

    const crossCutting = buildCtx({
      number: 11,
      body: specBody({
        files: [
          'apps/scoreo/src/domain/model/Match.ts (nouveau)',
          'apps/scoreo/src/application/createMatchUseCase.ts',
          'apps/scoreo/src/infrastructure/localStorage/MatchRepository.ts',
          'packages/module-tori-valley/src/domain/scoring.ts (nouveau)',
          'schemas/import/match.schema.json (nouveau)',
        ],
        extraSections: false,
      }),
      changedFiles: [
        'apps/scoreo/src/domain/model/Match.ts',
        'apps/scoreo/src/application/createMatchUseCase.ts',
        'apps/scoreo/src/infrastructure/localStorage/MatchRepository.ts',
        'packages/module-tori-valley/src/domain/scoring.ts',
        'schemas/import/match.schema.json',
      ],
      knownBlockers: [{ number: 300 }],
      diff: { changed_files: 5, additions: 420, deletions: 60 },
    })

    const localizedResult = assessComplexity(localized, { generatedAt: GENERATED_AT })
    const crossCuttingResult = assessComplexity(crossCutting, { generatedAt: GENERATED_AT })

    expect(crossCuttingResult.score).toBeGreaterThan(localizedResult.score)
    expect(['trivial', 'standard']).toContain(localizedResult.level)
    expect(['complex', 'very-complex']).toContain(crossCuttingResult.level)
  })

  it('toucher plusieurs paquets/contrats obtient un score supérieur à une modification localisée comparable (mêmes spec/diff par ailleurs)', () => {
    const oneFile = ['apps/scoreo/src/ui/scoredetail/scoreDetailReducer.ts']
    const multiPackageFiles = [
      'apps/scoreo/src/ui/scoredetail/scoreDetailReducer.ts',
      'packages/module-tori-valley/src/domain/scoring.ts',
      'packages/module-mille-sabords/src/domain/rules.ts',
      'schemas/import/match.schema.json',
    ]

    const localized = buildCtx({
      number: 20,
      body: specBody({ files: oneFile }),
      changedFiles: oneFile,
      knownBlockers: [],
      diff: { changed_files: 1, additions: 20, deletions: 5 },
    })
    const multiPackage = buildCtx({
      number: 21,
      body: specBody({ files: multiPackageFiles }),
      changedFiles: multiPackageFiles,
      knownBlockers: [],
      diff: { changed_files: 4, additions: 20, deletions: 5 },
    })

    const localizedResult = assessComplexity(localized, { generatedAt: GENERATED_AT })
    const multiPackageResult = assessComplexity(multiPackage, { generatedAt: GENERATED_AT })

    expect(multiPackageResult.dimensions.dispersion.score).toBeGreaterThan(localizedResult.dimensions.dispersion.score)
    expect(multiPackageResult.score).toBeGreaterThan(localizedResult.score)
  })
})

describe('assessComplexity — signal indisponible', () => {
  it('marque changeVolume indisponible pour une issue (pas de diff) et baisse la confiance sans la mettre au minimum', () => {
    const ctx = buildCtx({
      entityType: 'issue',
      body: specBody({ files: ['apps/scoreo/src/ui/x.ts'] }),
      changedFiles: ['apps/scoreo/src/ui/x.ts'],
      knownBlockers: [],
    })
    const result = assessComplexity(ctx, { generatedAt: GENERATED_AT })

    expect(result.dimensions.changeVolume.available).toBe(false)
    expect(result.dimensions.changeVolume.score).toBe(0)
    expect(result.limits.some((l) => l.includes('changeVolume non disponible'))).toBe(true)
    expect(result.confidence).toBe('medium')
  })

  it('marque dispersion/fileVolume/validationLoad/crossCuttingSurfaces indisponibles quand aucun fichier n\'est fourni', () => {
    const body = [
      '## Contexte',
      '',
      'Un contexte qui ne liste de fichiers nulle part.',
      '',
      "## Critères d'acceptation",
      '',
      '- [ ] Un critère.',
      '',
      '## Hors scope',
      '',
      '- Rien.',
      '',
    ].join('\n')
    const ctx = buildCtx({ entityType: 'issue', body })
    const result = assessComplexity(ctx, { generatedAt: GENERATED_AT })

    for (const key of ['dispersion', 'fileVolume', 'validationLoad', 'crossCuttingSurfaces']) {
      expect(result.dimensions[key].available).toBe(false)
    }
  })
})

describe('assessComplexity — cas limites de spec incomplète', () => {
  it('une issue vide obtient une confiance minimale et un niveau jamais trivial', () => {
    const ctx = buildCtx({ entityType: 'issue', body: '' })
    const result = assessComplexity(ctx, { generatedAt: GENERATED_AT })

    expect(result.confidence).toBe('low')
    expect(result.level).not.toBe('trivial')
    expect(result.limits.some((l) => l.includes('plancher forcé'))).toBe(true)
  })

  it('une spec sans critère d\'acceptation obtient une confiance minimale et un niveau jamais trivial', () => {
    const body = [
      '## Contexte',
      '',
      'Un changement mineur.',
      '',
      '## Fichiers impactés',
      '',
      '- `apps/scoreo/src/ui/x.ts`',
      '',
      '## Hors scope',
      '',
      '- Rien.',
      '',
    ].join('\n')
    const ctx = buildCtx({
      body,
      changedFiles: ['apps/scoreo/src/ui/x.ts'],
      knownBlockers: [],
      diff: { changed_files: 1, additions: 5, deletions: 1 },
    })
    const result = assessComplexity(ctx, { generatedAt: GENERATED_AT })

    expect(result.confidence).toBe('low')
    expect(result.level).not.toBe('trivial')
  })

  it('une spec complète et déterminable obtient une confiance haute', () => {
    const ctx = buildCtx({
      body: specBody({ files: ['apps/scoreo/src/ui/x.ts'] }),
      changedFiles: ['apps/scoreo/src/ui/x.ts'],
      knownBlockers: [],
      diff: { changed_files: 1, additions: 10, deletions: 2 },
    })
    const result = assessComplexity(ctx, { generatedAt: GENERATED_AT })
    expect(result.confidence).toBe('high')
  })
})

describe('assessComplexity — override manuel', () => {
  it('un override visible ne détruit pas l\'évaluation heuristique d\'origine', () => {
    const bodyArgs = {
      body: specBody({ files: ['apps/scoreo/src/ui/x.ts'] }),
      changedFiles: ['apps/scoreo/src/ui/x.ts'],
      knownBlockers: [],
      diff: { changed_files: 1, additions: 10, deletions: 2 },
    }
    const heuristicOnly = assessComplexity(buildCtx({ ...bodyArgs, number: 30 }), { generatedAt: GENERATED_AT })
    const overridden = assessComplexity(
      buildCtx({ ...bodyArgs, number: 30, labels: ['complexity:very-complex'] }),
      { generatedAt: GENERATED_AT },
    )

    expect(overridden.level).toBe('very-complex')
    expect(overridden.provenance).toBe('manual')
    expect(overridden.override).toEqual({
      level: 'very-complex',
      heuristicLevel: heuristicOnly.level,
      source: 'label:complexity:very-complex',
    })
    // L'évaluation d'origine reste intégralement présente à côté de l'override.
    expect(overridden.score).toBe(heuristicOnly.score)
    expect(overridden.dimensions).toEqual(heuristicOnly.dimensions)
    expect(overridden.confidence).toBe(heuristicOnly.confidence)
  })

  it('ignore un override contradictoire (plusieurs labels complexity:* distincts) et le journalise', () => {
    const ctx = buildCtx({
      body: specBody({ files: ['apps/scoreo/src/ui/x.ts'] }),
      changedFiles: ['apps/scoreo/src/ui/x.ts'],
      knownBlockers: [],
      diff: { changed_files: 1, additions: 10, deletions: 2 },
      labels: ['complexity:trivial', 'complexity:complex'],
    })
    const result = assessComplexity(ctx, { generatedAt: GENERATED_AT })

    expect(result.override).toBeNull()
    expect(result.provenance).toBe('heuristic')
    expect(result.limits.some((l) => l.includes('override ignoré'))).toBe(true)
  })
})

describe('validateComplexityAssessment', () => {
  it('valide une évaluation bien formée', () => {
    const ctx = buildCtx({
      body: specBody({ files: ['apps/scoreo/src/ui/x.ts'] }),
      changedFiles: ['apps/scoreo/src/ui/x.ts'],
      knownBlockers: [],
      diff: { changed_files: 1, additions: 10, deletions: 2 },
    })
    const result = assessComplexity(ctx, { generatedAt: GENERATED_AT })
    expect(validateComplexityAssessment(result)).toEqual({ valid: true, errors: [] })
  })

  it('rejette une version incorrecte et un niveau invalide', () => {
    const { valid, errors } = validateComplexityAssessment({ version: 2, level: 'nope' })
    expect(valid).toBe(false)
    expect(errors.some((e) => e.includes('version'))).toBe(true)
    expect(errors.some((e) => e.includes('level'))).toBe(true)
  })

  it('rejette une racine non-objet', () => {
    expect(validateComplexityAssessment(null).valid).toBe(false)
  })
})

describe('entry-point guard', () => {
  it('ne déclenche pas main() à l\'import (aucune lecture/écriture de fichier, pas de code de sortie modifié)', async () => {
    const originalExitCode = process.exitCode
    await import('./complexity-assessment.mjs')
    expect(process.exitCode).toBe(originalExitCode)
  })
})
