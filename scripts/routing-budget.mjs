#!/usr/bin/env node
// Plafonds de consommation d'automatisation (issue #478, tranche 3/6 de #407).
// Une fois le routage appliqué (#476), un run peut consommer davantage
// qu'aujourd'hui — plus de sous-agents, des modèles plus coûteux sur les
// bandes hautes. Ce module ne décide jamais de basculer vers un modèle
// moins cher au dépassement (ça dégraderait la qualité sans que personne ne
// le sache) : un dépassement n'a qu'une seule issue, un arrêt visible et
// journalisé (`.claude/skills/coordinator/SKILL.md` § Budgets). Fonctions
// pures, zéro effet de bord, zéro appel réseau — même précédent que
// `scripts/routing-activation.mjs`/`scripts/model-router.mjs`.
//
// `budgets.<routine>` (`.automation/routing-policy.yml#budgets`) utilise les
// noms de routine de **dispatch** (`.automation/routines.yml` — `coordinator`,
// `pr-review`, `address-feedback`), jamais l'espace de noms de
// `routing-policy.yml#routines`/`#activation` (`implement-task`, `pr-review`,
// `classification`, `address-feedback` — les politiques de routage par
// sous-agent). Les deux se recoupent par coïncidence sur `pr-review` et
// `address-feedback`, jamais par construction : un budget ne référence
// jamais `routing-policy.yml#routines`, donc jamais revalidé contre lui.
const ROUTING_POLICY_PATH = '.automation/routing-policy.yml'

const PER_RUN_FIELDS = { subagents_launched: 'subagentsLaunched', fix_iterations: 'fixIterations' }
const PER_PERIOD_FIELDS = { runs_per_day: 'runsPerDay' }
const KNOWN_BUCKETS = ['per_run', 'per_period']

// scope (camelCase, ce que checkBudget reçoit) -> { bucket, snake } pour
// retrouver le plafond déclaré et nommer la clé fautive dans le message.
const SCOPES = {
  subagentsLaunched: { bucket: 'perRun', snakeBucket: 'per_run', snakeKey: 'subagents_launched' },
  fixIterations: { bucket: 'perRun', snakeBucket: 'per_run', snakeKey: 'fix_iterations' },
  runsPerDay: { bucket: 'perPeriod', snakeBucket: 'per_period', snakeKey: 'runs_per_day' },
}

function validateBucket(bucket, knownFields, path) {
  if (typeof bucket !== 'object' || bucket === null || Array.isArray(bucket)) {
    throw new Error(`${ROUTING_POLICY_PATH}: ${path}: doit être un objet`)
  }
  const normalized = {}
  for (const [key, value] of Object.entries(bucket)) {
    const camel = knownFields[key]
    if (!camel) {
      throw new Error(`${ROUTING_POLICY_PATH}: ${path}: champ inconnu "${key}"`)
    }
    // Refuse un plafond nul, négatif ou non numérique — jamais résolu
    // implicitement (issue #478, critère d'acceptation « refusé au
    // démarrage »). `Number.isInteger` rejette au passage tout ce que
    // `parseRoutinesYaml` (scripts/automation-dispatch.mjs) n'a pas su
    // convertir en nombre (une chaîne, un booléen).
    if (!Number.isInteger(value) || value < 1) {
      throw new Error(`${ROUTING_POLICY_PATH}: ${path}.${key}: doit être un entier positif (valeur: ${JSON.stringify(value)})`)
    }
    normalized[camel] = value
  }
  return normalized
}

// Charge et valide `policy.budgets` (`.automation/routing-policy.yml` déjà
// chargé, même convention que `scripts/routing-activation.mjs#resolveActivation`
// qui reçoit la politique entière plutôt qu'un chemin de fichier). Section
// absente -> `{}`, jamais une erreur en soi : un budget non déclaré est
// non contraignant (voir `checkBudget` ci-dessous), pas un défaut de
// configuration.
export function loadBudgets(policy) {
  const budgets = policy?.budgets
  if (budgets === undefined) return {}
  if (typeof budgets !== 'object' || budgets === null || Array.isArray(budgets)) {
    throw new Error(`${ROUTING_POLICY_PATH}: budgets: doit être un objet`)
  }

  const result = {}
  for (const [routine, declared] of Object.entries(budgets)) {
    const routinePath = `budgets.${routine}`
    if (!declared || typeof declared !== 'object' || Array.isArray(declared)) {
      throw new Error(`${ROUTING_POLICY_PATH}: ${routinePath}: doit être un objet`)
    }
    for (const key of Object.keys(declared)) {
      if (!KNOWN_BUCKETS.includes(key)) {
        throw new Error(`${ROUTING_POLICY_PATH}: ${routinePath}: champ inconnu "${key}"`)
      }
    }

    const normalized = {}
    if (declared.per_run !== undefined) {
      normalized.perRun = validateBucket(declared.per_run, PER_RUN_FIELDS, `${routinePath}.per_run`)
    }
    if (declared.per_period !== undefined) {
      normalized.perPeriod = validateBucket(declared.per_period, PER_PERIOD_FIELDS, `${routinePath}.per_period`)
    }
    result[routine] = normalized
  }
  return result
}

// Décide si `routine` reste sous son plafond `scope` — un plafond par run
// (`subagentsLaunched`, `fixIterations`) ou de période glissante
// (`runsPerDay`), évalués indépendamment (issue #478, critère d'acceptation
// « Portées »), un appel par scope. `budgets` est le résultat déjà validé de
// `loadBudgets`, `counters` porte au moins la clé nommée par `scope` (les
// autres, le cas échéant, sont ignorées).
//
// Renvoie toujours `{ status: 'ok' | 'exceeded', limit, observed, reason,
// limits }` — `reason` nomme toujours le plafond évalué, franchi ou non ;
// `limits` (tableau, vide au cas nominal) porte une entrée quand ce plafond
// n'a pas pu être évalué comme contraignant (non déclaré, ou compteur
// indisponible) — jamais un plafond deviné dans un cas comme dans l'autre.
export function checkBudget(budgets, counters, { routine, scope }) {
  if (!routine || typeof routine !== 'string') {
    throw new Error('routing-budget: "routine" est requis')
  }
  const scopeInfo = SCOPES[scope]
  if (!scopeInfo) {
    throw new Error(`routing-budget: scope inconnu "${scope}" — doit être ${Object.keys(SCOPES).join(', ')}`)
  }
  const { bucket, snakeBucket, snakeKey } = scopeInfo
  const path = `budgets.${routine}.${snakeBucket}.${snakeKey}`

  const limit = budgets?.[routine]?.[bucket]?.[scope]
  if (limit === undefined) {
    const reason = `${path}: aucun plafond déclaré — non contraignant`
    return { status: 'ok', limit: null, observed: counters?.[scope] ?? null, reason, limits: [reason] }
  }

  const observed = counters?.[scope]
  if (observed === undefined || observed === null) {
    const reason = `${path}: compteur indisponible — plafond non évalué`
    return { status: 'ok', limit, observed: null, reason, limits: [reason] }
  }

  // Borne inclusive : à égalité, c'est `ok` (issue #478, critère
  // d'acceptation « Plafond franchi exactement à l'égalité »).
  if (observed > limit) {
    return {
      status: 'exceeded',
      limit,
      observed,
      reason: `${path}: plafond dépassé (observé ${observed} > plafond ${limit})`,
      limits: [],
    }
  }

  return {
    status: 'ok',
    limit,
    observed,
    reason: `${path}: sous le plafond (observé ${observed} <= plafond ${limit})`,
    limits: [],
  }
}
