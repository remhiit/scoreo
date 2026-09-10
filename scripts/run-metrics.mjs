// RunMetrics (issue #477, doc/technical/automation-plan.md § « Métriques ») :
// un enregistrement par run, à forme stable et versionnée
// (schemas/automation/run-metrics.schema.json), qui confronte la décision de
// routage déjà journalisée (#404/#406) à l'issue réelle du run — la donnée
// sans laquelle aucune activation (#476) ni aucun budget ne peut être
// calibré. Fonction pure, zéro effet de bord, zéro appel réseau — même
// précédent que scripts/review-verdict.mjs et scripts/routing-dry-run.mjs,
// dont ce module ne dépend d'ailleurs pas : il ne recalcule rien, il se
// contente d'assembler ce que l'appelant (le coordinateur, en fin de run)
// connaît déjà.
//
// Le coût n'est jamais collecté en unités monétaires : le mode sous-agent
// consomme un abonnement, pas une facturation au token (issue #473, même
// arbitrage déjà appliqué au champ `metrics` de scripts/automation-log.mjs).
// Seuls `durationSeconds` et les indicateurs `usage` déjà auto-déclarés par
// la session (compaction de contexte observée, limite d'usage approchée)
// en tiennent lieu — jamais un décompte de tokens, faute de signal fiable
// disponible aujourd'hui côté session.
//
// Hors scope (voir l'issue) : aucune agrégation, aucun rapport, aucune
// décision prise à partir de ces métriques — un seul enregistrement, publié
// tel quel dans le journal existant du coordinateur (scripts/automation-log.mjs).
import { redactSecrets } from './task-context.mjs'

export const RUN_METRICS_VERSION = 1

const COMPLEXITY_BANDS = ['trivial', 'standard', 'complex', 'very-complex']
const COMPLEXITY_PROVENANCES = ['heuristic', 'llm', 'manual']
const RISK_LEVELS = ['low', 'medium', 'high']
const ACTIVATION_MODES = ['observe', 'apply']
const OUTCOME_STATUSES = ['succeeded', 'failed']

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function durationInSeconds(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null
  const start = Date.parse(startedAt)
  const end = Date.parse(endedAt)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null
  return Math.round((end - start) / 1000)
}

