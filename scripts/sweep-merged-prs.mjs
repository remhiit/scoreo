#!/usr/bin/env node
// Rattrapage horaire pour la limite structurelle documentée dans
// doc/technical/automation-plan.md (Phase 5, #208/#212) : `auto-merge-sync.yml`
// attend en synchrone (60 x 20s) que son propre auto-merge complète avant de
// fermer les issues liées dans le même job. Si ce délai expire — la PR #264 a
// dû être remise à jour sur `main` par l'auto-merge, ce qui a relancé la CI et
// repoussé le merge de 6 min au-delà de la boucle — l'issue reste ouverte et
// bloque le dispatcher (`MAX_IN_FLIGHT = 1`) jusqu'à intervention manuelle.
// Ce script balaie les PR fermées récemment, retient celles réellement
// mergées dans la fenêtre de rattrapage, et ferme les issues encore
// ouvertes qu'elles référencent — réutilisant le parsing et la fermeture de
// `close-linked-issues.mjs` pour ne pas dupliquer la logique.
import { pathToFileURL } from 'node:url'
import { closeIssue, extractClosedIssueNumbers } from './close-linked-issues.mjs'

const GH_TOKEN = process.env.GH_TOKEN
const REPO_OWNER = process.env.REPO_OWNER
const REPO_NAME = process.env.REPO_NAME
const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`

// Fenêtre de rattrapage : au-delà, une PR mergée n'est plus considérée par ce
// balayeur (le cas normal, sans incident, est couvert par
// close-linked-issues.yml/auto-merge-sync.yml).
export const CATCHUP_WINDOW_DAYS = 7

const headers = {
  Authorization: `Bearer ${GH_TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
}

export function isMergedWithinWindow(pr, now = Date.now()) {
  if (!pr.merged_at) return false
  const ageMs = now - new Date(pr.merged_at).getTime()
  return ageMs <= CATCHUP_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

async function fetchRecentlyClosedPRs() {
  const res = await fetch(`${API_ROOT}/pulls?state=closed&sort=updated&direction=desc&per_page=100`, { headers })
  if (!res.ok) {
    throw new Error(`GET /pulls -> ${res.status}: ${await res.text()}`)
  }
  const items = await res.json()
  if (items.length === 100) {
    console.warn('100 PR fermées trouvées — il y en a peut-être plus, ce passage ne les rattrape pas (pas de pagination).')
  }
  return items
}

export async function sweepMergedPRs(now = Date.now()) {
  const pulls = await fetchRecentlyClosedPRs()
  const merged = pulls.filter((pr) => isMergedWithinWindow(pr, now))
  if (merged.length === 0) {
    console.log('Aucune PR mergée dans la fenêtre de rattrapage, rien à faire.')
    return
  }

  for (const pr of merged) {
    const issueNumbers = extractClosedIssueNumbers(pr.body)
    for (const issueNumber of issueNumbers) {
      if (issueNumber === pr.number) {
        console.log(`PR #${pr.number}: référence à elle-même, ignorée`)
        continue
      }
      await closeIssue(issueNumber)
    }
  }
}

async function main() {
  await sweepMergedPRs()
}

// GITHUB_EVENT_PATH is set for every step of every Actions job — including
// `pnpm test`, where importing this module from its test file must not run
// main(). Only run when this file is the entry point.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
