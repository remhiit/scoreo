#!/usr/bin/env node
// On `issues` `closed` (state_reason "completed"), reconciles every issue the
// closed one was blocking. Two independent decisions per dependent, both
// driven by its native `blocked_by` dependencies (posed by
// sync-issue-dependencies.yml — without that data, this is a no-op):
//   - post `automation:queued`, unless a queue label (`automation:queued`/
//     `automation:ready`/`automation:in-progress`) is already present (don't
//     re-queue what's already in flight);
//   - remove `blocked`, once every native blocker is closed — independent of
//     the queue decision above, so a dependent that reached the queue before
//     its blockers closed still gets `blocked` cleared (#435: the old code's
//     early return on an existing queue label short-circuited this cleanup
//     too, leaving `blocked` stuck forever on such issues).
// `automation:needs-human` is terminal: a dependent carrying it is left
// completely untouched, `blocked` included — only a human re-queues it.
// The dispatcher (scripts/dispatch-ready.mjs) decides when a
// `automation:queued` issue actually becomes `automation:ready`.
// Zero LLM (doc/technical/automation-plan.md §2.2).
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const GH_TOKEN = process.env.GH_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME
const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

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

async function addLabel(issueNumber, label) {
  const res = await fetch(`${API_ROOT}/issues/${issueNumber}/labels`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ labels: [label] }),
  })
  if (!res.ok) {
    throw new Error(`POST label "${label}" on #${issueNumber} -> ${res.status}: ${await res.text()}`)
  }
}

async function removeLabel(issueNumber, label) {
  const res = await fetch(`${API_ROOT}/issues/${issueNumber}/labels/${label}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok && res.status !== 404) {
    throw new Error(`DELETE label "${label}" on #${issueNumber} -> ${res.status}: ${await res.text()}`)
  }
}

const QUEUE_LABELS = ['automation:queued', 'automation:ready', 'automation:in-progress']

// Pure decision: given a dependent's current labels and its native
// `blocked_by` list (each with at least a `state`), decide the two
// independent actions — whether to post `automation:queued` and whether to
// remove `blocked`. `automation:needs-human` short-circuits both to false:
// that escalation is terminal, so the dependent (its `blocked` label
// included) is left untouched until a human intervenes.
export function decideUnblockActions(labels, blockers) {
  if (labels.includes('automation:needs-human')) {
    return { shouldQueue: false, shouldUnblock: false }
  }
  const allBlockersClosed = blockers.every((blocker) => blocker.state === 'closed')
  const alreadyQueued = QUEUE_LABELS.some((label) => labels.includes(label))
  return {
    shouldQueue: allBlockersClosed && !alreadyQueued,
    shouldUnblock: allBlockersClosed && labels.includes('blocked'),
  }
}

async function tryUnblock(issueNumber) {
  const issue = await apiGet(`/issues/${issueNumber}`)
  if (issue.state !== 'open') {
    console.log(`#${issueNumber}: closed in the meantime, skipping`)
    return
  }
  const labels = (issue.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name))

  if (labels.includes('automation:needs-human')) {
    console.log(`#${issueNumber}: escalated to automation:needs-human, skipping — a human must re-queue it`)
    return
  }

  const blockers = await apiGet(`/issues/${issueNumber}/dependencies/blocked_by`)
  const stillOpen = blockers.filter((blocker) => blocker.state !== 'closed')
  if (stillOpen.length > 0) {
    console.log(`#${issueNumber}: still blocked by ${stillOpen.map((b) => `#${b.number}`).join(', ')}`)
  }

  const { shouldQueue, shouldUnblock } = decideUnblockActions(labels, blockers)

  if (shouldQueue) {
    console.log(`#${issueNumber}: all blockers closed -> queued`)
    await addLabel(issueNumber, 'automation:queued')
  } else if (stillOpen.length === 0) {
    console.log(`#${issueNumber}: already ${QUEUE_LABELS.join('/')}, not re-queuing`)
  }

  if (shouldUnblock) {
    try {
      await removeLabel(issueNumber, 'blocked')
      console.log(`#${issueNumber}: blocked removed — all native blockers closed`)
    } catch (error) {
      console.log(`#${issueNumber}: failed to remove blocked (${error.message}), continuing`)
    }
  }
}

async function main() {
  const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
  if (payload.issue.state_reason !== 'completed') {
    console.log(
      `Issue #${payload.issue.number} closed as "${payload.issue.state_reason}", not "completed" — skipping.`,
    )
    return
  }

  const closedNumber = payload.issue.number
  const blocking = await apiGet(`/issues/${closedNumber}/dependencies/blocking`)
  if (blocking.length === 0) {
    console.log(`#${closedNumber} was not blocking anything.`)
    return
  }

  for (const { number } of blocking) {
    await tryUnblock(number)
  }
}

// GITHUB_EVENT_PATH is set for every step of every Actions job — including
// `pnpm test` in ci.yml, where importing this module from its test file must
// not run main(). Only run when this file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
