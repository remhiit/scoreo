#!/usr/bin/env node
// ModelRouter (issue #404, doc/automation/model-routing.md § Algorithme du
// routeur) : sélectionne, de façon explicable et reproductible, le meilleur
// modèle de sous-agent pour une routine à partir de son TaskContext (#401),
// de son ComplexityAssessment (#402), du RiskAssessment produit par
// change-risk (#387, support uniquement — voir §RiskAssessment ci-dessous)
// et de la définition de routine + du contrat catalogue/politique (#400,
// #423). Fonction pure : mêmes entrées → même décision, zéro appel réseau,
// zéro branchement spécifique à un fournisseur (le code ne lit jamais
// `provider === 'anthropic'`, seulement les champs génériques du catalogue).
//
// Principe directeur non négociable (issue #404) : les contraintes de risque
// et de complexité sont des FILTRES DURS, appliqués avant tout calcul de
// score — jamais un critère parmi d'autres qu'un score élevé pourrait
// compenser. Un modèle sous le seuil de risque ou de complexité requis
// n'entre jamais dans le calcul pondéré, quelle que soit sa qualité ou son
// coût.
import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { loadConfigFile } from './automation-dispatch.mjs'

export const MODEL_ROUTER_VERSION = 1
export const EXPECTED_MODEL_CATALOG_VERSION = 1
export const EXPECTED_ROUTING_POLICY_VERSION = 1

const RISK_LEVELS = ['low', 'medium', 'high']
const COMPLEXITY_BANDS = ['trivial', 'standard', 'complex', 'very-complex']
const COST_TIERS = ['low', 'medium', 'high']
const LATENCY_TIERS = ['fast', 'medium', 'slow']
const CAPABILITY_FIELDS = ['tools', 'structured_output', 'long_context']

const COST_SCORE = { low: 1, medium: 0.5, high: 0 }
const LATENCY_SCORE = { fast: 1, medium: 0.5, slow: 0 }

// Poids par défaut du score pondéré (somme = 100), documentés dans
// doc/automation/model-routing.md § Score pondéré. `policyPreference` et
// `historicalPerformance` sont neutralisés (retirés puis le reste
// renormalisé) pour un candidat qui n'en porte pas — voir computeWeightedScore.
export const DEFAULT_SCORE_WEIGHTS = Object.freeze({
  policyPreference: 30,
  quality: 25,
  contextFit: 15,
  cost: 10,
  latency: 10,
  providerAvailability: 5,
  historicalPerformance: 5,
})

function riskIndex(level) {
  return RISK_LEVELS.indexOf(level)
}

function complexityIndex(level) {
  return COMPLEXITY_BANDS.indexOf(level)
}

// Cas limite « confiance basse » (issue #404, § Comportements d'erreur) :
// une ComplexityAssessment peu fiable ne doit jamais mener à sous-router —
// la bande effective est majorée d'un cran (jamais au-delà de very-complex),
// au bénéfice de la prudence plutôt que du coût.
export function bumpBandForLowConfidence(band) {
  const idx = complexityIndex(band)
  return COMPLEXITY_BANDS[Math.min(idx + 1, COMPLEXITY_BANDS.length - 1)]
}

// Résout le risk_override applicable (routing-policy.schema.json#risk_overrides) :
// « atteint le niveau donné » se lit comme un plancher, pas une égalité stricte
// — le niveau retenu est le plus sévère des paliers déclarés dont le seuil est
// couvert par le risque réel, pour rester correct même si un futur catalogue
// ajoute un override `medium` en plus de `high`.
export function resolveRiskOverride(policy, riskLevel) {
  const overrides = policy?.risk_overrides
  if (!overrides) return null
  let best = null
  for (const [level, override] of Object.entries(overrides)) {
    if (!RISK_LEVELS.includes(level)) continue
    if (riskIndex(riskLevel) >= riskIndex(level) && (!best || riskIndex(level) > riskIndex(best.level))) {
      best = { level, model: override.model }
    }
  }
  return best
}

