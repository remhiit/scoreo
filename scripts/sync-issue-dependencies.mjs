#!/usr/bin/env node
// Parses the "## Dépendances" section of an issue body ("Dépend de #N (raison)"
// lines, documented in issue-to-spec/SKILL.md) and reconciles GitHub's native
// `blocked_by` links against it, so that downstream automation (e.g. auto-ready
// on unblock) can query real dependency data via GET .../dependencies/blocked_by
// instead of parsing free text itself.
//
// Reconciliation, not one-way posting: every run reads the section, reads the
// current native blocked_by links, and diffs the two — posting what's missing
// (POST .../dependencies/blocked_by) and removing what's no longer declared
// (DELETE .../dependencies/blocked_by/{issue_id}). An issue with NO
// "## Dépendances" section is left untouched in both directions — that's what
// protects links posed by hand. A section that exists but declares zero
// blockers (empty, or prose-only) is the "remove everything" case, distinct
// from "no section at all".
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME

async function api(method, path, body) {
  return fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

// Anchored at line start: `(?:^|\n)##` only matches a "##" that begins a
// line (the very first character of the body, or right after a newline).
// A prose mention of the section name elsewhere in the body — in a sentence
// or between inline backticks — never starts a line with "##", so it can't
// be mistaken for the heading. A fenced code block (```…```) is stripped out
// before the search for the same reason: it can legitimately contain a line
// that starts with "## Dépendances" (issue-to-spec/SKILL.md's own example of
// the format is exactly such a fence) without being the real section
// (regression: #432's Contexte cited the section name and hijacked the old
// unanchored match).
// If several "## Dépendances" headings exist in the body, the FIRST one
// (top to bottom) is authoritative; any later duplicate is ignored — this is
// a deliberate, documented choice (doc/technical/automation-plan.md), not an
// accident of the regex.
//
// Returns `null` when no section is found (caller must not touch any link),
// or the deduped list of declared blocker numbers when a section is found
// (an empty array means the section exists but declares no blocker — the
// "remove everything" case).
export function extractBlockerNumbers(body) {
  const text = (body ?? '').replace(/```[\s\S]*?```/g, '')
  const match = text.match(/(?:^|\n)##\s*D[ée]pendances\b([\s\S]*?)(?=\n##\s|$)/i)
  if (!match) return null
  const numbers = [...match[1].matchAll(/D[ée]pend de #(\d+)/gi)].map((m) => Number(m[1]))
  return [...new Set(numbers)]
}

// Pure diff between the declared blocker numbers and the currently-linked
// native blockers (as returned by GET .../dependencies/blocked_by, each an
// object carrying at least `id` and `number`). Returns the two lists the
// caller must act on: `toAdd` (numbers to POST) and `toRemove` (blocker
// objects — DELETE needs their `id`, not just their `number` — to DELETE).
export function diffBlockers(declaredNumbers, currentBlockers) {
  const currentNumbers = new Set(currentBlockers.map((b) => b.number))
  const declared = new Set(declaredNumbers)
  const toAdd = declaredNumbers.filter((n) => !currentNumbers.has(n))
  const toRemove = currentBlockers.filter((b) => !declared.has(b.number))
  return { toAdd, toRemove }
}

async function getCurrentBlockers(issueNumber) {
  const res = await api('GET', `/issues/${issueNumber}/dependencies/blocked_by`)
  if (res.status === 404) return []
  if (!res.ok) {
    console.log(`#${issueNumber}: échec de lecture des blocked_by actuels (${res.status}), traité comme vide`)
    return []
  }
  return res.json()
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

async function unlinkBlockedBy(blockedNumber, blocker) {
  const res = await api('DELETE', `/issues/${blockedNumber}/dependencies/blocked_by/${blocker.id}`)
  if (res.ok) {
    console.log(`#${blockedNumber}: blocked_by #${blocker.number} retiré`)
  } else if (res.status === 404) {
    console.log(`#${blockedNumber}: blocked_by #${blocker.number} déjà absent, ignoré`)
  } else {
    console.log(`#${blockedNumber}: échec de retrait de #${blocker.number} (${res.status}), ignoré`)
  }
}

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    console.log('GITHUB_TOKEN not set — skipping dependency sync.')
    return
  }

  const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
  const issue = payload.issue
  const rawNumbers = extractBlockerNumbers(issue.body)

  if (rawNumbers === null) {
    console.log(`#${issue.number}: aucune section Dépendances trouvée, aucune écriture`)
    return
  }

  const declared = rawNumbers.filter((n) => {
    if (n === issue.number) {
      console.log(`#${issue.number}: référence à elle-même dans Dépendances, ignorée`)
      return false
    }
    return true
  })

  console.log(
    declared.length === 0
      ? `#${issue.number}: section Dépendances trouvée, zéro dépendance déclarée`
      : `#${issue.number}: dépendances déclarées: ${declared.map((n) => `#${n}`).join(', ')}`,
  )

  const current = await getCurrentBlockers(issue.number)
  const { toAdd, toRemove } = diffBlockers(declared, current)

  if (toAdd.length === 0 && toRemove.length === 0) {
    console.log(`#${issue.number}: blocked_by déjà à jour, rien à faire`)
    return
  }

  for (const blockerNumber of toAdd) {
    await linkBlockedBy(issue.number, blockerNumber)
  }
  for (const blocker of toRemove) {
    await unlinkBlockedBy(issue.number, blocker)
  }
}

// GITHUB_EVENT_PATH is set for every step of every Actions job — including
// `pnpm test` in ci.yml, where importing this module from its test file must
// not run main(). Only run when this file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
