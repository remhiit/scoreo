#!/usr/bin/env node
// Fallback LLM de complexité, en second recours contrôlé derrière l'heuristique
// déterministe (#402, scripts/complexity-assessment.mjs) — issue #403, spec
// révisée après l'arbitrage de #423 (option C, doc/technical/automation-plan.md
// § « Routage par sous-agent ») : ce n'est pas une Action appelant une API de
// fournisseur, mais un sous-agent classifieur (.claude/agents/complexity-classifier.md)
// lancé par le futur skill coordinateur (#430) — câblage hors scope ici (ce
// fichier fournit les règles et le contrat que ce câblage consomme).
//
// Trois fonctions pures, zéro effet de bord, zéro réseau : les règles
// d'activation (shouldRunLlmFallback), la validation stricte de la réponse
// du classifieur (validateLlmComplexityResponse) et la consolidation avec le
// ComplexityAssessment heuristique (consolidateComplexity) — plus un
// résolveur du modèle de sous-agent déclaré (resolveClassifierModel), utilisé
// pour garder le frontmatter `model:` de complexity-classifier.md aligné avec
// .automation/routing-policy.yml (#400) sans jamais y relire un choix
// implicite.
import { pathToFileURL } from 'node:url'
import { loadRoutingPolicy, loadModelCatalog } from './automation-dispatch.mjs'

export const COMPLEXITY_LLM_VERSION = 1

// Version du prompt versionné de .claude/agents/complexity-classifier.md —
// incrémentée à chaque changement de formulation du prompt, jamais du
// contrat de sortie (qui vit dans complexity-llm-response.schema.json).
// Reportée telle quelle dans ComplexityAssessment.limits par
// consolidateComplexity, et dans le journal idempotent (scripts/automation-log.mjs)
// via cette même ligne — jamais recalculée depuis la réponse elle-même : un
// classifieur qui rapporterait une version différente de celle-ci serait un
// signal d'incohérence à traiter en amont (câblage #430, hors scope ici).
export const CLASSIFIER_PROMPT_VERSION = 1

const LEVELS = ['trivial', 'standard', 'complex', 'very-complex']
const CONFIDENCES = ['high', 'medium', 'low']
const CONFIDENCE_RANK = { low: 1, medium: 2, high: 3 }

function lowerConfidence(a, b) {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b
}

// Trois cas d'activation, et un seul cas d'inhibition absolue (issue #403,
// critères d'acceptation) : un `override` non nul (label `complexity:<niveau>`
// posé par un humain, #402) signifie qu'un humain a déjà tranché — le
// fallback ne tourne jamais dans ce cas, quel que soit le reste. `labels` est
// `TaskContext.entity.labels` (#401), passé séparément plutôt qu'attendu sur
// `assessment` : ComplexityAssessment ne porte pas les labels bruts de
// l'entité (schemas/automation/complexity-assessment.schema.json), seulement
// ce qu'il en a déjà extrait (`override`).
export function shouldRunLlmFallback(assessment, labels = []) {
  if (assessment?.override) return false
  if (assessment?.confidence === 'low') return true
  const unavailableCount = Object.values(assessment?.dimensions ?? {}).filter((dimension) => dimension.available === false).length
  if (unavailableCount >= 2) return true
  if ((labels ?? []).includes('complexity:llm')) return true
  return false
}

const REQUIRED_LLM_RESPONSE_FIELDS = ['level', 'confidence', 'reasons', 'uncertainties', 'promptVersion']

// Miroir à la main du contrat schemas/automation/complexity-llm-response.schema.json
// — même précédent que scripts/complexity-assessment.mjs#validateComplexityAssessment
// et scripts/task-context.mjs#validateTaskContext. Une réponse non conforme
// n'est jamais consommée par consolidateComplexity : c'est à l'appelant de
// vérifier `valid` avant d'y toucher (même cas que la réponse absente ou le
// classifieur indisponible — l'heuristique fait foi, voir doc/technical/automation-plan.md).
export function validateLlmComplexityResponse(response) {
  const errors = []
  if (!response || typeof response !== 'object') {
    return { valid: false, errors: ['complexity-llm-response: la racine doit être un objet'] }
  }

  for (const field of REQUIRED_LLM_RESPONSE_FIELDS) {
    if (response[field] === undefined) {
      errors.push(`complexity-llm-response.${field}: champ requis manquant`)
    }
  }
  if (response.level !== undefined && !LEVELS.includes(response.level)) {
    errors.push(`complexity-llm-response.level: doit être l'un de ${LEVELS.join('/')} (valeur: ${JSON.stringify(response.level)})`)
  }
  if (response.confidence !== undefined && !CONFIDENCES.includes(response.confidence)) {
    errors.push(`complexity-llm-response.confidence: doit être ${CONFIDENCES.join('/')} (valeur: ${JSON.stringify(response.confidence)})`)
  }
  if (
    response.reasons !== undefined &&
    (!Array.isArray(response.reasons) || response.reasons.length === 0 || !response.reasons.every((reason) => typeof reason === 'string'))
  ) {
    errors.push('complexity-llm-response.reasons: doit être un tableau non vide de chaînes')
  }
  if (
    response.uncertainties !== undefined &&
    (!Array.isArray(response.uncertainties) || !response.uncertainties.every((item) => typeof item === 'string'))
  ) {
    errors.push('complexity-llm-response.uncertainties: doit être un tableau de chaînes (vide accepté)')
  }
  if (response.promptVersion !== undefined && (!Number.isInteger(response.promptVersion) || response.promptVersion < 1)) {
    errors.push('complexity-llm-response.promptVersion: doit être un entier >= 1')
  }

  return { valid: errors.length === 0, errors }
}