// Filtre dur unique, appliqué identiquement à tout candidat quelle que soit
// son origine (override manuel, override de risque, candidat de bande,
// fallback de bande, fallback de catalogue) — c'est ce qui garantit qu'« un
// fallback conserve les mêmes contraintes de sécurité que le choix initial »
// (issue #404, critère d'acceptation) : il n'existe qu'un seul chemin de
// filtrage dans ce module, jamais une variante allégée pour les fallbacks.
export function evaluateCandidate({
  modelId,
  catalog,
  requiredCapabilities,
  band,
  minScore,
  riskLevel,
  constraints,
  providerStatus,
  excludedModelIds,
}) {
  const model = catalog?.models?.[modelId]
  if (!model) {
    return { eligible: false, reasons: [`modèle "${modelId}" absent du catalogue`], model: null }
  }

  const reasons = []

  if (excludedModelIds?.includes(modelId)) {
    reasons.push('exclu explicitement par l\'appelant pour ce run (ex: échec transitoire déjà tenté)')
  }
  if (model.enabled !== true) {
    reasons.push('modèle désactivé dans le catalogue')
  }
  for (const cap of CAPABILITY_FIELDS) {
    if (requiredCapabilities?.[cap] === true && model.capabilities?.[cap] !== true) {
      reasons.push(`capacité requise non couverte : ${cap}`)
    }
  }
  if (complexityIndex(model.max_complexity) < complexityIndex(band)) {
    reasons.push(`max_complexity du modèle (${model.max_complexity}) sous la bande cible (${band})`)
  }
  if (riskIndex(model.max_risk) < riskIndex(riskLevel)) {
    reasons.push(`max_risk du modèle (${model.max_risk}) sous le niveau de risque requis (${riskLevel})`)
  }
  if (typeof minScore === 'number' && model.quality_score < minScore) {
    reasons.push(`quality_score du modèle (${model.quality_score}) sous le min_score requis (${minScore})`)
  }
  if (constraints?.allowedProviders && !constraints.allowedProviders.includes(model.provider)) {
    reasons.push(`fournisseur "${model.provider}" non autorisé par les contraintes de la routine`)
  }
  if (constraints?.deniedProviders?.includes(model.provider)) {
    reasons.push(`fournisseur "${model.provider}" explicitement exclu par les contraintes de la routine`)
  }
  if (constraints?.maxCostTier && COST_TIERS.indexOf(model.cost_tier) > COST_TIERS.indexOf(constraints.maxCostTier)) {
    reasons.push(`cost_tier du modèle (${model.cost_tier}) dépasse le budget maximal autorisé (${constraints.maxCostTier})`)
  }
  if (
    constraints?.maxLatencyTier &&
    LATENCY_TIERS.indexOf(model.latency_tier) > LATENCY_TIERS.indexOf(constraints.maxLatencyTier)
  ) {
    reasons.push(`latency_tier du modèle (${model.latency_tier}) dépasse la latence maximale autorisée (${constraints.maxLatencyTier})`)
  }
  const status = providerStatus?.[model.provider]
  if (status?.available === false) {
    reasons.push(`fournisseur "${model.provider}" signalé indisponible pour ce run${status.reason ? ` (${status.reason})` : ''}`)
  }

  return { eligible: reasons.length === 0, reasons, model }
}

// Score pondéré 0-1 d'un candidat déjà jugé éligible. Une dimension non
// applicable à ce candidat (pas de poids de politique pour un fallback, pas
// de métrique historique connue pour ce modèle) est retirée puis le reste
// des poids est renormalisé à 100 — jamais traitée comme une valeur nulle,
// qui pénaliserait injustement un candidat pour une donnée simplement
// absente (issue #404, cas limite « métriques historiques absentes »).
export function computeWeightedScore(dimensions, weights = DEFAULT_SCORE_WEIGHTS) {
  const applicable = Object.entries(weights).filter(([key]) => dimensions[key] !== null && dimensions[key] !== undefined)
  const totalWeight = applicable.reduce((sum, [, weight]) => sum + weight, 0)
  if (totalWeight === 0) return { score: 0, breakdown: {} }

  const breakdown = {}
  let score = 0
  for (const [key, weight] of applicable) {
    const normalizedWeight = weight / totalWeight
    const value = dimensions[key]
    breakdown[key] = { value, weight, normalizedWeight: Math.round(normalizedWeight * 10000) / 10000 }
    score += normalizedWeight * value
  }
  return { score: Math.round(score * 10000) / 10000, breakdown }
}

