#!/usr/bin/env node
// Journal d'exécution idempotent pour les routines (R2/R3/R4/R5) : un unique
// commentaire par routine sur une même issue/PR, retrouvé via un marqueur
// HTML caché en première ligne, mis à jour à chaque relance plutôt que
// dupliqué (doc/technical/automation-plan.md §4, "claim the run" — même
// logique de non-spam appliquée ici aux commentaires plutôt qu'aux labels).
// Écrit en script déterministe (zéro LLM, principe directeur §2.2) pour que
// les Actions qui traduisent déjà un verdict de routine en signal GitHub
// (ex. review-status-sync.yml → commit status `claude/review`) puissent
// aussi tenir ce journal, sans dépendre du texte libre d'une session Claude.
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

const ROUTINE_LABELS = {
  'pr-review': 'PR review',
  'implement-task': 'Implémentation',
  'address-feedback': 'Correctif',
  'site-quality': 'Hygiène',
  'weekly-report': 'Rapport',
}

export function markerFor(routine) {
  return `<!-- automation-log:${routine} -->`
}

export function renderAutomationLog({
  routine,
  triggeredAt,
  sha,
  status,
  iteration,
  validation,
  resultUrl,
  contextUrl,
  complexity,
  summary,
}) {
  const label = ROUTINE_LABELS[routine] ?? routine
  const lines = [
    markerFor(routine),
    `## Automation — ${label}`,
    '',
    `- Routine : \`${routine}\``,
    `- Déclenchée le : \`${triggeredAt}\``,
    `- Commit analysé : \`${sha}\``,
    `- Statut : \`${status}\``,
    `- Itération : \`${iteration}\``,
    `- Validation : ${validation}`,
    `- Résultat : ${resultUrl ? `[voir le run](${resultUrl})` : '_à venir_'}`,
  ]
  // Optional: links this decision back to the TaskContext artifact it was
  // made from (issue #401, doc/technical/automation-plan.md §4) — absent for
  // callers that don't build one yet, so existing journals stay unchanged.
  if (contextUrl) {
    lines.push(`- Contexte : [voir l'artefact](${contextUrl})`)
  }
  // Optional: publie le ComplexityAssessment (issue #402, §4) sous une forme
  // lisible — jamais un niveau de risque, jamais un blocage : la complexité
  // ne remplace ni ne masque le résultat de change-risk (#387). Absent pour
  // les appelants qui n'en produisent pas encore, comme contextUrl ci-dessus.
  if (complexity) {
    lines.push(
      `- Complexité : \`${complexity.level}\` (score ${complexity.score}/100, confiance \`${complexity.confidence}\`, provenance \`${complexity.provenance}\`)`,
    )
    if (complexity.override) {
      lines.push(
        `  - Override manuel : \`${complexity.override.level}\` (heuristique : \`${complexity.override.heuristicLevel}\`, source : ${complexity.override.source})`,
      )
    }
    if (complexity.reasons?.length) {
      lines.push(`  - Raisons : ${complexity.reasons.join(' ; ')}`)
    }
  }
  if (summary) {
    lines.push('', summary)
  }
  return lines.join('\n')
}

export function parseAutomationLog(body) {
  return {
    sha: body.match(/Commit analysé : `([^`]*)`/)?.[1] ?? null,
    status: body.match(/Statut : `([^`]*)`/)?.[1] ?? null,
    iteration: body.match(/Itération : `([^`]*)`/)?.[1] ?? null,
  }
}

async function listComments(number) {
  const res = await fetch(`${API_ROOT}/issues/${number}/comments?per_page=100`, { headers })
  if (!res.ok) {
    throw new Error(`GET /issues/${number}/comments -> ${res.status}: ${await res.text()}`)
  }
  const items = await res.json()
  if (items.length === 100) {
    console.warn(`#${number}: 100 commentaires trouvés — il y en a peut-être plus, cette passe n'en tient pas compte (pas de pagination).`)
  }
  return items
}

export async function findAutomationLogComment(number, routine) {
  const marker = markerFor(routine)
  const comments = await listComments(number)
  return comments.find((comment) => comment.body?.startsWith(marker)) ?? null
}

// Un journal existant sur ce même SHA, déjà sorti de l'état `running`, est
// une preuve que ce commit a déjà été traité par cette routine — un appelant
// peut s'en servir pour éviter un travail redondant (critère d'acceptation
// #376 : « le système détecte qu'un même SHA a déjà été traité »).
export async function upsertAutomationLog({
  number,
  routine,
  sha,
  status,
  iteration = '1',
  validation = 'lint / typecheck / tests',
  resultUrl,
  contextUrl,
  complexity,
  summary,
  triggeredAt = new Date().toISOString(),
}) {
  const existing = await findAutomationLogComment(number, routine)
  const previous = existing ? parseAutomationLog(existing.body) : null
  const alreadyProcessed = Boolean(previous?.sha === sha && previous?.status && previous.status !== 'running')

  const body = renderAutomationLog({
    routine,
    triggeredAt,
    sha,
    status,
    iteration,
    validation,
    resultUrl,
    contextUrl,
    complexity,
    summary,
  })

  if (existing) {
    const res = await fetch(`${API_ROOT}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (!res.ok) {
      throw new Error(`PATCH comment ${existing.id} -> ${res.status}: ${await res.text()}`)
    }
    return { commentId: existing.id, created: false, alreadyProcessed, previous }
  }

  const res = await fetch(`${API_ROOT}/issues/${number}/comments`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  })
  if (!res.ok) {
    throw new Error(`POST /issues/${number}/comments -> ${res.status}: ${await res.text()}`)
  }
  const created = await res.json()
  return { commentId: created.id, created: true, alreadyProcessed: false, previous: null }
}

// Le ComplexityAssessment (issue #402) est lu depuis son artefact JSON, même
// convention que LOG_CONTEXT_URL pour TaskContext : un fichier absent ou
// invalide ne fait jamais échouer le journal lui-même, juste omet la ligne
// Complexité de ce run.
function loadComplexityAssessment(path) {
  if (!path) return undefined
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    console.warn(`automation-log: impossible de lire l'artefact de complexité "${path}" (${err.message}) — ligne omise`)
    return undefined
  }
}

async function main() {
  const number = Number(process.env.LOG_NUMBER)
  const routine = process.env.LOG_ROUTINE
  const sha = process.env.LOG_SHA
  const result = await upsertAutomationLog({
    number,
    routine,
    sha,
    status: process.env.LOG_STATUS,
    iteration: process.env.LOG_ITERATION,
    validation: process.env.LOG_VALIDATION,
    resultUrl: process.env.LOG_RESULT_URL,
    contextUrl: process.env.LOG_CONTEXT_URL,
    complexity: loadComplexityAssessment(process.env.LOG_COMPLEXITY_PATH),
    summary: process.env.LOG_SUMMARY,
    triggeredAt: process.env.LOG_TRIGGERED_AT,
  })

  console.log(
    `#${number}: journal "${routine}" ${result.created ? 'créé' : 'mis à jour'} (commentaire ${result.commentId})`,
  )
  if (result.alreadyProcessed) {
    console.log(`#${number}: commit ${sha} déjà traité par "${routine}" (statut précédent : ${result.previous.status})`)
  }
}

// GITHUB_EVENT_PATH est présent à chaque étape d'un job Actions — y compris
// `pnpm test`, où importer ce module depuis son fichier de test ne doit pas
// déclencher main(). N'exécute que si ce fichier est le point d'entrée.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