// Consolide un ComplexityAssessment heuristique (#402) déjà validé avec une
// ComplexityLlmResponse déjà validée (précondition : l'appelant a vérifié
// shouldRunLlmFallback puis validateLlmComplexityResponse — cette fonction ne
// revalide ni ne re-décide l'activation, elle applique uniquement les règles
// de fusion). Seuls `level`/`provenance`/`confidence`/`limits` peuvent
// bouger : `score`/`dimensions`/`reasons`/`override`/`thresholds`/`generatedAt`
// restent tels quels, comme pour un override manuel (issue #403, critère
// d'acceptation « conforme au contrat existant »).
export function consolidateComplexity(heuristic, llm) {
  const heuristicIndex = LEVELS.indexOf(heuristic.level)
  const llmIndex = LEVELS.indexOf(llm.level)
  const gap = Math.abs(llmIndex - heuristicIndex)

  const limits = [...heuristic.limits]
  let level = heuristic.level
  let provenance = 'heuristic'
  let confidence = lowerConfidence(heuristic.confidence, llm.confidence)

  if (gap === 0) {
    limits.push(
      `fallback LLM (version de prompt ${llm.promptVersion}) : accord avec l'heuristique sur "${heuristic.level}" → niveau inchangé, provenance "heuristic", confiance consolidée "${confidence}"`,
    )
  } else if (gap === 1) {
    level = llm.level
    provenance = 'llm'
    limits.push(
      `fallback LLM (version de prompt ${llm.promptVersion}) : écart d'une bande (heuristique "${heuristic.level}", LLM "${llm.level}") → niveau retenu "${level}", provenance "llm", confiance consolidée "${confidence}"`,
    )
  } else {
    confidence = 'low'
    limits.push(
      `fallback LLM (version de prompt ${llm.promptVersion}) : désaccord franc de ${gap} bande(s) (heuristique "${heuristic.level}", LLM "${llm.level}") → confiance forcée à "low", niveau heuristique conservé ("${level}"), escalade vers automation:needs-human requise plutôt qu'une décision de modèle silencieuse`,
    )
  }

  return {
    ...heuristic,
    level,
    provenance,
    confidence,
    limits,
  }
}

// Résout le modèle de sous-agent déclaré pour la classification par
// .automation/routing-policy.yml (#400) / .automation/model-catalog.yml —
// utilisé pour garder le frontmatter `model:` de
// .claude/agents/complexity-classifier.md aligné avec la politique, sans
// jamais relire un choix implicite. Cas limite explicitement spécifié
// (issue #403, « Comportements d'erreur et cas limites ») : une politique de
// routage ne nommant aucun modèle de classification est un refus explicite
// nommant le fichier et la clé manquante, jamais un repli implicite sur le
// modèle du coordinateur.
export function resolveClassifierModel(routingPolicy, modelCatalog) {
  const policy = routingPolicy?.routines?.classification
  if (!policy) {
    throw new Error(
      'complexity-llm: .automation/routing-policy.yml ne nomme aucun modèle de classification (clé "routines.classification" manquante) — refus explicite, pas de repli implicite sur le modèle du coordinateur',
    )
  }

  // Un seul candidat, à poids 100, dans chaque bande : la classification
  // n'est jamais routée par bande de complexité (ce serait circulaire — le
  // classifieur existe précisément pour déterminer cette bande), elle utilise
  // toujours le même modèle, quelle que soit l'entrée choisie ici.
  const candidates = Object.values(policy.bands?.standard?.candidates ?? {})
  if (candidates.length !== 1) {
    throw new Error(
      'complexity-llm: la politique "classification" de .automation/routing-policy.yml doit déclarer exactement un candidat par bande (un seul modèle, jamais un choix pondéré ni une escalade par complexité pour le classifieur)',
    )
  }

  const modelId = candidates[0].model
  const model = modelCatalog?.models?.[modelId]
  if (!model?.agent_alias) {
    throw new Error(
      `complexity-llm: le modèle "${modelId}" référencé par routines.classification est absent de .automation/model-catalog.yml, ou sans "agent_alias" utilisable en frontmatter d'agent`,
    )
  }

  return { modelId, agentAlias: model.agent_alias }
}

// Chemin CLI/CI, symétrique à scripts/complexity-assessment.mjs#main : vérifie
// que la résolution du modèle de classification réussit, sans lancer aucun
// sous-agent (ce module reste zéro effet de bord — le seul I/O est ici, dans
// main(), jamais dans les fonctions exportées ci-dessus).
function main() {
  const routingPolicyPath = process.env.ROUTING_POLICY_PATH ?? '.automation/routing-policy.yml'
  const modelCatalogPath = process.env.MODEL_CATALOG_PATH ?? '.automation/model-catalog.yml'

  try {
    const routingPolicy = loadRoutingPolicy(routingPolicyPath)
    const modelCatalog = loadModelCatalog(modelCatalogPath)
    const { modelId, agentAlias } = resolveClassifierModel(routingPolicy, modelCatalog)
    console.log(`complexity-llm: modèle de classification résolu -> ${modelId} (agent_alias="${agentAlias}")`)
  } catch (err) {
    console.error(`::error::${err.message}`)
    process.exitCode = 1
  }
}

// Même garde que scripts/complexity-assessment.mjs/automation-log.mjs :
// n'exécute main() que si ce fichier est le point d'entrée, pas quand
// pnpm test l'importe.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