function scoreEligibleCandidate({ modelId, model, band, policyWeight, historicalMetrics, providerStatus, weights }) {
  const historical = historicalMetrics?.[modelId]
  const dimensions = {
    quality: model.quality_score / 100,
    contextFit:
      1 - Math.abs(complexityIndex(model.max_complexity) - complexityIndex(band)) / (COMPLEXITY_BANDS.length - 1),
    cost: COST_SCORE[model.cost_tier],
    latency: LATENCY_SCORE[model.latency_tier],
    providerAvailability: providerStatus?.[model.provider]?.uptime ?? 1,
    policyPreference: typeof policyWeight === 'number' ? policyWeight / 100 : null,
    historicalPerformance: typeof historical?.successRate === 'number' ? historical.successRate : null,
  }
  const { score, breakdown } = computeWeightedScore(dimensions, weights)
  return { score, breakdown, historicalMetricsAvailable: dimensions.historicalPerformance !== null }
}

// Départage déterministe (issue #404, cas limite « égalité de score ») :
// score le plus élevé d'abord, puis quality_score de catalogue, puis ordre
// alphabétique de l'identifiant — jamais un ordre d'objet non spécifié.
function compareRankedCandidates(a, b) {
  if (b.score !== a.score) return b.score - a.score
  if (b.model.quality_score !== a.model.quality_score) return b.model.quality_score - a.model.quality_score
  return a.modelId < b.modelId ? -1 : a.modelId > b.modelId ? 1 : 0
}

function toResultModel(modelId, model, origin) {
  return { id: modelId, provider: model.provider, model: model.model, agentAlias: model.agent_alias ?? null, origin }
}

// Chaîne de fallback de catalogue (model-catalog.yml#fallback) à partir d'un
// point de départ donné, en s'arrêtant sur un modèle déjà visité (le
// catalogue est validé acyclique à la config, cette garde est une défense en
// profondeur côté routeur).
function catalogFallbackChain(catalog, startModelId, visited) {
  const chain = []
  let current = startModelId
  while (current && catalog.models?.[current] && !visited.has(current)) {
    chain.push(current)
    visited.add(current)
    current = catalog.models[current].fallback
  }
  return chain
}

// Construit, dans l'ordre de précédence, la séquence complète des candidats
// à évaluer pour ce run : override manuel, override de risque, candidats de
// bande (classés par score une fois éligibles), fallback de bande, puis
// chaîne de fallback de catalogue à partir de ce fallback. Chaque identifiant
// n'apparaît qu'une fois (dédoublonné par ordre de précédence).
function buildEvaluationSequence({ manualOverride, riskOverride, bandPolicy, catalog }) {
  const sequence = []
  const seen = new Set()

  function push(modelId, origin, policyWeight = null) {
    if (seen.has(modelId)) return
    seen.add(modelId)
    sequence.push({ modelId, origin, policyWeight })
  }

  if (manualOverride?.modelId) push(manualOverride.modelId, 'manual_override')
  if (riskOverride?.model) push(riskOverride.model, 'risk_override')

  const bandCandidateIds = Object.entries(bandPolicy?.candidates ?? {}).map(([, candidate]) => candidate)
  for (const candidate of bandCandidateIds) {
    push(candidate.model, 'band', candidate.weight)
  }

  if (bandPolicy?.fallback) {
    for (const modelId of catalogFallbackChain(catalog, bandPolicy.fallback, new Set())) {
      push(modelId, modelId === bandPolicy.fallback ? 'band_fallback' : 'catalog_fallback')
    }
  }

  return sequence
}

const REQUIRED_TOP_FIELDS = [
  'version',
  'routine',
  'entity',
  'input',
  'status',
  'selectedModel',
  'fallbacks',
  'candidates',
  'rulesApplied',
  'limits',
  'generatedAt',
]

