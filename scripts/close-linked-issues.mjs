#!/usr/bin/env node
// `gh pr merge --auto --squash` (auto-merge-sync.yml) only *enables* GitHub's
// native auto-merge — the squash-merge itself completes later, asynchronously,
// once required checks pass, outside any workflow run. GitHub's own closing-
// keyword parsing ("Closes #N") should apply regardless, but in practice this
// repo observed linked issues staying open after such auto-merges (#120, #122,
// #114 — see doc/technical/automation-plan.md Phase 5, #139), while a manually
// merged PR (#121) closed its linked issue normally. Rather than depend on a
// repo-wide "Workflow permissions" setting no available tool can read here,
// this job parses the merged PR's body for closing keywords itself and closes
// the referenced issues explicitly, with its own `issues: write` token.
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

const CLOSE_KEYWORDS = 'close[sd]?|fix(?:e[sd])?|resolve[sd]?'
const CLOSING_REF_REGEX = new RegExp(`\\b(?:${CLOSE_KEYWORDS})\\b:?\\s*((?:#\\d+[,\\s]*(?:and\\s+)?)+)`, 'gi')

export function extractClosedIssueNumbers(body) {
  const numbers = new Set()
  for (const match of (body ?? '').matchAll(CLOSING_REF_REGEX)) {
    for (const numMatch of match[1].matchAll(/(?<![\w/])#(\d+)/g)) {
      numbers.add(Number(numMatch[1]))
    }
  }
  return [...numbers]
}

async function closeIssue(issueNumber) {
  const getRes = await fetch(`${API_ROOT}/issues/${issueNumber}`, { headers })
  if (!getRes.ok) {
    console.log(`#${issueNumber}: introuvable (${getRes.status}), ignoré`)
    return
  }
  const issue = await getRes.json()
  if (issue.state === 'closed') {
    console.log(`#${issueNumber}: déjà fermée, ignoré`)
    return
  }

  const patchRes = await fetch(`${API_ROOT}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
  })
  if (patchRes.ok) {
    console.log(`#${issueNumber}: fermée`)
  } else {
    console.log(`#${issueNumber}: échec de fermeture (${patchRes.status}), ignoré`)
  }
}

async function main() {
  const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
  const pr = payload.pull_request
  const issueNumbers = extractClosedIssueNumbers(pr.body)
  if (issueNumbers.length === 0) {
    console.log(`PR #${pr.number}: aucune référence de fermeture dans le corps.`)
    return
  }

  for (const issueNumber of issueNumbers) {
    if (issueNumber === pr.number) {
      console.log(`PR #${pr.number}: référence à elle-même, ignorée`)
      continue
    }
    await closeIssue(issueNumber)
  }
}

// GITHUB_EVENT_PATH is set for every step of every Actions job — including
// `pnpm test` in ci.yml, where importing this module from its test file must
// not run main(). Only run when this file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
