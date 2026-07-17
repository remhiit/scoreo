#!/usr/bin/env node
// On `issues` `closed` (state_reason "completed"), promotes to `ready` every
// issue the closed one was blocking, once ALL of that issue's native
// `blocked_by` dependencies are closed. Depends on the blocked_by link
// posed by sync-issue-dependencies.yml — without data, this is a no-op.
// Zero LLM (doc/technical/automation-plan.md §2.2).
import { readFileSync } from 'node:fs'

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

async function getLabels(issueNumber) {
  const issue = await apiGet(`/issues/${issueNumber}`)
  return (issue.labels ?? []).map((label) => (typeof label === 'string' ? label : label.name))
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

async function tryUnblock(issueNumber) {
  const labels = await getLabels(issueNumber)
  if (labels.includes('ready') || labels.includes('in-progress')) {
    console.log(`#${issueNumber}: already ready/in-progress, skipping`)
    return
  }

  const blockers = await apiGet(`/issues/${issueNumber}/dependencies/blocked_by`)
  const stillOpen = blockers.filter((blocker) => blocker.state !== 'closed')
  if (stillOpen.length > 0) {
    console.log(`#${issueNumber}: still blocked by ${stillOpen.map((b) => `#${b.number}`).join(', ')}`)
    return
  }

  console.log(`#${issueNumber}: all blockers closed -> ready`)
  await addLabel(issueNumber, 'ready')
  if (labels.includes('blocked')) {
    await removeLabel(issueNumber, 'blocked')
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

main()
