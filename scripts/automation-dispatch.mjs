#!/usr/bin/env node
// Dispatcher déclaratif label → routine → skill (issue #378). Charge et
// valide .automation/routines.yml contre le contrat documenté dans
// schemas/automation/routines.schema.json, puis — pour un événement GitHub
// `labeled` donné — résout quelle routine matche. Zéro LLM (principe
// directeur #2, doc/technical/automation-plan.md §2) : ce script ne fait que
// centraliser le mapping et l'exposer, il ne remplace pas les triggers des
// routines Claude Code elles-mêmes (§4).
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
// Réutilisé plutôt que reconstruit à la main (issue #478) : loadBudgets
// valide déjà toute la section `budgets` (plafond nul/négatif/non
// numérique, champ inconnu) avec le même message que le job CI doit
// remonter ici — dupliquer cette logique ferait diverger tôt ou tard les
// deux validations, contrairement aux constantes à quatre valeurs fixes
// (COMPLEXITY_BANDS ci-dessous) pour lesquelles ce fichier reste
// volontairement sans dépendance croisée.
import { loadBudgets } from './routing-budget.mjs'
// Source de vérité du contrat d'arbitrage (issue #497, tranche 1/5 de
// l'épic #496) : ARBITRABLE_MOTIFS n'est pas mirroré à la main comme
// COMPLEXITY_BANDS ci-dessous — contrairement à ce dernier, qui reflète un
// fichier de config externe (.automation/complexity-thresholds.yml),
// ARBITRABLE_MOTIFS est défini par scripts/arbitration.mjs lui-même ; le
// dupliquer ici ferait dériver les deux listes tôt ou tard, même
// raisonnement que l'import de loadBudgets ci-dessus.
import { ARBITRABLE_MOTIFS } from './arbitration.mjs'

// Sous-ensemble minimal de YAML (mappings imbriqués de scalaires, pas de
// listes ni de chaînes multi-lignes) suffisant pour .automation/routines.yml
// — le format reste volontairement plat, donc pas besoin d'une dépendance
// YAML pour scripts/ (convention du dossier, voir check-doc-links.mjs /
// check-design-tokens.mjs : zéro dépendance externe).
export function parseRoutinesYaml(text) {
  const root = {}
  const stack = [{ indent: -1, node: root }]

  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/\s+$/, '')
    if (!line.trim() || line.trim().startsWith('#')) continue

    const indent = line.length - line.trimStart().length
    const [keyPart, ...rest] = line.trim().split(':')
    const key = keyPart.trim()
    const rawValue = rest.join(':').trim()

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop()
    }
    const parent = stack[stack.length - 1].node

    if (rawValue === '') {
      const child = {}
      parent[key] = child
      stack.push({ indent, node: child })
    } else {
      parent[key] = parseScalar(rawValue)
    }
  }
  return root
}

function parseScalar(raw) {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?\d+$/.test(raw)) return Number(raw)
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1)
  }
  return raw
}

export function loadRoutinesConfig(path) {
  return parseRoutinesYaml(readFileSync(path, 'utf8'))
}

const VALID_ENTITIES = ['issue', 'pull_request']
const VALID_CONCURRENCY_KEYS = ['issue', 'pull-request']
const REQUIRED_ROUTINE_FIELDS = ['entity', 'trigger_label', 'skill', 'concurrency_key', 'routing_policy']
const OPTIONAL_ROUTINE_FIELDS = ['deduplicate_by', 'max_iterations']
const KNOWN_ROUTINE_FIELDS = [...REQUIRED_ROUTINE_FIELDS, ...OPTIONAL_ROUTINE_FIELDS]
const KNOWN_TOP_LEVEL_FIELDS = ['version', 'routines']

