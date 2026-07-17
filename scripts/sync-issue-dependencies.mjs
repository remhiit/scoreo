#!/usr/bin/env node
// Parses the "## Dépendances" section of an issue body ("Dépend de #N (raison)"
// lines, documented in issue-to-spec/SKILL.md) and posts GitHub's native
// `blocked_by` link for each reference, so that downstream automation (e.g.
// auto-ready on unblock) can query real dependency data via
// GET .../dependencies/blocked_by instead of parsing free text itself.
import { readFileSync } from 'node:fs'

const TOKEN = process.env.GITHUB_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME

if (!TOKEN) {
  console.log('GITHUB_TOKEN not set — skipping dependency sync.')
  process.exit(0)
}

async function api(method, path, body) {
  return fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function extractBlockerNumbers(issueBody) {
  const section = (issueBody ?? '').match(/##\s*D[ée]pendances\b([\s\S]*?)(\n##\s|$)/i)
  if (!section) return []
  const numbers = [...section[1].matchAll(/D[ée]pend de #(\d+)/gi)].map((m) => Number(m[1]))
  return [...new Set(numbers)]
}

async function linkBlockedBy(blockedNumber, blockerNumber) {
  const blockerRes = await api('GET', `/issues/${blockerNumber}`)
  if (!blockerRes.ok) {
    console.log(`#${blockedNumber}: bloqueur #${blockerNumber} introuvable (${blockerRes.status}), ignoré`)
    return
  }
  const blocker = await blockerRes.json()

  const linkRes = await api('POST', `/issues/${blockedNumber}/dependencies/blocked_by`, {
    issue_id: blocker.id,
  })
  if (linkRes.ok) {
    console.log(`#${blockedNumber}: blocked_by #${blockerNumber} lié`)
  } else if (linkRes.status === 422) {
    console.log(`#${blockedNumber}: blocked_by #${blockerNumber} déjà lié, ignoré`)
  } else {
    console.log(`#${blockedNumber}: échec de liaison à #${blockerNumber} (${linkRes.status}), ignoré`)
  }
}

async function main() {
  const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
  const issue = payload.issue
  const blockerNumbers = extractBlockerNumbers(issue.body)
  if (blockerNumbers.length === 0) return

  for (const blockerNumber of blockerNumbers) {
    if (blockerNumber === issue.number) {
      console.log(`#${issue.number}: référence à elle-même dans Dépendances, ignorée`)
      continue
    }
    await linkBlockedBy(issue.number, blockerNumber)
  }
}

main()
