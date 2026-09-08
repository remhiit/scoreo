#!/usr/bin/env node
// Cron horaire : rattrape les événements `labeled` perdus quand une routine
// (R2/R3/R4) a été ignorée par le plafond de runs (doc/technical/
// automation-plan.md §3 — les events dépassant le plafond sont ignorés, pas
// mis en file). Principe « claim the run » (§4) : une routine retire son
// label déclencheur dès qu'elle démarre. Un label déclencheur encore posé
// longtemps après sa pose, sans `automation:in-progress`, signale donc un événement
// perdu. Le retirer puis le reposer seul régénère un événement `labeled`
// qui re-matche le trigger de la routine — retry aveugle à coût nul, sans
// moyen d'interroger le quota Claude depuis GitHub. Zéro LLM (§2.2).
//
// Second rôle du même balayeur (#467) : une routine peut aussi mourir après
// avoir posé `automation:in-progress` sans jamais reprendre (limite d'usage,
// compaction, crash) — l'item reste alors gelé indéfiniment, sans signal
// (#379). Toute possession dépassant `STALE_OWNERSHIP_THRESHOLD_MINUTES` est
// escaladée vers un humain plutôt que rejouée : contrairement à un label
// déclencheur orphelin, on ne sait pas où la routine s'est arrêtée, donc la
// re-déclencher pousserait une deuxième session sur le même travail (deux
// runs sur la même branche, sur une PR).
import { pathToFileURL } from 'node:url'
import { upsertMarkedComment } from './automation-log.mjs'

const GH_TOKEN = process.env.GH_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME
const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

// Temps qu'une session de routine prenne le run et pose `automation:in-progress` — ne
// pas balayer un label qui vient juste d'être posé.
const ORPHAN_THRESHOLD_MINUTES = 30

// Temps au-delà duquel une possession (`automation:in-progress`) est
// considérée périmée plutôt qu'un run simplement long — cf. commentaire de
// tête. Fixé à 180 min ; à ne pas confondre avec ORPHAN_THRESHOLD_MINUTES
// (label déclencheur, pas encore claim) ci-dessus.
export const STALE_OWNERSHIP_THRESHOLD_MINUTES = 180

const STALE_OWNERSHIP_MARKER = '<!-- automation-log:stale-ownership -->'

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

async function listOpenWithLabel(label) {
  const items = await apiGet(`/issues?state=open&labels=${encodeURIComponent(label)}&per_page=100`)
  if (items.length === 100) {
    console.warn(
      `"${label}": 100 items ouverts trouvés — il y en a peut-être plus, cette passe n'en tient pas compte (pas de pagination).`,
    )
  }
  return items
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
  const res = await fetch(`${API_ROOT}/issues/${number}/labels/${label}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`DELETE label "${label}" on #${number} -> ${res.status}: ${await res.text()}`)
  }
}

async function minutesSinceLabeled(number, label) {
  const timeline = await apiGet(`/issues/${number}/timeline?per_page=100`)
  const labelEvents = timeline.filter((event) => event.event === 'labeled' && event.label?.name === label)
  if (labelEvents.length === 0) return null
  const lastEvent = labelEvents[labelEvents.length - 1]
  return (Date.now() - new Date(lastEvent.created_at).getTime()) / 60000
}

async function requeueIfOrphaned(number, label, labelNames) {
  if (labelNames.includes('automation:in-progress')) {
    console.log(`#${number}: porte "automation:in-progress", skip (run en cours)`)
    return
  }
  if (labelNames.includes('automation:needs-human')) {
    console.log(`#${number}: porte "automation:needs-human", skip (état terminal)`)
    return
  }

  const minutesAgo = await minutesSinceLabeled(number, label)
  if (minutesAgo === null) {
    console.log(`#${number}: aucun événement "labeled" trouvé pour "${label}", skip`)
    return
  }
  if (minutesAgo < ORPHAN_THRESHOLD_MINUTES) {
    console.log(`#${number}: "${label}" posé depuis ${Math.round(minutesAgo)} min, sous le seuil, skip`)
    return
  }

  console.log(`#${number}: ${label} orphelin depuis ${Math.round(minutesAgo)} min → re-déclenché`)
  await removeLabel(number, label)
  await addLabel(number, label)
}

function labelNamesOf(item) {
  return item.labels.map((label) => (typeof label === 'string' ? label : label.name))
}