// Miroir à la main du contrat schemas/automation/routines.schema.json (même
// précédent que les schémas d'import : documentés en JSON Schema, validés en
// pratique par du code écrit à la main plutôt qu'un moteur JSON Schema
// générique — voir apps/scoreo/src/application/importMatchesUseCase.ts).
export function validateRoutinesConfig(config) {
  const errors = []

  if (config.version !== 1) {
    errors.push(`version: doit être 1 (valeur: ${JSON.stringify(config.version)})`)
  }
  for (const key of Object.keys(config)) {
    if (!KNOWN_TOP_LEVEL_FIELDS.includes(key)) {
      errors.push(`champ inconnu à la racine : "${key}"`)
    }
  }

  const routines = config.routines
  if (!routines || typeof routines !== 'object' || Object.keys(routines).length === 0) {
    errors.push('routines: doit être un objet non vide')
    return { valid: false, errors }
  }

  const seenTriggers = new Set()
  for (const [name, routine] of Object.entries(routines)) {
    if (!routine || typeof routine !== 'object') {
      errors.push(`routines.${name}: doit être un objet`)
      continue
    }

    for (const field of REQUIRED_ROUTINE_FIELDS) {
      if (routine[field] === undefined) {
        errors.push(`routines.${name}.${field}: champ requis manquant`)
      }
    }
    for (const key of Object.keys(routine)) {
      if (!KNOWN_ROUTINE_FIELDS.includes(key)) {
        errors.push(`routines.${name}: champ inconnu "${key}"`)
      }
    }
    if (routine.entity !== undefined && !VALID_ENTITIES.includes(routine.entity)) {
      errors.push(
        `routines.${name}.entity: doit être ${VALID_ENTITIES.join(' ou ')} (valeur: ${JSON.stringify(routine.entity)})`,
      )
    }
    if (routine.concurrency_key !== undefined && !VALID_CONCURRENCY_KEYS.includes(routine.concurrency_key)) {
      errors.push(
        `routines.${name}.concurrency_key: doit être ${VALID_CONCURRENCY_KEYS.join(' ou ')} (valeur: ${JSON.stringify(routine.concurrency_key)})`,
      )
    }
    if (routine.max_iterations !== undefined && (!Number.isInteger(routine.max_iterations) || routine.max_iterations < 1)) {
      errors.push(`routines.${name}.max_iterations: doit être un entier >= 1`)
    }

    if (routine.entity && routine.trigger_label) {
      const triggerKey = `${routine.entity}:${routine.trigger_label}`
      if (seenTriggers.has(triggerKey)) {
        errors.push(
          `routines.${name}: le label déclencheur "${routine.trigger_label}" sur "${routine.entity}" est déjà utilisé par une autre routine — un même événement labellisé matcherait plusieurs routines (voir doc/technical/automation-plan.md §4, incident #99)`,
        )
      }
      seenTriggers.add(triggerKey)
    }
  }

  return { valid: errors.length === 0, errors }
}

// Toute routine déclenchée par un label la retire et pose
// `automation:in-progress` en tout premier geste ("claim the run",
// automation-plan.md §4) — la cible est donc toujours la même, quelle que
// soit la routine.
export const CLAIM_LABEL = 'automation:in-progress'

export function resolveRoutine(config, { entity, label }) {
  const entry = Object.entries(config.routines).find(
    ([, routine]) => routine.entity === entity && routine.trigger_label === label,
  )
  if (!entry) return null
  const [name, routine] = entry
  return { name, skill: routine.skill, entity, triggerLabel: label, targetLabel: CLAIM_LABEL }
}

// --- Catalogue de modèles et politique de routage (issue #400, option C
// tranchée en #423) : le contrat consommé par le futur skill coordinateur
// (#430) pour choisir un modèle de sous-agent par routine × bande de
// complexité. Même sous-ensemble minimal de YAML, même parseur générique
// (parseRoutinesYaml ci-dessus), même précédent « validateur écrit à la
// main » que validateRoutinesConfig — voir schemas/automation/
// model-catalog.schema.json et schemas/automation/routing-policy.schema.json
// pour le contrat documenté.

export function loadModelCatalog(path) {
  return parseRoutinesYaml(readFileSync(path, 'utf8'))
}

export function loadRoutingPolicy(path) {
  return parseRoutinesYaml(readFileSync(path, 'utf8'))
}

