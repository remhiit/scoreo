#!/usr/bin/env node
// Mirrors each issue/PR's label state onto the GitHub Project "Status" field.
// Labels are the source of truth (doc/technical/automation-plan.md §2.4) — this
// is a one-way sync, never the reverse. A closed item overrides its labels:
// completed (issue `state_reason`, or a merged PR) always reads as "Done".
// Two modes:
//   - triggered by an `issues`/`pull_request` labeled/unlabeled/closed event:
//     syncs just that one item, read from GITHUB_EVENT_PATH
//   - triggered by schedule/workflow_dispatch: reconciles every open issue/PR,
//     plus items closed within RECENT_CLOSED_WINDOW_DAYS
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const PROJECT_TOKEN = process.env.PROJECT_TOKEN
const PROJECT_OWNER = process.env.PROJECT_OWNER
const PROJECT_NUMBER = Number(process.env.PROJECT_NUMBER)
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME

const STATUS_FIELD_NAME = 'Status'

// Bounded window for the scheduled/manual reconciliation to also pick up
// items closed before this fix existed (or missed by the labeled/unlabeled
// triggers) — avoids paginating the entire closed-issues history every run.
const RECENT_CLOSED_WINDOW_DAYS = 30

// First matching label wins — order matters only for items carrying more
// than one of these labels at once:
//   - automation:needs-human  → In progress (escalade, état terminal — priorité max)
//   - automation:needs-fix    → In progress (verdict R3 « à corriger », déclenche R4)
//   - automation:needs-review → In progress (file d'attente R3)
//   - automation:review-pass  → In progress (verdict R3 conforme, en attente de merge)
//   - automation:in-progress  → In progress (générique, une routine travaille dessus)
//   - automation:ready        → Todo (spec validée, en attente de R2)
//   - blocked                 → Todo (dépendance externe ouverte ; peut temporairement
//                    coexister avec n'importe quel label de file — `automation:queued`/
//                    `automation:ready`/`automation:in-progress` — jusqu'à son retrait
//                    par unblock-issues.mjs une fois tous les bloqueurs fermés, cf. #384)
const LABEL_STATUS_PRIORITY = [
  ['automation:needs-human', 'In progress'],
  ['automation:needs-fix', 'In progress'],
  ['automation:needs-review', 'In progress'],
  ['automation:review-pass', 'In progress'],
  ['automation:in-progress', 'In progress'],
  ['automation:ready', 'Todo'],
  ['blocked', 'Todo'],
]

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PROJECT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

async function getProjectMeta() {
  const data = await graphql(
    `query($login: String!, $number: Int!) {
      user(login: $login) {
        projectV2(number: $number) {
          id
          fields(first: 20) {
            nodes {
              ... on ProjectV2SingleSelectField { id name options { id name } }
            }
          }
        }
      }
    }`,
    { login: PROJECT_OWNER, number: PROJECT_NUMBER },
  )
  const project = data.user.projectV2
  const statusField = project.fields.nodes.find((f) => f?.name === STATUS_FIELD_NAME)
  if (!statusField) throw new Error(`Project field "${STATUS_FIELD_NAME}" not found`)
  return { projectId: project.id, statusField }
}

// Closing state beats labels: an item closed as `completed` (issue) or
// merged (PR, no native `stateReason` — treated as the same signal) always
// reads as "Done", even while it still carries `automation:in-progress` (never removed
// by close-linked-issues.mjs, cf. #195). A `not_planned` close (or a PR
// closed without merging) imposes no status, consistent with the "unknown
// label" case below.
export function desiredStatus({ labelNames, state, stateReason }) {
  if (state !== 'OPEN') {
    return stateReason === 'COMPLETED' ? 'Done' : null
  }
  for (const [label, status] of LABEL_STATUS_PRIORITY) {
    if (labelNames.includes(label)) return status
  }
  return null
}

function graphqlFieldName(kind) {
  return kind === 'issue' ? 'issue' : 'pullRequest'
}

function connectionName(kind) {
  return kind === 'issue' ? 'issues' : 'pullRequests'
}

async function getItem(kind, number) {
  const field = graphqlFieldName(kind)
  // PullRequest has no `stateReason` field (that's issue-specific) — its
  // `state` already distinguishes MERGED from CLOSED, which is all syncOne
  // needs to derive the equivalent completed/not_planned signal.
  const extraFields = kind === 'issue' ? 'state\n          stateReason' : 'state'
  const data = await graphql(
    `query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        ${field}(number: $number) {
          ${extraFields}
          labels(first: 20) { nodes { name } }
          projectItems(first: 10) { nodes { id project { id } } }
        }
      }
    }`,
    { owner: REPO_OWNER, repo: REPO_NAME, number },
  )
  return data.repository[field]
}