// Miroir à la main du contrat schemas/automation/routing-decision.schema.json
// — même précédent que complexity-assessment.mjs#validateComplexityAssessment.
export function validateRoutingDecision(decision) {
  const errors = []
  if (!decision || typeof decision !== 'object') {
    return { valid: false, errors: ['routing-decision: la racine doit être un objet'] }
  }
  for (const field of REQUIRED_TOP_FIELDS) {
    if (decision[field] === undefined) {
      errors.push(`routing-decision.${field}: champ requis manquant`)
    }
  }
  if (decision.version !== MODEL_ROUTER_VERSION) {
    errors.push(`routing-decision.version: doit être ${MODEL_ROUTER_VERSION} (valeur: ${JSON.stringify(decision.version)})`)
  }
  if (!['selected', 'no-candidate'].includes(decision.status)) {
    errors.push(`routing-decision.status: doit être "selected" ou "no-candidate" (valeur: ${JSON.stringify(decision.status)})`)
  }
  if (decision.status === 'selected' && !decision.selectedModel) {
    errors.push('routing-decision.selectedModel: requis quand status="selected"')
  }
  if (decision.status === 'no-candidate' && decision.selectedModel !== null) {
    errors.push('routing-decision.selectedModel: doit être null quand status="no-candidate"')
  }
  for (const candidate of decision.candidates ?? []) {
    if (!candidate.eligible && (!candidate.exclusionReasons || candidate.exclusionReasons.length === 0)) {
      errors.push(`routing-decision.candidates: le candidat "${candidate.id}" est inéligible sans raison d'exclusion`)
    }
  }
  return { valid: errors.length === 0, errors }
}

