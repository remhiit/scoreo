#!/usr/bin/env node
// Chaîne, en observation seulement, les briques de routage déjà livrées
// (issue #406, spec révisée après l'arbitrage de #423 — doc/technical/
// automation-plan.md § « Routage par sous-agent ») : TaskContext (#401) →
// ComplexityAssessment (#402) → fallback LLM (#403) → RoutingDecision
// (#404). Deux fonctions pures, zéro effet de bord, zéro appel réseau —
// exactement comme les modules qu'elles composent. Le seul appelant prévu
// est le skill du coordinateur (.claude/skills/coordinator/SKILL.md), qui
// journalise la décision calculée ici sans jamais lancer de sous-agent sur
// le modèle proposé tant que `.automation/routing-policy.yml` porte
// `dry_run: true` (le cas par défaut, y compris quand le drapeau est
// simplement absent — voir `applied` ci-dessous).
import { DEFAULT_THRESHOLDS, assessComplexity } from './complexity-assessment.mjs'
import { consolidateComplexity, shouldRunLlmFallback, validateLlmComplexityResponse } from './complexity-llm.mjs'
import { routeModel } from './model-router.mjs'

export const ROUTING_DRY_RUN_VERSION = 1

const RISK_SECTION_PATTERN = /(?:^|\n)##\s*Cat[ée]gorie de risque\b([\s\S]*?)(?=\n##\s|$)/i
const RISK_LABELS = { Faible: 'low', Élevé: 'high' }

// Lit la section `## Catégorie de risque` du corps d'une issue (même format
// que celui produit par `issue-to-spec/SKILL.md` : `**Faible**` ou
// `**Élevé**` en tête de section, suivi d'une justification en prose) et la
// distille en `{ level, source }`. Section absente, vide, ou portant un
// libellé qui n'est ni « Faible » ni « Élevé » → `null`, jamais un niveau
// deviné — un appelant ne doit jamais traiter `null` comme "low" par défaut.
export function extractRiskLevel(issueBody) {
  const text = (issueBody ?? '').replace(/```[\s\S]*?```/g, '')
  const match = text.match(RISK_SECTION_PATTERN)
  if (!match) return null

  const section = match[1].trim()
  if (!section) return null

  const labelMatch = section.match(/^\*\*([^*]+)\*\*/)
  if (!labelMatch) return null

  const label = labelMatch[1].trim()
  const level = RISK_LABELS[label]
  if (!level) return null

  return { level, source: `## Catégorie de risque: **${label}**` }
}

// Enchaîne assessComplexity (#402) → shouldRunLlmFallback/consolidateComplexity
// (#403, uniquement quand `llmResponse` est fourni) → routeModel (#404), et
// renvoie une décision annotée `applied: false` tant que la politique de
// routage porte `dry_run: true` (le cas par défaut, y compris drapeau
// absent). Ne lance jamais elle-même de sous-agent classifieur ni de
// sous-agent d'implémentation — c'est au seul appelant (le skill du
// coordinateur) de fournir `llmResponse` s'il a déjà obtenu une réponse du
// classifieur, jamais à cette fonction d'en solliciter une.
export function resolveRoutingDryRun({
  taskContext,
  issueBody,
  labels = [],
  routines,
  routingPolicy,
  modelCatalog,
  llmResponse = null,
  thresholds = DEFAULT_THRESHOLDS,
  generatedAt = new Date().toISOString(),
}) {
  const missing = []
  if (!taskContext) missing.push('taskContext')

  const risk = extractRiskLevel(issueBody)
  if (!risk) missing.push('riskLevel')

  // Entrée amont manquante : aucune décision calculée, routeModel n'est
  // jamais appelé — jamais un niveau ou un modèle deviné pour combler le
  // trou (issue #406, critère d'acceptation « entrée amont manquante »).
  if (missing.length > 0) {
    return { complexity: null, routing: null, applied: false, escalation: null, missing, limits: [] }
  }

  const limits = []
  const heuristic = assessComplexity(taskContext, { thresholds, generatedAt })
  let complexity = heuristic

  if (shouldRunLlmFallback(heuristic, labels)) {
    if (!llmResponse) {
      limits.push(
        'fallback LLM signalé nécessaire (shouldRunLlmFallback) mais aucune réponse de classifieur fournie à ce run — complexité heuristique conservée',
      )
    } else {
      const { valid, errors } = validateLlmComplexityResponse(llmResponse)
      if (valid) {
        complexity = consolidateComplexity(heuristic, llmResponse)
      } else {
        limits.push(
          `réponse du classifieur invalide (${errors.join(' ; ')}) — heuristique conservée, provenance "heuristic"`,
        )
      }
    }
  }

  // Aucune traduction en décision partielle : une routineDefinition absente,
  // une version de catalogue/politique inattendue, une politique ou une
  // bande manquante font toutes échouer routeModel avec son propre message
  // explicite, qui remonte tel quel à l'appelant (issue #406, critère
  // d'acceptation « configuration invalide ») — jamais intercepté ici.
  const routineDefinition = routines?.routines?.[taskContext.routine]
  const routing = routeModel({
    taskContext,
    routineName: taskContext.routine,
    routineDefinition,
    complexityAssessment: complexity,
    riskAssessment: { level: risk.level },
    modelCatalog,
    routingPolicy,
    generatedAt,
  })

  let dryRun = routingPolicy?.dry_run
  if (dryRun === undefined) {
    limits.push('routing-policy.yml: drapeau "dry_run" absent — traité comme true (mode le plus prudent)')
    dryRun = true
  }

  // Jamais un modèle par défaut ni une bande de repli : l'absence de
  // candidat éligible se traduit toujours par la même escalade que le reste
  // du pipeline (issue #406, critère d'acceptation « aucun candidat »).
  const escalation = routing.status === 'no-candidate' ? 'automation:needs-human' : null

  return { complexity, routing, applied: dryRun !== true, escalation, missing: [], limits }
}