// Assemble un RunMetrics à partir de ce qu'un run du coordinateur connaît en
// fin de course (§ "Routage" pour complexity/risk/configVersions, § "The
// review verdict is mechanical" pour findings, § "Converged"/"Escalade" pour
// outcome). `routine` et `outcome.status` sont structurellement requis — un
// enregistrement sans l'un des deux n'identifie ni le run ni son issue
// réelle, la même exigence que buildTaskContext pose sur `routine`/`runId`
// (scripts/task-context.mjs). Tout le reste peut manquer : chaque absence
// est nommée dans `missingFields` plutôt que devinée ou tue, et
// `complete` retombe à `false` en conséquence (issue #477, critère
// d'acceptation « run interrompu »).
export function buildRunMetrics({
  routine,
  entity = null,
  startedAt = null,
  endedAt = null,
  complexity = null,
  risk = null,
  routing = null,
  configVersions = {},
  outcome,
  findings = null,
  usage = null,
  generatedAt = new Date().toISOString(),
}) {
  if (!routine || typeof routine !== 'string') {
    throw new Error('run-metrics: "routine" est requis')
  }
  if (!outcome || typeof outcome !== 'object' || !outcome.status) {
    throw new Error('run-metrics: "outcome.status" est requis — ce record ne décrit qu\'un run arrivé à son terme')
  }

  const missingFields = []

  if (!entity) missingFields.push('entity')

  const durationSeconds = durationInSeconds(startedAt, endedAt)
  if (durationSeconds === null) missingFields.push('durationSeconds')

  if (!complexity) missingFields.push('complexity')
  if (!risk) missingFields.push('risk')

  let routingRecord = null
  if (!routing) {
    missingFields.push('routing')
  } else {
    // `status` (miroir de RoutingDecision.status, scripts/model-router.mjs) est
    // l'unique façon de distinguer un `proposedModel`/`actualModel` réellement
    // manquant d'un `null` légitime : `no-candidate` signifie qu'aucun modèle
    // n'a été routé faute de candidat éligible, pas que la collecte a échoué.
    // Un statut absent ou inconnu (`undefined`, valeur hors énumération) ne
    // vaut jamais `no-candidate` — la nullité reste alors traitée comme
    // manquante, le comportement d'origine.
    const isNoCandidate = routing.status === 'no-candidate'
    if (routing.proposedModel == null && !isNoCandidate) missingFields.push('routing.proposedModel')
    if (routing.actualModel == null && !isNoCandidate) missingFields.push('routing.actualModel')
    if (routing.activationMode == null) missingFields.push('routing.activationMode')
    routingRecord = {
      proposedModel: routing.proposedModel ?? null,
      actualModel: routing.actualModel ?? null,
      activationMode: routing.activationMode ?? null,
      fallbacks: routing.fallbacks ?? [],
    }
  }

  const resolvedConfigVersions = {
    taskContext: configVersions.taskContext ?? null,
    routingPolicy: configVersions.routingPolicy ?? null,
    modelCatalog: configVersions.modelCatalog ?? null,
  }
  if (resolvedConfigVersions.taskContext == null) missingFields.push('configVersions.taskContext')
  if (resolvedConfigVersions.routingPolicy == null) missingFields.push('configVersions.routingPolicy')
  if (resolvedConfigVersions.modelCatalog == null) missingFields.push('configVersions.modelCatalog')

  if (outcome.fixIterations == null) missingFields.push('outcome.fixIterations')
  if (outcome.ciGreenFirstPass == null) missingFields.push('outcome.ciGreenFirstPass')

  // Seul champ texte libre de l'enregistrement : peut citer une raison
  // d'escalade rédigée par un sous-agent, potentiellement collée depuis le
  // corps d'une issue/PR — jamais écrit tel quel (issue #477, critère
  // d'acceptation « aucun secret ni contenu d'issue »).
  const escalation = outcome.escalation != null ? redactSecrets(String(outcome.escalation)).text : null

  let findingsRecord = null
  if (!findings) {
    missingFields.push('findings')
  } else {
    if (findings.functional == null) missingFields.push('findings.functional')
    if (findings.technical == null) missingFields.push('findings.technical')
    findingsRecord = {
      functional: findings.functional ?? null,
      technical: findings.technical ?? null,
    }
  }

  let usageRecord = null
  if (!usage) {
    missingFields.push('usage')
  } else {
    if (usage.compactionObserved == null) missingFields.push('usage.compactionObserved')
    if (usage.usageLimitApproached == null) missingFields.push('usage.usageLimitApproached')
    usageRecord = {
      compactionObserved: usage.compactionObserved ?? null,
      usageLimitApproached: usage.usageLimitApproached ?? null,
    }
  }

  const metrics = {
    version: RUN_METRICS_VERSION,
    routine,
    entity: entity ? { type: entity.type, number: entity.number } : null,
    durationSeconds,
    complexity: complexity ? { band: complexity.band, provenance: complexity.provenance } : null,
    risk: risk ? { level: risk.level } : null,
    routing: routingRecord,
    configVersions: resolvedConfigVersions,
    outcome: {
      status: outcome.status,
      fixIterations: outcome.fixIterations ?? null,
      ciGreenFirstPass: outcome.ciGreenFirstPass ?? null,
      escalation,
    },
    findings: findingsRecord,
    usage: usageRecord,
    complete: missingFields.length === 0,
    missingFields,
    generatedAt,
  }

  // Toujours validé avant d'être renvoyé — une entrée qui ne respecte pas le
  // contrat (type erroné, valeur hors énumération...) est rejetée
  // explicitement plutôt que publiée partiellement (issue #477, critère
  // d'acceptation « entrée non conforme »). L'absence de données, elle,
  // n'est jamais un rejet : c'est `complete: false` + `missingFields`
  // ci-dessus, un cas distinct et toujours valide contre le schéma.
  const { valid, errors } = validateRunMetrics(metrics)
  if (!valid) {
    return { valid: false, errors, metrics: null }
  }
  return { valid: true, errors: [], metrics }
}

const REQUIRED_TOP_FIELDS = [
  'version',
  'routine',
  'entity',
  'durationSeconds',
  'complexity',
  'risk',
  'routing',
  'configVersions',
  'outcome',
  'findings',
  'usage',
  'complete',
  'missingFields',
  'generatedAt',
]

