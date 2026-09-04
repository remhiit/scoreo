#!/usr/bin/env node
// Dispatcher : lisse le débit d'événements vers R2 (doc/technical/
// automation-plan.md §3 — au-delà du plafond de runs, les events
// excédentaires sont perdus, pas mis en file). Les specs validées par R1
// attendent dans le label tampon `automation:queued` ; ce script promeut en `automation:ready`
// **une seule issue à la fois**, seulement quand rien n'est déjà en vol.
// Appelé par le même workflow que le balayeur horaire
// (requeue-lost-events.yml) : cron horaire, plus les triggers `issues`
// `unlabeled`/`closed` pour réagir vite à la fin d'un run. Zéro LLM (§2.2).
//
// Le blocage par dépendance est décidé sur le lien natif GitHub
// (`GET .../dependencies/blocked_by`, posé par sync-issue-dependencies.yml),
// jamais sur le label `blocked` — dérivé, à but d'affichage seulement (#432).
// Les labels, qui ne coûtent rien, filtrent d'abord ; seules les issues
// encore candidates après ce filtre sont interrogées, dans l'ordre de
// priorité, avec arrêt à la première éligible.
import { pathToFileURL } from 'node:url'

const GH_TOKEN = process.env.GH_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME
const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

// Un seul run R2 en vol à la fois. Élargir sera une décision instruite par
// le rapport R6, pas une intuition (cf. #155).
const MAX_IN_FLIGHT = 1

// Anti-rafale R5 : au-delà de ce nombre de PR ouvertes `automation:needs-review`,
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

// Pure decision: given a queued issue's labels and its native `blocked_by`
// list (each with at least a `state`), decide whether it can be promoted to
// `automation:ready`, or the reason it can't. Labels are checked first —
// cheap, no network — so a caller can reject on labels alone before ever
// fetching dependencies. `blocked` is deliberately absent from this check:
// it's a derived display label (doc/automation/state-machine.md), never the
// dispatch condition — only the native link decides.
export function decideDispatchPromotion(labelNames, blockers) {
  if (labelNames.includes('automation:needs-human')) {
    return { promote: false, reason: 'porte automation:needs-human' }
  }
  if (labelNames.includes('automation:in-progress')) {
    return { promote: false, reason: 'porte automation:in-progress' }
  }
  const openBlockers = blockers.filter((blocker) => blocker.state !== 'closed')
  if (openBlockers.length > 0) {
    const names = openBlockers.map((blocker) => `#${blocker.number}`).join(', ')
    return { promote: false, reason: `bloquée par ${names} (dépendance native encore ouverte)` }
  }
  return { promote: true }
}

export async function pickNextQueued(queuedIssues) {
  const candidates = queuedIssues
    .map((issue) => ({ issue, labelNames: labelNamesOf(issue) }))
    .filter(({ issue, labelNames }) => {
      const decision = decideDispatchPromotion(labelNames, [])
      if (!decision.promote) {
        console.log(`#${issue.number}: ${decision.reason}, ne peut pas être promue`)
        return false
      }
      return true
    })
    .sort((a, b) => {
      const rankDiff = priorityRank(a.labelNames) - priorityRank(b.labelNames)
      if (rankDiff !== 0) return rankDiff
      return new Date(a.issue.created_at).getTime() - new Date(b.issue.created_at).getTime()
    })

  for (const { issue, labelNames } of candidates) {
    const blockers = await apiGet(`/issues/${issue.number}/dependencies/blocked_by`)
    const decision = decideDispatchPromotion(labelNames, blockers)
    if (decision.promote) {
      return issue
    }
    console.log(`#${issue.number}: ${decision.reason}, ne peut pas être promue`)
  }
  return null
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
    console.log(`${inFlight} issue(s) déjà automation:ready/automation:in-progress (plafond ${MAX_IN_FLIGHT}) — pas de dispatch ce run`)
    return
  }

  const needsReviewPRs = (await listOpenWithLabel('automation:needs-review')).filter((item) => item.pull_request)
  if (needsReviewPRs.length > MAX_NEEDS_REVIEW_BACKLOG) {
    console.log(
      `${needsReviewPRs.length} PR(s) automation:needs-review ouvertes (> ${MAX_NEEDS_REVIEW_BACKLOG}) — laisse R3 absorber la file avant de dispatcher`,
    )
    return
  }

  const queuedIssues = (await listOpenWithLabel('automation:queued')).filter((item) => !item.pull_request)
  const next = await pickNextQueued(queuedIssues)
  if (!next) {
    console.log('Aucune issue "automation:queued" éligible à promouvoir')
    return
  }

  console.log(`#${next.number}: automation:queued -> automation:ready`)
  await removeLabel(next.number, 'automation:queued')
  await addLabel(next.number, 'automation:ready')
}

// GITHUB_EVENT_PATH/GH_TOKEN are set for every step of every Actions job —
// including `pnpm test` in ci.yml — so importing this module from its test
// file must not run main() (same regression class as unblock-issues.mjs,
// #161).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
