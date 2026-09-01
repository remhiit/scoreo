#!/usr/bin/env node
// Dispatcher : lisse le débit d'événements vers R2 (doc/technical/
// automation-plan.md §3 — au-delà du plafond de runs, les events
// excédentaires sont perdus, pas mis en file). Les specs validées par R1
// attendent dans le label tampon `queued` ; ce script promeut en `ready`
// **une seule issue à la fois**, seulement quand rien n'est déjà en vol.
// Appelé par le même workflow que le balayeur horaire
// (requeue-lost-events.yml) : cron horaire, plus les triggers `issues`
// `unlabeled`/`closed` pour réagir vite à la fin d'un run. Zéro LLM (§2.2).
const GH_TOKEN = process.env.GH_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME
const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

// Un seul run R2 en vol à la fois. Élargir sera une décision instruite par
// le rapport R6, pas une intuition (cf. #155).
const MAX_IN_FLIGHT = 1

// Anti-rafale R5 : au-delà de ce nombre de PR ouvertes `needs-review`,
// laisser R3 absorber la file avant d'y ajouter une PR de plus.
const MAX_NEEDS_REVIEW_BACKLOG = 2

const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3']

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

async function listOpenWithLabel(label) {
  const items = await apiGet(`/issues?state=open&labels=${encodeURIComponent(label)}&per_page=100`)
  if (items.length === 100) {
    console.warn(
      `"${label}": 100 items ouverts trouvés — il y en a peut-être plus, cette passe n'en tient pas compte (pas de pagination).`,
    )
  }
  return items
}

function labelNamesOf(item) {
  return item.labels.map((label) => (typeof label === 'string' ? label : label.name))
}

function priorityRank(labelNames) {
  const index = PRIORITY_ORDER.findIndex((priority) => labelNames.includes(priority))
  return index === -1 ? PRIORITY_ORDER.length : index
}

function pickNextQueued(queuedIssues) {
  const eligible = queuedIssues.filter((issue) => {
    const labelNames = labelNamesOf(issue)
    const blockingLabel = ['blocked', 'automation:needs-human', 'automation:in-progress'].find((label) =>
      labelNames.includes(label),
    )
    if (blockingLabel) {
      console.log(`#${issue.number}: porte "${blockingLabel}", ne peut pas être promue`)
      return false
    }
    return true
  })
  if (eligible.length === 0) return null

  return eligible.sort((a, b) => {
    const rankDiff = priorityRank(labelNamesOf(a)) - priorityRank(labelNamesOf(b))
    if (rankDiff !== 0) return rankDiff
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })[0]
}

async function main() {
  const [readyIssues, inProgressIssues] = await Promise.all([
    listOpenWithLabel('automation:ready'),
    listOpenWithLabel('automation:in-progress'),
  ])
  const inFlight =
    readyIssues.filter((item) => !item.pull_request).length +
    inProgressIssues.filter((item) => !item.pull_request).length
  if (inFlight >= MAX_IN_FLIGHT) {
    console.log(`${inFlight} issue(s) déjà ready/in-progress (plafond ${MAX_IN_FLIGHT}) — pas de dispatch ce run`)
    return
  }

  const needsReviewPRs = (await listOpenWithLabel('automation:needs-review')).filter((item) => item.pull_request)
  if (needsReviewPRs.length > MAX_NEEDS_REVIEW_BACKLOG) {
    console.log(
      `${needsReviewPRs.length} PR(s) needs-review ouvertes (> ${MAX_NEEDS_REVIEW_BACKLOG}) — laisse R3 absorber la file avant de dispatcher`,
    )
    return
  }

  const queuedIssues = (await listOpenWithLabel('automation:queued')).filter((item) => !item.pull_request)
  const next = pickNextQueued(queuedIssues)
  if (!next) {
    console.log('Aucune issue "automation:queued" éligible à promouvoir')
    return
  }

  console.log(`#${next.number}: automation:queued -> automation:ready`)
  await removeLabel(next.number, 'automation:queued')
  await addLabel(next.number, 'automation:ready')
}

main()