// Chargement tolérant à un fichier absent (issue #400, cas limite « Fichier
// absent : la CI doit le dire explicitement, pas échouer sur une exception
// de parsing ») — utilisé par main() pour les trois fichiers .automation/.
export function loadConfigFile(path) {
  try {
    return { config: parseRoutinesYaml(readFileSync(path, 'utf8')), errors: [] }
  } catch (err) {
    const reason = err.code === 'ENOENT' ? 'fichier introuvable' : `erreur de lecture (${err.message})`
    return { config: null, errors: [`${path}: ${reason}`] }
  }
}

const RISK_LEVELS = ['low', 'medium', 'high']
const COMPLEXITY_BANDS = ['trivial', 'standard', 'complex', 'very-complex']
const COST_TIERS = ['low', 'medium', 'high']
const LATENCY_TIERS = ['fast', 'medium', 'slow']
const PROVIDER_PATTERN = /^[a-z][a-z0-9-]*$/
const CAPABILITY_FIELDS = ['tools', 'structured_output', 'long_context']
const REQUIRED_MODEL_FIELDS = [
  'provider',
  'model',
  'enabled',
  'capabilities',
  'quality_score',
  'cost_tier',
  'latency_tier',
  'max_risk',
  'max_complexity',
]
const OPTIONAL_MODEL_FIELDS = ['agent_alias', 'fallback']
const KNOWN_MODEL_FIELDS = [...REQUIRED_MODEL_FIELDS, ...OPTIONAL_MODEL_FIELDS]

function validateCapabilities(capabilities, path, errors) {
  if (!capabilities || typeof capabilities !== 'object') {
    errors.push(`${path}: doit être un objet`)
    return
  }
  for (const field of CAPABILITY_FIELDS) {
    if (typeof capabilities[field] !== 'boolean') {
      errors.push(`${path}.${field}: doit être un booléen`)
    }
  }
  for (const key of Object.keys(capabilities)) {
    if (!CAPABILITY_FIELDS.includes(key)) {
      errors.push(`${path}: champ inconnu "${key}"`)
    }
  }
}

// Miroir à la main de schemas/automation/model-catalog.schema.json (même
// précédent que validateRoutinesConfig/routines.schema.json).
export function validateModelCatalog(config) {
  const errors = []

  if (config.version !== 1) {
    errors.push(`version: doit être 1 (valeur: ${JSON.stringify(config.version)})`)
  }
  for (const key of Object.keys(config)) {
    if (key !== 'version' && key !== 'models') {
      errors.push(`champ inconnu à la racine : "${key}"`)
    }
  }

  const models = config.models
  if (!models || typeof models !== 'object' || Object.keys(models).length === 0) {
    errors.push('models: doit être un objet non vide')
    return { valid: false, errors }
  }

  for (const [id, model] of Object.entries(models)) {
    if (!model || typeof model !== 'object') {
      errors.push(`models.${id}: doit être un objet`)
      continue
    }

    for (const field of REQUIRED_MODEL_FIELDS) {
      if (model[field] === undefined) {
        errors.push(`models.${id}.${field}: champ requis manquant`)
      }
    }
    for (const key of Object.keys(model)) {
      if (!KNOWN_MODEL_FIELDS.includes(key)) {
        errors.push(`models.${id}: champ inconnu "${key}"`)
      }
    }
    if (model.provider !== undefined && !PROVIDER_PATTERN.test(model.provider)) {
      errors.push(`models.${id}.provider: doit être en kebab-case (valeur: ${JSON.stringify(model.provider)})`)
    }
    if (model.model !== undefined && (typeof model.model !== 'string' || model.model.length === 0)) {
      errors.push(`models.${id}.model: doit être une chaîne non vide`)
    }
    if (model.enabled !== undefined && typeof model.enabled !== 'boolean') {
      errors.push(`models.${id}.enabled: doit être un booléen`)
    }
    if (model.capabilities !== undefined) {
      validateCapabilities(model.capabilities, `models.${id}.capabilities`, errors)
    }
    if (
      model.quality_score !== undefined &&
      (!Number.isInteger(model.quality_score) || model.quality_score < 0 || model.quality_score > 100)
    ) {
      errors.push(`models.${id}.quality_score: doit être un entier entre 0 et 100`)
    }
    if (model.cost_tier !== undefined && !COST_TIERS.includes(model.cost_tier)) {
      errors.push(`models.${id}.cost_tier: doit être ${COST_TIERS.join(', ')} (valeur: ${JSON.stringify(model.cost_tier)})`)
    }
    if (model.latency_tier !== undefined && !LATENCY_TIERS.includes(model.latency_tier)) {
      errors.push(
        `models.${id}.latency_tier: doit être ${LATENCY_TIERS.join(', ')} (valeur: ${JSON.stringify(model.latency_tier)})`,
      )
    }
    if (model.max_risk !== undefined && !RISK_LEVELS.includes(model.max_risk)) {
      errors.push(`models.${id}.max_risk: doit être ${RISK_LEVELS.join(', ')} (valeur: ${JSON.stringify(model.max_risk)})`)
    }
    if (model.max_complexity !== undefined && !COMPLEXITY_BANDS.includes(model.max_complexity)) {
      errors.push(
        `models.${id}.max_complexity: doit être ${COMPLEXITY_BANDS.join(', ')} (valeur: ${JSON.stringify(model.max_complexity)})`,
      )
    }
  }

  // Un fallback doit référencer un autre modèle existant du même catalogue.
  for (const [id, model] of Object.entries(models)) {
    if (model && typeof model === 'object' && model.fallback !== undefined && !models[model.fallback]) {
      errors.push(`models.${id}.fallback: modèle "${model.fallback}" introuvable dans le catalogue`)
    }
  }

  const cycle = findFallbackCycle(models)
  if (cycle) {
    errors.push(`chaîne de fallback circulaire : ${cycle.join(' -> ')}`)
  }

  return { valid: errors.length === 0, errors }
}

