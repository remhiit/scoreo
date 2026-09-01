#!/usr/bin/env node
// One-shot migration (issue #415): moves every open issue/PR still carrying
// an unprefixed automation label (`queued`, `ready`, `in-progress`,
// `needs-review`, `review-pass`, `needs-fix`, `needs-human`, `attempt-1/2/3`,
// `auto`) to its `automation:`-prefixed equivalent — see
// `doc/automation/state-machine.md` §2 for the full taxonomy. Run manually
// by a repo admin, only after the code consuming the new names (workflows,
// scripts, skills) is deployed (`automation-plan.md`'s "Stratégie de
// bascule"). Not a workflow: no schedule, no GitHub trigger — `GH_TOKEN`/
// `REPO_OWNER`/`REPO_NAME` supplied on the command line like the other
// scripts here.
//
// Idempotent: an item that already carries only the new label for a given
// old one (previous run completed, or never had the old label at all) is a
// no-op on replay — never re-added, never re-removed. Never guesses: an
// item whose labels are mutually incompatible (see `detectConflicts` below)
// is left completely untouched — no label added, none removed — and
// reported instead, requiring a human to resolve it before a re-run can
// migrate that item.
import { pathToFileURL } from 'node:url'

const GH_TOKEN = process.env.GH_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME
const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

// Table de renommage obligatoire (issue #415). `blocked` et `P0`…`P3` ne
// sont pas concernés, aucun `automation:done` n'est créé.
export const RENAME_TABLE = {
  queued: 'automation:queued',
  ready: 'automation:ready',
  'in-progress': 'automation:in-progress',
  'needs-review': 'automation:needs-review',
  'review-pass': 'automation:review-pass',
  'needs-fix': 'automation:needs-fix',
  'needs-human': 'automation:needs-human',
  'attempt-1': 'automation:attempt-1',
  'attempt-2': 'automation:attempt-2',
  'attempt-3': 'automation:attempt-3',
  auto: 'automation:enabled',
}

const ATTEMPT_COUNTER_REGEX = /^automation:attempt-[123]$/
const QUEUE_OR_TRIGGER_LABELS = ['automation:ready', 'automation:needs-review', 'automation:needs-fix']

function effectiveLabel(label) {
  return RENAME_TABLE[label] ?? label
}

// Détecte les combinaisons de labels que la migration ne doit jamais
// résoudre elle-même (doc/automation/state-machine.md §2 « combinaisons
// interdites »). Chaque état incompatible retourné bloque *tout* le
// traitement de l'objet — voir migrateItem.
export function detectConflicts(labelNames) {
  const conflicts = []

  for (const [oldName, newName] of Object.entries(RENAME_TABLE)) {
    if (labelNames.includes(oldName) && labelNames.includes(newName)) {
      conflicts.push(`"${oldName}" et son équivalent "${newName}" présents simultanément`)
    }
  }

  const effective = labelNames.map(effectiveLabel)

  const attemptCounters = [...new Set(effective.filter((label) => ATTEMPT_COUNTER_REGEX.test(label)))]
  if (attemptCounters.length > 1) {
    conflicts.push(`plusieurs compteurs attempt-N présents : ${attemptCounters.join(', ')}`)
  }

  if (effective.includes('automation:review-pass') && effective.includes('automation:needs-fix')) {
    conflicts.push('"automation:review-pass" et "automation:needs-fix" présents simultanément')
  }

  if (effective.includes('automation:needs-human')) {
    const triggers = QUEUE_OR_TRIGGER_LABELS.filter((label) => effective.includes(label))
    if (triggers.length > 0) {
      conflicts.push(`"automation:needs-human" présent avec ${triggers.join(', ')}`)
    }
  }

  return conflicts
}

// Liste les paires { oldName, newName } à migrer pour un jeu de labels
// donné — vide si aucun ancien label n'est présent (déjà migré, ou jamais
// concerné).
export function migrationsFor(labelNames) {
  return Object.entries(RENAME_TABLE)
    .filter(([oldName]) => labelNames.includes(oldName))
    .map(([oldName, newName]) => ({ oldName, newName }))
}

function labelNamesOf(item) {
  return (item.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name))
}