async function listOpenNumbers(kind) {
  const connection = connectionName(kind)
  const data = await graphql(
    `query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        ${connection}(states: OPEN, first: 100) { nodes { number } }
      }
    }`,
    { owner: REPO_OWNER, repo: REPO_NAME },
  )
  const numbers = data.repository[connection].nodes.map((n) => n.number)
  if (numbers.length === 100) {
    console.warn(
      `Fetched exactly 100 open ${connection} — there may be more that this reconciliation run is silently skipping (no pagination yet).`,
    )
  }
  return numbers
}

// Bounded reconciliation of recently-closed items (see RECENT_CLOSED_WINDOW_DAYS)
// so a closed issue/PR eventually reaches "Done" even when the `closed` event
// itself was missed (predates this fix, or a filter dropped it, cf. #195).
async function listClosedNumbers(kind, sinceIso) {
  const connection = connectionName(kind)
  const states = kind === 'issue' ? ['CLOSED'] : ['CLOSED', 'MERGED']
  const stateType = kind === 'issue' ? 'IssueState' : 'PullRequestState'
  const data = await graphql(
    `query($owner: String!, $repo: String!, $states: [${stateType}!]) {
      repository(owner: $owner, name: $repo) {
        ${connection}(states: $states, first: 100, orderBy: { field: UPDATED_AT, direction: DESC }) {
          nodes { number closedAt }
        }
      }
    }`,
    { owner: REPO_OWNER, repo: REPO_NAME, states },
  )
  const nodes = data.repository[connection].nodes
  const cutoff = new Date(sinceIso).getTime()
  const recent = nodes.filter((n) => n.closedAt && new Date(n.closedAt).getTime() >= cutoff)
  if (nodes.length === 100 && recent.length === nodes.length) {
    console.warn(
      `Fetched exactly 100 closed ${connection} ordered by updated_at, all within the ${RECENT_CLOSED_WINDOW_DAYS}-day window — there may be more that this reconciliation run is silently skipping (no pagination yet).`,
    )
  }
  return recent.map((n) => n.number)
}

async function setStatus(projectId, itemId, statusField, statusName) {
  const option = statusField.options.find((o) => o.name === statusName)
  if (!option) throw new Error(`Status option "${statusName}" not found`)
  await graphql(
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId, itemId: $itemId, fieldId: $fieldId,
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }`,
    { projectId, itemId, fieldId: statusField.id, optionId: option.id },
  )
}

async function syncOne(projectId, statusField, kind, number) {
  const node = await getItem(kind, number)
  if (!node) return

  const labelNames = node.labels.nodes.map((l) => l.name)
  // PR: no native stateReason, so MERGED stands in for "completed" and a
  // plain CLOSED (never merged) stands in for "not_planned".
  const stateReason = kind === 'issue' ? node.stateReason : node.state === 'MERGED' ? 'COMPLETED' : 'NOT_PLANNED'
  const target = desiredStatus({ labelNames, state: node.state, stateReason })
  if (!target) return

  const item = node.projectItems.nodes.find((i) => i.project.id === projectId)
  if (!item) {
    console.log(`${kind} #${number}: not on the project board, skipping`)
    return
  }

  console.log(`${kind} #${number}: -> ${target}`)
  await setStatus(projectId, item.id, statusField, target)
}

async function main() {
  const { projectId, statusField } = await getProjectMeta()
  const eventName = process.env.GITHUB_EVENT_NAME

  if (eventName === 'issues' || eventName === 'pull_request') {
    const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
    const kind = eventName === 'issues' ? 'issue' : 'pull_request'
    const number = (payload.issue ?? payload.pull_request).number
    await syncOne(projectId, statusField, kind, number)
    return
  }

  // Scheduled / manual run: reconcile every open issue/PR, plus items closed
  // within the last RECENT_CLOSED_WINDOW_DAYS days.
  const sinceIso = new Date(Date.now() - RECENT_CLOSED_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString()
  for (const kind of ['issue', 'pull_request']) {
    for (const number of await listOpenNumbers(kind)) {
      await syncOne(projectId, statusField, kind, number)
    }
    for (const number of await listClosedNumbers(kind, sinceIso)) {
      await syncOne(projectId, statusField, kind, number)
    }
  }
}

// GITHUB_EVENT_PATH and PROJECT_TOKEN are set for every step of every Actions
// job — including `pnpm test` in ci.yml, where importing this module from its
// test file must not run main() (same regression class as close-linked-
// issues.mjs, #161). Only run when this file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!PROJECT_TOKEN) {
    console.log('PROJECT_TOKEN secret not set — skipping project sync.')
    process.exit(0)
  }
  main()
}