// Miroir à la main du contrat schemas/automation/run-metrics.schema.json —
// même précédent que scripts/model-router.mjs#validateRoutingDecision et
// scripts/task-context.mjs#validateTaskContext.
export function validateRunMetrics(record) {
  const errors = []
  if (!isPlainObject(record)) {
    return { valid: false, errors: ['run-metrics: la racine doit être un objet'] }
  }

  for (const field of REQUIRED_TOP_FIELDS) {
    if (record[field] === undefined) {
      errors.push(`run-metrics.${field}: champ requis manquant`)
    }
  }

  if (record.version !== RUN_METRICS_VERSION) {
    errors.push(`run-metrics.version: doit être ${RUN_METRICS_VERSION} (valeur: ${JSON.stringify(record.version)})`)
  }
  if (typeof record.routine !== 'string' || record.routine.length === 0) {
    errors.push('run-metrics.routine: doit être une chaîne non vide')
  }

  if (record.entity !== null && record.entity !== undefined) {
    if (!isPlainObject(record.entity) || !['issue', 'pull_request'].includes(record.entity.type) || typeof record.entity.number !== 'number') {
      errors.push('run-metrics.entity: doit être null ou { type: "issue"|"pull_request", number }')
    }
  }

  if (record.durationSeconds !== null && record.durationSeconds !== undefined) {
    if (!Number.isInteger(record.durationSeconds) || record.durationSeconds < 0) {
      errors.push('run-metrics.durationSeconds: doit être null ou un entier positif')
    }
  }

  if (record.complexity !== null && record.complexity !== undefined) {
    if (!isPlainObject(record.complexity) || !COMPLEXITY_BANDS.includes(record.complexity.band) || !COMPLEXITY_PROVENANCES.includes(record.complexity.provenance)) {
      errors.push('run-metrics.complexity: doit être null ou { band, provenance } avec des valeurs valides')
    }
  }

  if (record.risk !== null && record.risk !== undefined) {
    if (!isPlainObject(record.risk) || !RISK_LEVELS.includes(record.risk.level)) {
      errors.push('run-metrics.risk: doit être null ou { level } avec un niveau valide')
    }
  }

  if (record.routing !== null && record.routing !== undefined) {
    const routing = record.routing
    if (!isPlainObject(routing)) {
      errors.push('run-metrics.routing: doit être null ou un objet')
    } else {
      if (routing.proposedModel !== null && typeof routing.proposedModel !== 'string') {
        errors.push('run-metrics.routing.proposedModel: doit être null ou une chaîne')
      }
      if (routing.actualModel !== null && typeof routing.actualModel !== 'string') {
        errors.push('run-metrics.routing.actualModel: doit être null ou une chaîne')
      }
      if (routing.activationMode !== null && !ACTIVATION_MODES.includes(routing.activationMode)) {
        errors.push('run-metrics.routing.activationMode: doit être null, "observe" ou "apply"')
      }
      if (!Array.isArray(routing.fallbacks)) {
        errors.push('run-metrics.routing.fallbacks: doit être un tableau')
      }
    }
  }

  if (!isPlainObject(record.configVersions)) {
    errors.push('run-metrics.configVersions: doit être un objet')
  } else {
    for (const key of ['taskContext', 'routingPolicy', 'modelCatalog']) {
      const value = record.configVersions[key]
      if (value !== null && !Number.isInteger(value)) {
        errors.push(`run-metrics.configVersions.${key}: doit être null ou un entier`)
      }
    }
  }

  if (!isPlainObject(record.outcome)) {
    errors.push('run-metrics.outcome: doit être un objet')
  } else {
    if (!OUTCOME_STATUSES.includes(record.outcome.status)) {
      errors.push(`run-metrics.outcome.status: doit être "succeeded" ou "failed" (valeur: ${JSON.stringify(record.outcome.status)})`)
    }
    if (record.outcome.fixIterations !== null && (!Number.isInteger(record.outcome.fixIterations) || record.outcome.fixIterations < 0 || record.outcome.fixIterations > 3)) {
      errors.push('run-metrics.outcome.fixIterations: doit être null ou un entier entre 0 et 3')
    }
    if (record.outcome.ciGreenFirstPass !== null && typeof record.outcome.ciGreenFirstPass !== 'boolean') {
      errors.push('run-metrics.outcome.ciGreenFirstPass: doit être null ou un booléen')
    }
    if (record.outcome.escalation !== null && typeof record.outcome.escalation !== 'string') {
      errors.push('run-metrics.outcome.escalation: doit être null ou une chaîne')
    }
  }

  if (record.findings !== null && record.findings !== undefined) {
    if (!isPlainObject(record.findings)) {
      errors.push('run-metrics.findings: doit être null ou un objet')
    } else {
      for (const key of ['functional', 'technical']) {
        const value = record.findings[key]
        if (value !== null && (!Number.isInteger(value) || value < 0)) {
          errors.push(`run-metrics.findings.${key}: doit être null ou un entier positif`)
        }
      }
    }
  }

  if (record.usage !== null && record.usage !== undefined) {
    if (!isPlainObject(record.usage)) {
      errors.push('run-metrics.usage: doit être null ou un objet')
    } else {
      for (const key of ['compactionObserved', 'usageLimitApproached']) {
        const value = record.usage[key]
        if (value !== null && typeof value !== 'boolean') {
          errors.push(`run-metrics.usage.${key}: doit être null ou un booléen`)
        }
      }
    }
  }

  if (typeof record.complete !== 'boolean') {
    errors.push('run-metrics.complete: doit être un booléen')
  } else if (Array.isArray(record.missingFields) && record.complete !== (record.missingFields.length === 0)) {
    errors.push('run-metrics.complete: incohérent avec missingFields (doit être vrai seulement si missingFields est vide)')
  }

  if (!Array.isArray(record.missingFields)) {
    errors.push('run-metrics.missingFields: doit être un tableau')
  }

  if (typeof record.generatedAt !== 'string' || record.generatedAt.length === 0) {
    errors.push('run-metrics.generatedAt: doit être une chaîne non vide')
  }

  return { valid: errors.length === 0, errors }
}