// Migre un item (issue ou PR) : pour chaque ancien label présent, pose le
// nouveau, vérifie sa présence, puis seulement alors retire l'ancien.
// N'écrit rien si le jeu de labels de départ est incompatible (voir
// detectConflicts) ou s'il n'y a rien à migrer.
export async function migrateItem(item, { addLabel, removeLabel, getLabels }) {
  const number = item.number
  const kind = item.pull_request ? 'pull_request' : 'issue'
  const labelNames = labelNamesOf(item)

  const conflicts = detectConflicts(labelNames)
  if (conflicts.length > 0) {
    return { number, kind, status: 'conflict', conflicts, actions: [] }
  }

  const migrations = migrationsFor(labelNames)
  if (migrations.length === 0) {
    return { number, kind, status: 'noop', conflicts: [], actions: [] }
  }

  const actions = []
  for (const { oldName, newName } of migrations) {
    try {
      await addLabel(number, newName)
      const currentLabels = await getLabels(number)
      if (!currentLabels.includes(newName)) {
        actions.push({ oldName, newName, result: 'failed', error: `"${newName}" absent après ajout, retrait annulé` })
        continue
      }
      await removeLabel(number, oldName)
      actions.push({ oldName, newName, result: 'migrated' })
    } catch (error) {
      actions.push({ oldName, newName, result: 'failed', error: error.message })
    }
  }

  const anyFailed = actions.some((action) => action.result === 'failed')
  return { number, kind, status: anyFailed ? 'partial' : 'migrated', conflicts: [], actions }
}

function logResult(result) {
  if (result.status === 'noop') {
    console.log(`#${result.number} (${result.kind}): rien à migrer`)
    return
  }
  if (result.status === 'conflict') {
    console.log(
      `#${result.number} (${result.kind}): CONFLIT — ${result.conflicts.join(' ; ')} — résolution humaine requise, aucun label modifié`,
    )
    return
  }
  for (const action of result.actions) {
    if (action.result === 'migrated') {
      console.log(`#${result.number} (${result.kind}): "${action.oldName}" -> "${action.newName}" migré`)
    } else {
      console.log(`#${result.number} (${result.kind}): "${action.oldName}" -> "${action.newName}" ÉCHEC — ${action.error}`)
    }
  }
}

// Migre tous les items fournis (déjà résolus par listOpenItems) et
// journalise chaque action. Retourne l'agrégat utilisé par main() pour
// décider du code de sortie.
export async function migrateAllOpenItems({ listOpenItems, addLabel, removeLabel, getLabels }) {
  const items = await listOpenItems()
  const results = []
  for (const item of items) {
    const result = await migrateItem(item, { addLabel, removeLabel, getLabels })
    logResult(result)
    results.push(result)
  }

  const migratedCount = results.filter((r) => r.status === 'migrated').length
  const noopCount = results.filter((r) => r.status === 'noop').length
  const partialCount = results.filter((r) => r.status === 'partial').length
  const conflictCount = results.filter((r) => r.status === 'conflict').length

  console.log(
    `\nRésumé : ${migratedCount} migré(s), ${noopCount} déjà à jour, ${partialCount} en échec partiel, ${conflictCount} conflit(s) nécessitant une résolution humaine.`,
  )

  return { results, migratedCount, noopCount, partialCount, conflictCount }
}

const headers = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

async function apiGet(path) {
  const res = await fetch(`${API_ROOT}${path}`, { headers })
  if (res.status === 404) return []
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}: ${await res.text()}`)
  return res.json()
}

async function listOpenItems() {
  const items = []
  for (let page = 1; ; page += 1) {
    const batch = await apiGet(`/issues?state=open&per_page=100&page=${page}`)
    items.push(...batch)
    if (batch.length < 100) break
  }
  return items
}

async function getLabels(number) {
  const issue = await apiGet(`/issues/${number}`)
  return labelNamesOf(issue)
}

async function addLabel(number, label) {
  const res = await fetch(`${API_ROOT}/issues/${number}/labels`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: [label] }),
  })
  if (!res.ok) {
    throw new Error(`POST label "${label}" on #${number} -> ${res.status}: ${await res.text()}`)
  }
}

async function removeLabel(number, label) {
  const res = await fetch(`${API_ROOT}/issues/${number}/labels/${encodeURIComponent(label)}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`DELETE label "${label}" on #${number} -> ${res.status}: ${await res.text()}`)
  }
}

async function main() {
  const { partialCount, conflictCount } = await migrateAllOpenItems({
    listOpenItems,
    addLabel,
    removeLabel,
    getLabels,
  })
  if (partialCount > 0 || conflictCount > 0) {
    process.exitCode = 1
  }
}

// GITHUB_EVENT_PATH/GH_TOKEN are present in every Actions job step —
// including `pnpm test` — where importing this module from its test file
// must not run main(). Only run when this file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