// Parcourt le graphe models.*.fallback (arêtes uniquement vers un modèle
// existant — un fallback introuvable est déjà signalé séparément) et
// retourne le premier cycle rencontré, dans l'ordre de parcours, pour
// affichage (issue #400, cas limite « chaîne de fallback circulaire »).
function findFallbackCycle(models) {
  const settled = new Set()
  for (const start of Object.keys(models)) {
    if (settled.has(start)) continue
    const path = []
    const onPath = new Set()
    let current = start
    while (current && models[current] && typeof models[current] === 'object' && models[current].fallback) {
      const next = models[current].fallback
      if (!models[next]) break
      if (onPath.has(current)) {
        return path.slice(path.indexOf(current)).concat(current)
      }
      if (settled.has(current)) break
      onPath.add(current)
      path.push(current)
      current = next
    }
    for (const id of path) settled.add(id)
  }
  return null
}

const RISK_ORDER = { low: 0, medium: 1, high: 2 }
const KNOWN_ROUTINE_POLICY_FIELDS = ['required_capabilities', 'bands', 'risk_overrides']
const KNOWN_BAND_FIELDS = ['candidates', 'min_score', 'fallback']
const KNOWN_CANDIDATE_FIELDS = ['model', 'weight']
const REQUIRED_WEIGHT_TOTAL = 100
// Modes valides de la matrice d'activation (issue #476, tranche 1/6 de
// #407) — même paire que scripts/routing-activation.mjs#resolveActivation,
// dupliquée ici sans import croisé pour rester cohérente avec le reste de
// ce fichier (chaque module de scripts/ mirrore ses propres constantes,
// voir COMPLEXITY_BANDS ci-dessus).
const VALID_ACTIVATION_MODES = ['observe', 'apply']