// Fonction pure principale : mêmes entrées (y compris les versions de
// config) → même décision. `taskContext` est optionnel et sert uniquement à
// tracer l'entité d'origine dans la décision — aucune branche de filtrage ou
// de score n'en dépend (le TaskContext a déjà été distillé en
// ComplexityAssessment/RiskAssessment en amont).
export function routeModel({
  taskContext = null,
  routineName,
  routineDefinition,
  complexityAssessment,
  riskAssessment,
  modelCatalog,
  routingPolicy,
  manualOverride = null,
  constraints = null,
  providerStatus = {},
  historicalMetrics = {},
  excludedModelIds = [],
  weights = DEFAULT_SCORE_WEIGHTS,
  generatedAt = new Date().toISOString(),
}) {
  if (!routineName || typeof routineName !== 'string') {
    throw new Error('model-router: "routineName" est requis')
  }
  if (!routineDefinition || typeof routineDefinition !== 'object' || !routineDefinition.routing_policy) {
    throw new Error(`model-router: routineDefinition invalide ou sans "routing_policy" pour la routine "${routineName}"`)
  }
  if (!modelCatalog || typeof modelCatalog !== 'object') {
    throw new Error('model-router: "modelCatalog" est requis')
  }
  if (modelCatalog.version !== EXPECTED_MODEL_CATALOG_VERSION) {
    throw new Error(
      `model-router: version de catalogue inattendue (lue: ${JSON.stringify(modelCatalog.version)}, attendue: ${EXPECTED_MODEL_CATALOG_VERSION})`,
    )
  }
  if (!routingPolicy || typeof routingPolicy !== 'object') {
    throw new Error('model-router: "routingPolicy" est requis')
  }
  if (routingPolicy.version !== EXPECTED_ROUTING_POLICY_VERSION) {
    throw new Error(
      `model-router: version de politique inattendue (lue: ${JSON.stringify(routingPolicy.version)}, attendue: ${EXPECTED_ROUTING_POLICY_VERSION})`,
    )
  }
  const policy = routingPolicy.routines?.[routineDefinition.routing_policy]
  if (!policy) {
    throw new Error(
      `model-router: aucune politique nommée "${routineDefinition.routing_policy}" dans routingPolicy pour la routine "${routineName}"`,
    )
  }
  if (!complexityAssessment?.level || !COMPLEXITY_BANDS.includes(complexityAssessment.level)) {
    throw new Error('model-router: "complexityAssessment.level" est requis et doit être une bande valide')
  }
  if (!riskAssessment?.level || !RISK_LEVELS.includes(riskAssessment.level)) {
    throw new Error('model-router: "riskAssessment.level" est requis et doit être low/medium/high')
  }

  const rulesApplied = []
  const limits = []

  // Les contraintes de risque et de complexité sont résolues AVANT tout
  // calcul de score (issue #404, critère d'acceptation) : la bande effective
  // (avec majoration éventuelle) et le risk_override sont figés ici, une
  // fois pour toutes, puis appliqués identiquement à chaque candidat par
  // evaluateCandidate — jamais recalculés en aval selon un score.
  let effectiveBand = complexityAssessment.level
  if (complexityAssessment.confidence === 'low') {
    const bumped = bumpBandForLowConfidence(effectiveBand)
    if (bumped !== effectiveBand) {
      rulesApplied.push(`confiance basse sur la complexité → bande majorée de "${effectiveBand}" à "${bumped}" (prudence)`)
      effectiveBand = bumped
    }
  }

  const riskLevel = riskAssessment.level
  const riskOverride = resolveRiskOverride(policy, riskLevel)
  if (riskOverride) {
    rulesApplied.push(`risk_override "${riskOverride.level}" applicable (risque="${riskLevel}") → candidat forcé "${riskOverride.model}"`)
  }

  const bandPolicy = policy.bands?.[effectiveBand]
  if (!bandPolicy) {
    throw new Error(`model-router: aucune bande "${effectiveBand}" dans la politique de la routine "${routineName}"`)
  }

  if (manualOverride?.modelId) {
    rulesApplied.push(`override manuel demandé : "${manualOverride.modelId}"${manualOverride.source ? ` (source: ${manualOverride.source})` : ''}`)
  }

  const sequence = buildEvaluationSequence({ manualOverride, riskOverride, bandPolicy, catalog: modelCatalog })

  const evaluated = sequence.map(({ modelId, origin, policyWeight }) => {
    const { eligible, reasons, model } = evaluateCandidate({
      modelId,
      catalog: modelCatalog,
      requiredCapabilities: policy.required_capabilities,
      band: effectiveBand,
      minScore: bandPolicy.min_score,
      riskLevel,
      constraints,
      providerStatus,
      excludedModelIds,
    })

    if (!eligible) {
      return { modelId, origin, policyWeight, eligible: false, reasons, model, score: null, breakdown: null }
    }

    const { score, breakdown, historicalMetricsAvailable } = scoreEligibleCandidate({
      modelId,
      model,
      band: effectiveBand,
      policyWeight,
      historicalMetrics,
      providerStatus,
      weights,
    })
    if (!historicalMetricsAvailable && !limits.includes('métriques historiques absentes pour au moins un candidat — poids neutralisé, jamais traité comme un score nul')) {
      limits.push('métriques historiques absentes pour au moins un candidat — poids neutralisé, jamais traité comme un score nul')
    }
    return { modelId, origin, policyWeight, eligible: true, reasons, model, score, breakdown }
  })

  // Seuls les candidats de bande sont mis en compétition par score — override
  // manuel et override de risque gagnent par construction s'ils sont
  // éligibles (ils ne sont jamais comparés à d'autres candidats), fallback de
  // bande et de catalogue restent des paliers de dernier recours essayés dans
  // l'ordre déclaré. Les candidats de bande éligibles sont réordonnés par
  // score ; les autres tronçons gardent leur ordre de construction.
  const bandStartIndex = evaluated.findIndex((c) => c.origin === 'band')
  const bandEndIndex = (() => {
    const idx = evaluated.findIndex((c, i) => i > bandStartIndex && c.origin !== 'band')
    return idx === -1 ? evaluated.length : idx
  })()
  if (bandStartIndex !== -1) {
    const bandSlice = evaluated.slice(bandStartIndex, bandEndIndex)
    const eligibleBand = bandSlice.filter((c) => c.eligible).sort(compareRankedCandidates)
    const ineligibleBand = bandSlice.filter((c) => !c.eligible)
    evaluated.splice(bandStartIndex, bandSlice.length, ...eligibleBand, ...ineligibleBand)
  }

  const eligibleInOrder = evaluated.filter((c) => c.eligible)
  const selected = eligibleInOrder[0] ?? null
  const fallbackCandidates = eligibleInOrder.slice(1)

  if (selected) {
    rulesApplied.push(`candidat retenu : "${selected.modelId}" (origine: ${selected.origin})`)
  } else {
    rulesApplied.push('aucun candidat éligible sur toute la chaîne (bande, fallback de bande, fallback de catalogue) → no-candidate')
  }

  const candidates = evaluated.map((c) => ({
    id: c.modelId,
    origin: c.origin,
    eligible: c.eligible,
    exclusionReasons: c.eligible ? [] : c.reasons,
    score: c.eligible ? c.score : null,
    scoreBreakdown: c.eligible ? c.breakdown : null,
  }))

  return {
    version: MODEL_ROUTER_VERSION,
    routine: routineName,
    entity:
      taskContext?.entity?.type && typeof taskContext.entity.number === 'number'
        ? { type: taskContext.entity.type, number: taskContext.entity.number }
        : null,
    input: {
      complexity: {
        level: complexityAssessment.level,
        effectiveLevel: effectiveBand,
        confidence: complexityAssessment.confidence,
      },
      risk: { level: riskLevel },
      catalogVersion: modelCatalog.version,
      policyVersion: routingPolicy.version,
    },
    status: selected ? 'selected' : 'no-candidate',
    selectedModel: selected ? toResultModel(selected.modelId, selected.model, selected.origin) : null,
    fallbacks: fallbackCandidates.map((c) => toResultModel(c.modelId, c.model, c.origin)),
    candidates,
    rulesApplied,
    limits,
    generatedAt,
  }
}