// Pure decision: given an item's current labels, whether it's a PR, and the
// age (minutes) of its last `automation:in-progress` `labeled` timeline
// event (null when no such event exists), decide whether this is a stale
// possession and, if so, which labels to add (in order) and remove.
// `automation:needs-human` is terminal — never re-escalated. A null age
// means the label predates the timeline window or was set by hand: treated
// as unknown, never as stale (an unknown age must not be assumed expired).
export function decideStaleOwnership({ labelNames, isPullRequest, minutesSinceInProgress }) {
  if (labelNames.includes('automation:needs-human')) {
    return { stale: false, terminal: true }
  }
  if (minutesSinceInProgress === null) {
    return { stale: false, unknownAge: true }
  }
  if (minutesSinceInProgress < STALE_OWNERSHIP_THRESHOLD_MINUTES) {
    return { stale: false }
  }
  return {
    stale: true,
    labelsToAdd: isPullRequest ? ['automation:needs-human'] : ['automation:needs-human', 'automation:queued'],
    labelsToRemove: ['automation:in-progress'],
  }
}

export function renderStaleOwnershipComment({ minutesAgo, isPullRequest }) {
  const action = isPullRequest
    ? '`automation:needs-human` posé, `automation:in-progress` retiré.'
    : '`automation:needs-human` et `automation:queued` posés, `automation:in-progress` retiré.'
  return [
    STALE_OWNERSHIP_MARKER,
    '## Automation — Possession périmée',
    '',
    '- Label périmé : `automation:in-progress`',
    `- Posé depuis : ${Math.round(minutesAgo)} min (seuil : ${STALE_OWNERSHIP_THRESHOLD_MINUTES} min)`,
    `- Action : ${action}`,
  ].join('\n')
}

async function escalateIfStale(number, isPullRequest, labelNames) {
  if (labelNames.includes('automation:needs-human')) {
    console.log(`#${number}: porte déjà "automation:needs-human", skip (état terminal)`)
    return
  }

  const minutesAgo = await minutesSinceLabeled(number, 'automation:in-progress')
  const decision = decideStaleOwnership({ labelNames, isPullRequest, minutesSinceInProgress: minutesAgo })

  if (decision.unknownAge) {
    console.log(`#${number}: aucun événement "labeled" trouvé pour "automation:in-progress", âge inconnu, skip`)
    return
  }
  if (!decision.stale) {
    console.log(`#${number}: "automation:in-progress" posé depuis ${Math.round(minutesAgo)} min, sous le seuil, skip`)
    return
  }

  console.log(`#${number}: possession périmée depuis ${Math.round(minutesAgo)} min → escalade`)
  for (const label of decision.labelsToAdd) {
    await addLabel(number, label)
  }
  for (const label of decision.labelsToRemove) {
    await removeLabel(number, label)
  }
  await upsertMarkedComment(number, STALE_OWNERSHIP_MARKER, renderStaleOwnershipComment({ minutesAgo, isPullRequest }))
}

export async function sweepIssues() {
  const issues = (await listOpenWithLabel('automation:ready')).filter((item) => !item.pull_request)
  for (const issue of issues) {
    await requeueIfOrphaned(issue.number, 'automation:ready', labelNamesOf(issue))
  }
}

async function sweepPullRequests() {
  for (const label of ['automation:needs-review', 'automation:needs-fix']) {
    const prs = (await listOpenWithLabel(label)).filter((item) => item.pull_request)
    for (const pr of prs) {
      await requeueIfOrphaned(pr.number, label, labelNamesOf(pr))
    }
  }
}

// Runs after the two sweeps above: an item whose trigger label is still
// present alongside `automation:in-progress` is left alone by
// `requeueIfOrphaned` (it skips on `automation:in-progress`) before this
// runs, so the escalation below never races a re-trigger of that same
// trigger label — it's simply never touched, neither removed nor re-posed.
export async function sweepStaleOwnership() {
  const items = await listOpenWithLabel('automation:in-progress')
  for (const item of items) {
    await escalateIfStale(item.number, Boolean(item.pull_request), labelNamesOf(item))
  }
}

async function main() {
  await sweepIssues()
  await sweepPullRequests()
  await sweepStaleOwnership()
}

// GITHUB_EVENT_PATH/GH_TOKEN are set for every step of every Actions job —
// including `pnpm test`, where importing this module from its test file
// must not run main(). Only run when this file is the entry point (same
// guard as unblock-issues.mjs/automation-log.mjs, #467).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