// Miroir à la main de schemas/automation/routing-policy.schema.json. Prend
// le catalogue déjà validé pour croiser les candidats/fallbacks/overrides
// (modèle absent, désactivé, sous le score/risque requis, capacité non
// couverte — issue #400, § « Définir les règles de compatibilité »).
export function validateRoutingPolicy(policy, catalog) {
  const errors = []
  const models = catalog && typeof catalog === 'object' ? catalog.models ?? {} : {}

  if (policy.version !== 1) {
    errors.push(`version: doit être 1 (valeur: ${JSON.stringify(policy.version)})`)
  }
  for (const key of Object.keys(policy)) {
    if (
      key !== 'version' &&
      key !== 'routines' &&
      key !== 'activation' &&
      key !== 'rollback' &&
      key !== 'budgets' &&
      key !== 'arbitration'
    ) {
      errors.push(`champ inconnu à la racine : "${key}"`)
    }
  }

  // Plafonds de consommation (issue #478, tranche 3/6 de #407) : optionnels,
  // et sur un espace de noms de routine distinct de `routines`/`activation`
  // ci-dessous (voir le commentaire d'import de loadBudgets). loadBudgets
  // valide toute la section d'un coup et lève une erreur nommant le fichier
  // et la clé fautive au premier problème trouvé — capturée ici pour
  // rejoindre les autres erreurs de ce validateur plutôt que de faire
  // planter tout le job CI sur une exception non gérée.
  if (policy.budgets !== undefined) {
    try {
      loadBudgets(policy)
    } catch (err) {
      errors.push(err.message.replace(/^\.automation\/routing-policy\.yml: /, ''))
    }
  }

  // Interrupteur de rollback (issue #480, tranche 5/6 de #407) : optionnel,
  // absent valant `false` (cas nominal, aucune erreur). Une valeur non
  // booléenne est refusée ici, jamais interprétée comme `false` — même
  // défense en profondeur que scripts/routing-activation.mjs#resolveActivation,
  // qui revalide ce même champ à la résolution d'un triplet.
  if (policy.rollback !== undefined && typeof policy.rollback !== 'boolean') {
    errors.push(`rollback: doit être un booléen (valeur: ${JSON.stringify(policy.rollback)})`)
  }

  const routines = policy.routines
  if (!routines || typeof routines !== 'object' || Object.keys(routines).length === 0) {
    errors.push('routines: doit être un objet non vide')
    return { valid: false, errors }
  }

  // Optionnel (issue #476) : absente, traitée comme une matrice vide par
  // scripts/routing-activation.mjs#resolveActivation ("observe" partout),
  // jamais une erreur en soi — seul son contenu, quand elle est présente,
  // est validé ici. Les clés `activation.<routine>` réutilisent le même
  // espace de noms que `routines` ci-dessus (jamais celui de
  // .automation/routines.yml), donc validées contre ce même objet plutôt
  // que par un fichier externe supplémentaire.
  const activation = policy.activation
  if (activation !== undefined) {
    if (typeof activation !== 'object' || activation === null || Array.isArray(activation)) {
      errors.push('activation: doit être un objet')
    } else {
      for (const [routineName, bandsForRoutine] of Object.entries(activation)) {
        const activationPath = `activation.${routineName}`
        if (!routines[routineName]) {
          errors.push(`${activationPath}: routine inconnue — absente de "routines"`)
        }
        if (!bandsForRoutine || typeof bandsForRoutine !== 'object' || Array.isArray(bandsForRoutine)) {
          errors.push(`${activationPath}: doit être un objet`)
          continue
        }
        for (const [band, mode] of Object.entries(bandsForRoutine)) {
          const modePath = `${activationPath}.${band}`
          if (!COMPLEXITY_BANDS.includes(band)) {
            errors.push(`${modePath}: bande inconnue — absente de .automation/complexity-thresholds.yml`)
            continue
          }
          if (!VALID_ACTIVATION_MODES.includes(mode)) {
            errors.push(`${modePath}: mode inconnu (valeur: ${JSON.stringify(mode)}) — doit être "observe" ou "apply"`)
          }
        }
      }
    }
  }

  // Optionnel (issue #497) : absente, traitée comme une matrice vide par
  // scripts/arbitration.mjs#resolveArbitration ("observe" partout), même
  // traitement que `activation` absente ci-dessus. Espace de clés distinct
  // de `routines`/`activation` : les clés de `arbitration` sont des motifs
  // d'escalade arbitrables (ARBITRABLE_MOTIFS), jamais des noms de routine.
  const arbitration = policy.arbitration
  if (arbitration !== undefined) {
    if (typeof arbitration !== 'object' || arbitration === null || Array.isArray(arbitration)) {
      errors.push('arbitration: doit être un objet')
    } else {
      for (const [motif, mode] of Object.entries(arbitration)) {
        const motifPath = `arbitration.${motif}`
        if (!ARBITRABLE_MOTIFS.includes(motif)) {
          errors.push(`${motifPath}: motif absent de la liste des motifs arbitrables`)
          continue
        }
        if (!VALID_ACTIVATION_MODES.includes(mode)) {
          errors.push(`${motifPath}: mode inconnu (valeur: ${JSON.stringify(mode)}) — doit être "observe" ou "apply"`)
        }
      }
    }
  }

  for (const [name, routinePolicy] of Object.entries(routines)) {
    if (!routinePolicy || typeof routinePolicy !== 'object') {
      errors.push(`routines.${name}: doit être un objet`)
      continue
    }
    for (const key of Object.keys(routinePolicy)) {
      if (!KNOWN_ROUTINE_POLICY_FIELDS.includes(key)) {
        errors.push(`routines.${name}: champ inconnu "${key}"`)
      }
    }

    const requiredCapabilities = routinePolicy.required_capabilities
    validateCapabilities(requiredCapabilities, `routines.${name}.required_capabilities`, errors)

    const bands = routinePolicy.bands
    if (!bands || typeof bands !== 'object') {
      errors.push(`routines.${name}.bands: doit être un objet`)
      continue
    }
    for (const key of Object.keys(bands)) {
      if (!COMPLEXITY_BANDS.includes(key)) {
        errors.push(`routines.${name}.bands: bande inconnue "${key}"`)
      }
    }
    for (const band of COMPLEXITY_BANDS) {
      if (bands[band] === undefined) {
        errors.push(`routines.${name}.bands.${band}: bande manquante — chaque routine doit couvrir les quatre bandes de .automation/complexity-thresholds.yml`)
      }
    }

    for (const [band, bandPolicy] of Object.entries(bands)) {
      if (!COMPLEXITY_BANDS.includes(band)) continue
      const bandPath = `routines.${name}.bands.${band}`
      if (!bandPolicy || typeof bandPolicy !== 'object') {
        errors.push(`${bandPath}: doit être un objet`)
        continue
      }
      for (const key of Object.keys(bandPolicy)) {
        if (!KNOWN_BAND_FIELDS.includes(key)) {
          errors.push(`${bandPath}: champ inconnu "${key}"`)
        }
      }

      const minScore = bandPolicy.min_score
      if (!Number.isInteger(minScore) || minScore < 0 || minScore > 100) {
        errors.push(`${bandPath}.min_score: doit être un entier entre 0 et 100`)
      }

      const fallback = bandPolicy.fallback
      if (typeof fallback !== 'string' || fallback.length === 0) {
        errors.push(`${bandPath}.fallback: champ requis manquant`)
      } else if (!models[fallback]) {
        errors.push(`${bandPath}.fallback: modèle "${fallback}" absent du catalogue`)
      } else if (models[fallback].enabled !== true) {
        errors.push(`${bandPath}.fallback: modèle "${fallback}" désactivé dans le catalogue`)
      } else if (
        typeof minScore === 'number' &&
        typeof models[fallback].quality_score === 'number' &&
        models[fallback].quality_score < minScore
      ) {
        // Même filtre que le candidat primaire (voir plus bas) appliqué au
        // fallback : scripts/model-router.mjs#evaluateCandidate rejette un
        // fallback dont le quality_score est sous le min_score de la bande
        // exactement comme un candidat primaire (« un fallback conserve les
        // mêmes contraintes de sécurité que le choix initial », issue #404) —
        // un fallback qui ne le franchit pas ne serait donc jamais retenu,
        // ce qui a laissé passer #497/#503 jusqu'à la revue.
        errors.push(
          `${bandPath}.fallback: modèle "${fallback}" (quality_score=${models[fallback].quality_score}) sous le min_score de la bande (${minScore}) — ce fallback ne serait jamais retenu`,
        )
      }

      const candidates = bandPolicy.candidates
      if (!candidates || typeof candidates !== 'object' || Object.keys(candidates).length === 0) {
        errors.push(`${bandPath}.candidates: doit être un objet non vide`)
        continue
      }

      let weightTotal = 0
      for (const [candidateName, candidate] of Object.entries(candidates)) {
        const candidatePath = `${bandPath}.candidates.${candidateName}`
        if (!candidate || typeof candidate !== 'object') {
          errors.push(`${candidatePath}: doit être un objet`)
          continue
        }
        for (const key of Object.keys(candidate)) {
          if (!KNOWN_CANDIDATE_FIELDS.includes(key)) {
            errors.push(`${candidatePath}: champ inconnu "${key}"`)
          }
        }

        const modelId = candidate.model
        if (typeof modelId !== 'string' || modelId.length === 0) {
          errors.push(`${candidatePath}.model: champ requis manquant`)
        } else if (!models[modelId]) {
          errors.push(`${candidatePath}.model: candidat "${modelId}" absent du catalogue`)
        } else {
          const catalogModel = models[modelId]
          if (catalogModel.enabled !== true) {
            errors.push(`${candidatePath}.model: candidat "${modelId}" désactivé dans le catalogue`)
          }
          if (typeof minScore === 'number' && typeof catalogModel.quality_score === 'number' && catalogModel.quality_score < minScore) {
            errors.push(
              `${candidatePath}.model: candidat "${modelId}" (quality_score=${catalogModel.quality_score}) sous le min_score de la bande (${minScore})`,
            )
          }
          if (requiredCapabilities && typeof requiredCapabilities === 'object' && catalogModel.capabilities) {
            for (const field of CAPABILITY_FIELDS) {
              if (requiredCapabilities[field] === true && catalogModel.capabilities[field] !== true) {
                errors.push(`${candidatePath}.model: candidat "${modelId}" ne couvre pas la capacité requise "${field}"`)
              }
            }
          }
        }

        const weight = candidate.weight
        if (!Number.isInteger(weight) || weight < 1) {
          errors.push(`${candidatePath}.weight: doit être un entier positif`)
        } else {
          weightTotal += weight
        }
      }

      if (weightTotal !== REQUIRED_WEIGHT_TOTAL) {
        errors.push(`${bandPath}.candidates: la somme des poids doit être ${REQUIRED_WEIGHT_TOTAL} (valeur: ${weightTotal})`)
      }
    }

    const riskOverrides = routinePolicy.risk_overrides
    if (riskOverrides !== undefined) {
      if (typeof riskOverrides !== 'object' || riskOverrides === null) {
        errors.push(`routines.${name}.risk_overrides: doit être un objet`)
      } else {
        for (const key of Object.keys(riskOverrides)) {
          if (!RISK_LEVELS.includes(key)) {
            errors.push(`routines.${name}.risk_overrides: niveau de risque inconnu "${key}"`)
          }
        }
        for (const [riskLevel, override] of Object.entries(riskOverrides)) {
          if (!RISK_LEVELS.includes(riskLevel)) continue
          const overridePath = `routines.${name}.risk_overrides.${riskLevel}`
          if (!override || typeof override !== 'object') {
            errors.push(`${overridePath}: doit être un objet`)
            continue
          }
          for (const key of Object.keys(override)) {
            if (key !== 'model') {
              errors.push(`${overridePath}: champ inconnu "${key}"`)
            }
          }
          const modelId = override.model
          if (typeof modelId !== 'string' || modelId.length === 0) {
            errors.push(`${overridePath}.model: champ requis manquant`)
          } else if (!models[modelId]) {
            errors.push(`${overridePath}.model: modèle "${modelId}" absent du catalogue`)
          } else {
            const catalogModel = models[modelId]
            if (catalogModel.enabled !== true) {
              errors.push(`${overridePath}.model: modèle "${modelId}" désactivé dans le catalogue`)
            }
            if (RISK_ORDER[catalogModel.max_risk] < RISK_ORDER[riskLevel]) {
              errors.push(
                `${overridePath}.model: modèle "${modelId}" (max_risk=${catalogModel.max_risk}) sous le niveau de risque requis (${riskLevel})`,
              )
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

// Croise .automation/routines.yml et .automation/routing-policy.yml : chaque
// routine doit référencer, via `routing_policy`, une entrée qui existe
// réellement dans la politique (issue #400, cas limite « Routine déclarée
// sans routing_policy » — la présence du champ est déjà couverte par
// validateRoutinesConfig/REQUIRED_ROUTINE_FIELDS, ce qui manque ici est la
// résolution de la référence).
export function validateRoutingPolicyCoverage(routinesConfig, policy) {
  const errors = []
  const policyRoutines = policy && typeof policy === 'object' ? policy.routines ?? {} : {}

  for (const [name, routine] of Object.entries(routinesConfig.routines ?? {})) {
    if (!routine || typeof routine !== 'object' || !routine.routing_policy) continue
    if (!policyRoutines[routine.routing_policy]) {
      errors.push(
        `routines.${name}.routing_policy: aucune politique nommée "${routine.routing_policy}" dans .automation/routing-policy.yml`,
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

function main() {
  const routinesPath = process.env.CONFIG_PATH ?? '.automation/routines.yml'
  const catalogPath = process.env.MODEL_CATALOG_PATH ?? '.automation/model-catalog.yml'
  const policyPath = process.env.ROUTING_POLICY_PATH ?? '.automation/routing-policy.yml'

  const errors = []

  const routinesResult = loadConfigFile(routinesPath)
  const catalogResult = loadConfigFile(catalogPath)
  const policyResult = loadConfigFile(policyPath)
  errors.push(...routinesResult.errors, ...catalogResult.errors, ...policyResult.errors)

  const routines = routinesResult.config
  const catalog = catalogResult.config
  const policy = policyResult.config

  if (routines) {
    const { valid, errors: routineErrors } = validateRoutinesConfig(routines)
    if (!valid) errors.push(...routineErrors.map((error) => `${routinesPath}: ${error}`))
  }
  if (catalog) {
    const { valid, errors: catalogErrors } = validateModelCatalog(catalog)
    if (!valid) errors.push(...catalogErrors.map((error) => `${catalogPath}: ${error}`))
  }
  if (policy && catalog) {
    const { valid, errors: policyErrors } = validateRoutingPolicy(policy, catalog)
    if (!valid) errors.push(...policyErrors.map((error) => `${policyPath}: ${error}`))
  }
  if (routines && policy) {
    const { valid, errors: coverageErrors } = validateRoutingPolicyCoverage(routines, policy)
    if (!valid) errors.push(...coverageErrors.map((error) => `${routinesPath}: ${error}`))
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`::error::${error}`)
    }
    console.error(`configuration d'automatisation invalide (${errors.length} erreur(s))`)
    process.exitCode = 1
    return
  }

  console.log(`${routinesPath}: configuration valide (${Object.keys(routines.routines).length} routine(s))`)
  console.log(`${catalogPath}: configuration valide (${Object.keys(catalog.models).length} modèle(s))`)
  console.log(`${policyPath}: configuration valide (${Object.keys(policy.routines).length} politique(s))`)

  const entity = process.env.EVENT_ENTITY
  const label = process.env.EVENT_LABEL
  if (entity && label) {
    const resolved = resolveRoutine(routines, { entity, label })
    if (resolved) {
      console.log(
        `routine="${resolved.name}" skill="${resolved.skill}" entity="${resolved.entity}" trigger_label="${resolved.triggerLabel}" target_label="${resolved.targetLabel}"`,
      )
    } else {
      console.log(`aucune routine ne correspond à entity="${entity}" label="${label}"`)
    }
  }
}

// Même garde qu'automation-log.mjs : n'exécute main() que si ce fichier est
// le point d'entrée, pas quand pnpm test l'importe pour ses tests.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
