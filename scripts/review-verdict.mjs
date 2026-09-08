// Règle d'arbitrage entre les deux relecteurs du coordinateur (fonctionnel et
// technique, issue #470) : pure, déterministe, jamais laissée au jugement du
// coordinateur (doc/automation/state-machine.md §8, doc/technical/
// automation-plan.md §4 « Le coordinateur »). Un désaccord entre les deux
// relecteurs (l'un passe, l'autre bloque) est toujours tranché par ce
// mécanisme, jamais par une décision de la session qui les a lancés.
//
// Chaque relecteur rend soit { status: 'ok', findings: [...] }, soit
// { status: 'missing' } quand il a échoué ou n'a rien renvoyé — un relecteur
// manquant interdit de calculer le verdict sur le seul relecteur restant, il
// escalade toujours vers `automation:needs-human` à la place.

const SEVERITY_RANK = { blocking: 3, important: 2, suggestion: 1, uncertain: 0 }

function moreSevere(a, b) {
  return (SEVERITY_RANK[a] ?? -1) >= (SEVERITY_RANK[b] ?? -1) ? a : b
}

function normalizeSummary(summary) {
  return summary.trim().toLowerCase().replace(/\s+/g, ' ')
}

// Un même défaut rendu par les deux relecteurs ne compte qu'une fois — pour
// le journal (une seule ligne) et pour l'arbitrage (une seule sévérité). La
// clé de déduplication est le résumé normalisé : les relecteurs n'ont
// aucun autre identifiant commun à leur disposition (#470, cas limite « les
// deux rendent le même finding »).
export function dedupeFindings(findings) {
  const byKey = new Map()
  for (const finding of findings) {
    const key = normalizeSummary(finding.summary)
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { ...finding, reviewers: [...finding.reviewers] })
      continue
    }
    existing.severity = moreSevere(existing.severity, finding.severity)
    for (const reviewer of finding.reviewers) {
      if (!existing.reviewers.includes(reviewer)) existing.reviewers.push(reviewer)
    }
  }
  return [...byKey.values()]
}

function attribute(role, side) {
  return (side.findings ?? []).map((finding) => ({ ...finding, reviewers: [role] }))
}

/**
 * @param {{
 *   functional: { status: 'ok', findings: Array<{ summary: string, severity: 'blocking'|'important'|'suggestion'|'uncertain', corpus?: 'in'|'out' }> } | { status: 'missing' },
 *   technical: { status: 'ok', findings: Array<{ summary: string, severity: 'blocking'|'important'|'suggestion'|'uncertain', corpus?: 'in'|'out' }> } | { status: 'missing' },
 * }} input
 */
export function computeReviewVerdict({ functional, technical }) {
  const missingReviewers = []
  if (functional.status !== 'ok') missingReviewers.push('functional')
  if (technical.status !== 'ok') missingReviewers.push('technical')
  if (missingReviewers.length > 0) {
    return { verdict: 'needs-human', reason: 'missing-reviewer', missingReviewers }
  }

  const allFindings = [...attribute('functional', functional), ...attribute('technical', technical)]
  const inCorpus = allFindings.filter((f) => f.corpus !== 'out')
  const outOfCorpus = allFindings.filter((f) => f.corpus === 'out')

  const findings = dedupeFindings(inCorpus)
  const outOfCorpusFindings = dedupeFindings(outOfCorpus)

  const hasBlockingOrImportant = findings.some((f) => f.severity === 'blocking' || f.severity === 'important')

  return {
    verdict: hasBlockingOrImportant ? 'needs-fix' : 'review-pass',
    findings,
    outOfCorpusFindings,
  }
}
