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
const REQUIRED_ROUTINE_FIELDS = ['entity', 'trigger_label', 'skill', 'concurrency_key']
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

// Toute routine déclenchée par un label la retire et pose `in-progress` en
// tout premier geste ("claim the run", automation-plan.md §4) — la cible est
// donc toujours la même, quelle que soit la routine.
export const CLAIM_LABEL = 'in-progress'

export function resolveRoutine(config, { entity, label }) {
  const entry = Object.entries(config.routines).find(
    ([, routine]) => routine.entity === entity && routine.trigger_label === label,
  )
  if (!entry) return null
  const [name, routine] = entry
  return { name, skill: routine.skill, entity, triggerLabel: label, targetLabel: CLAIM_LABEL }
}

function main() {
  const configPath = process.env.CONFIG_PATH ?? '.automation/routines.yml'
  const config = loadRoutinesConfig(configPath)
  const { valid, errors } = validateRoutinesConfig(config)

  if (!valid) {
    for (const error of errors) {
      console.error(`::error::${configPath}: ${error}`)
    }
    console.error(`${configPath}: configuration invalide (${errors.length} erreur(s))`)
    process.exitCode = 1
    return
  }

  console.log(`${configPath}: configuration valide (${Object.keys(config.routines).length} routine(s))`)

  const entity = process.env.EVENT_ENTITY
  const label = process.env.EVENT_LABEL
  if (entity && label) {
    const resolved = resolveRoutine(config, { entity, label })
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
