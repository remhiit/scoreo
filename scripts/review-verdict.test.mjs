import { describe, expect, it } from 'vitest'
import { computeReviewVerdict, dedupeFindings } from './review-verdict.mjs'

const ok = (findings = []) => ({ status: 'ok', findings })
const missing = { status: 'missing' }

describe('computeReviewVerdict — les quatre combinaisons de sévérité (#470)', () => {
  it('aucun finding des deux côtés → review-pass', () => {
    const result = computeReviewVerdict({ functional: ok(), technical: ok() })
    expect(result).toEqual({ verdict: 'review-pass', findings: [], outOfCorpusFindings: [] })
  })

  it('fonctionnel bloquant, technique vide → needs-fix', () => {
    const result = computeReviewVerdict({
      functional: ok([{ summary: 'Critère non satisfait', severity: 'blocking' }]),
      technical: ok(),
    })
    expect(result.verdict).toBe('needs-fix')
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].reviewers).toEqual(['functional'])
  })

  it('fonctionnel vide, technique bloquant → needs-fix', () => {
    const result = computeReviewVerdict({
      functional: ok(),
      technical: ok([{ summary: 'Reducer appelle un repository', severity: 'blocking' }]),
    })
    expect(result.verdict).toBe('needs-fix')
    expect(result.findings[0].reviewers).toEqual(['technical'])
  })

  it('les deux bloquants → needs-fix', () => {
    const result = computeReviewVerdict({
      functional: ok([{ summary: 'Critère non satisfait', severity: 'blocking' }]),
      technical: ok([{ summary: 'Reducer appelle un repository', severity: 'blocking' }]),
    })
    expect(result.verdict).toBe('needs-fix')
    expect(result.findings).toHaveLength(2)
  })
})

describe('computeReviewVerdict — cas limites (#470)', () => {
  it('déduplique un finding identique rendu par les deux relecteurs, compté une seule fois', () => {
    const result = computeReviewVerdict({
      functional: ok([{ summary: 'Champ `handicap` sans .default() zod', severity: 'blocking' }]),
      technical: ok([{ summary: 'Champ `handicap` sans .default() zod', severity: 'blocking' }]),
    })
    expect(result.verdict).toBe('needs-fix')
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].reviewers.sort()).toEqual(['functional', 'technical'])
  })

  it('un finding hors corpus n’entre jamais dans l’arbitrage, même bloquant', () => {
    const result = computeReviewVerdict({
      functional: ok(),
      technical: ok([{ summary: 'La spec ne demande pas ce champ', severity: 'blocking', corpus: 'out' }]),
    })
    expect(result.verdict).toBe('review-pass')
    expect(result.findings).toEqual([])
    expect(result.outOfCorpusFindings).toHaveLength(1)
    expect(result.outOfCorpusFindings[0].severity).toBe('blocking')
  })

  it('un relecteur manquant escalade au lieu de conclure sur le seul relecteur restant', () => {
    const result = computeReviewVerdict({ functional: missing, technical: ok() })
    expect(result).toEqual({ verdict: 'needs-human', reason: 'missing-reviewer', missingReviewers: ['functional'] })
  })

  it('un relecteur manquant escalade même si l’autre a trouvé un blocage', () => {
    const result = computeReviewVerdict({
      functional: ok([{ summary: 'Critère non satisfait', severity: 'blocking' }]),
      technical: missing,
    })
    expect(result.verdict).toBe('needs-human')
    expect(result.missingReviewers).toEqual(['technical'])
  })

  it('les deux relecteurs manquants nomment les deux dans l’escalade', () => {
    const result = computeReviewVerdict({ functional: missing, technical: missing })
    expect(result.missingReviewers).toEqual(['functional', 'technical'])
  })

  it('des suggestions/uncertain seuls ne déclenchent pas needs-fix', () => {
    const result = computeReviewVerdict({
      functional: ok([{ summary: 'Nom de variable améliorable', severity: 'suggestion' }]),
      technical: ok([{ summary: 'Ambigu sans plus de contexte', severity: 'uncertain' }]),
    })
    expect(result.verdict).toBe('review-pass')
    expect(result.findings).toHaveLength(2)
  })
})

describe('dedupeFindings', () => {
  it('fusionne les reviewers et garde la sévérité la plus grave sur un résumé identique (insensible à la casse/aux espaces)', () => {
    const result = dedupeFindings([
      { summary: '  Champ sans default  ', severity: 'important', reviewers: ['functional'] },
      { summary: 'champ SANS default', severity: 'blocking', reviewers: ['technical'] },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].severity).toBe('blocking')
    expect(result[0].reviewers.sort()).toEqual(['functional', 'technical'])
  })

  it('laisse des résumés distincts intacts', () => {
    const result = dedupeFindings([
      { summary: 'A', severity: 'blocking', reviewers: ['functional'] },
      { summary: 'B', severity: 'important', reviewers: ['technical'] },
    ])
    expect(result).toHaveLength(2)
  })
})