async function main() {
  const routineName = process.env.MODEL_ROUTER_ROUTINE
  const routinesPath = process.env.CONFIG_PATH ?? '.automation/routines.yml'
  const catalogPath = process.env.MODEL_CATALOG_PATH ?? '.automation/model-catalog.yml'
  const policyPath = process.env.ROUTING_POLICY_PATH ?? '.automation/routing-policy.yml'
  const contextPath = process.env.MODEL_ROUTER_CONTEXT_PATH ?? 'task-context.json'
  const complexityPath = process.env.MODEL_ROUTER_COMPLEXITY_PATH ?? 'complexity-assessment.json'
  const riskLevel = process.env.MODEL_ROUTER_RISK_LEVEL
  const outputPath = process.env.MODEL_ROUTER_OUTPUT_PATH ?? 'routing-decision.json'

  if (!routineName || !riskLevel) {
    console.error('::error::model-router: MODEL_ROUTER_ROUTINE et MODEL_ROUTER_RISK_LEVEL sont requis')
    process.exitCode = 1
    return
  }

  const routinesResult = loadConfigFile(routinesPath)
  const catalogResult = loadConfigFile(catalogPath)
  const policyResult = loadConfigFile(policyPath)
  const configErrors = [...routinesResult.errors, ...catalogResult.errors, ...policyResult.errors]
  if (configErrors.length > 0) {
    for (const error of configErrors) console.error(`::error::${error}`)
    process.exitCode = 1
    return
  }

  let taskContext
  let complexityAssessment
  try {
    taskContext = JSON.parse(readFileSync(contextPath, 'utf8'))
    complexityAssessment = JSON.parse(readFileSync(complexityPath, 'utf8'))
  } catch (err) {
    console.error(`::error::model-router: ${err.message}`)
    process.exitCode = 1
    return
  }

  const routineDefinition = routinesResult.config.routines?.[routineName]
  if (!routineDefinition) {
    console.error(`::error::model-router: routine "${routineName}" absente de ${routinesPath}`)
    process.exitCode = 1
    return
  }

  let decision
  try {
    decision = routeModel({
      taskContext,
      routineName,
      routineDefinition,
      complexityAssessment,
      riskAssessment: { level: riskLevel },
      modelCatalog: catalogResult.config,
      routingPolicy: policyResult.config,
    })
  } catch (err) {
    console.error(`::error::model-router: ${err.message}`)
    process.exitCode = 1
    return
  }

  const { valid, errors } = validateRoutingDecision(decision)
  if (!valid) {
    for (const error of errors) console.error(`::error::${error}`)
    process.exitCode = 1
    return
  }

  writeFileSync(outputPath, JSON.stringify(decision, null, 2))
  console.log(
    `model-router: écrit dans ${outputPath} (statut=${decision.status}, modèle=${decision.selectedModel?.id ?? 'aucun'})`,
  )
}

// Même garde que task-context.mjs/complexity-assessment.mjs : n'exécute
// main() que si ce fichier est le point d'entrée, pas quand pnpm test
// l'importe.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
