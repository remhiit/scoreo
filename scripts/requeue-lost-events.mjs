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
const GH_TOKEN = process.env.GH_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME
const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

// Temps qu'une session de routine prenne le run et pose `automation:in-progress` — ne
// pas balayer un label qui vient juste d'être posé.
const ORPHAN_THRESHOLD_MINUTES = 30

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

async function sweepIssues() {
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

async function main() {
  await sweepIssues()
  await sweepPullRequests()
}

main()
