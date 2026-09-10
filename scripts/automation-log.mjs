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
  // Rôles du coordinateur (#469, doc/technical/automation-plan.md §4 « Le
  // coordinateur ») — un marqueur distinct par rôle via le même mécanisme
  // `markerFor(routine)` que les autres routines ci-dessus. Le rôle review
  // réutilise directement le marqueur `pr-review` existant (même
  // `review-status-sync.yml`, même sémantique) : rien à ajouter ici pour lui.
  'coordinator-implement': 'Coordinateur — implémentation',
  'coordinator-fix': 'Coordinateur — correctif',
  // Les deux relecteurs aux corpus disjoints (#470,
  // doc/automation/state-machine.md §8) : un marqueur distinct par relecteur,
  // pour que le journal d'une PR permette d'attribuer chaque finding à son
  // relecteur sans les mélanger dans une seule entrée.
  'coordinator-review-functional': 'Coordinateur — review fonctionnelle',
  'coordinator-review-technical': 'Coordinateur — review technique',
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
  routing,
  metrics,
  runMetrics,
  budget,
  findings,
  missingReviewers,
  summary,
  taskContextVersion,
  routingApplied,
  activation,
  executedBy,
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
    // Traçabilité (issue #494) : le skill et le modèle réellement exécutés,
    // distinct de `routing` (décision théorique) ci-dessous — jamais gaté
    // par un `if`, contrairement aux blocs optionnels qui suivent : un
    // appelant qui ne fournit pas `executedBy` obtient `inconnu`/`inconnu`
    // plutôt qu'une ligne manquante (doc/automation/skill-contract.md §2
    // "Traçabilité" — donnée indisponible, jamais devinée).
    `- Exécuté par : skill \`${executedBy?.skill ?? 'inconnu'}\`, modèle \`${executedBy?.model ?? 'inconnu'}\``,
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
    // Le détail du passage fallback LLM (#403) — niveau heuristique, niveau
    // LLM, niveau consolidé, confiance finale, version de prompt — n'a pas de
    // champ dédié et est journalisé comme une entrée de plus dans `limits`
    // (scripts/complexity-llm.mjs#consolidateComplexity), au même titre que
    // le plancher "jamais trivial" ou l'override ignoré du §402. `limits`
    // n'était pas encore publié dans le journal avant #403 ; il l'est
    // maintenant systématiquement, pour ce cas comme pour les autres.
    if (complexity.limits?.length) {
      lines.push(`  - Limites : ${complexity.limits.join(' ; ')}`)
    }
    // `escalationRequired`, lui, a un champ dédié dans ComplexityAssessment
    // (#403) — structurellement distinct d'une `confidence: 'low'` ordinaire,
    // que scripts/model-router.mjs#routeModel traite déjà comme « majorer la
    // bande, prudence, continuer ». Rendu ici comme une ligne à part, visible
    // sans avoir à parser le texte libre de `limits` ci-dessus.
    if (complexity.escalationRequired) {
      lines.push(
        '  - ⚠️ Escalade requise : désaccord structurel entre l\'heuristique et le fallback LLM (voir Limites) — distinct d\'une confiance basse ordinaire',
      )
    }
  }
  // Optional: publie la RoutingDecision (issue #404, doc/automation/model-routing.md
  // § Algorithme du routeur) — le modèle retenu, son origine et la chaîne de
  // fallback restante, jamais un choix silencieux. Absent pour les appelants
  // qui n'en produisent pas encore, comme complexity/contextUrl ci-dessus.
  if (routing) {
    if (routing.status === 'selected') {
      lines.push(
        `- Routage : \`${routing.selectedModel.id}\` (origine \`${routing.selectedModel.origin}\`, risque \`${routing.input.risk.level}\`, bande \`${routing.input.complexity.effectiveLevel}\`)`,
      )
      if (routing.fallbacks?.length) {
        lines.push(`  - Fallbacks : ${routing.fallbacks.map((f) => f.id).join(' → ')}`)
      }
    } else {
      lines.push(`- Routage : \`aucun candidat\` (risque \`${routing.input.risk.level}\`, bande \`${routing.input.complexity.effectiveLevel}\`)`)
    }
    if (routing.rulesApplied?.length) {
      lines.push(`  - Règles appliquées : ${routing.rulesApplied.join(' ; ')}`)
    }
    if (routing.limits?.length) {
      lines.push(`  - Limites : ${routing.limits.join(' ; ')}`)
    }
    // Optional: publie, pour une décision de routage résolue par le
    // coordinateur (scripts/routing-dry-run.mjs#resolveRoutingDryRun,
    // #406), les trois versions de configuration lues —
    // TASK_CONTEXT_VERSION (task-context.mjs), policyVersion/catalogVersion
    // (déjà portées par RoutingDecision.input, #404) —, le mode
    // d'activation résolu et sa raison (matrice d'activation, #476,
    // scripts/routing-activation.mjs#resolveActivation, à côté du modèle
    // proposé), et une mention explicite de non-application, plutôt que de
    // laisser un opérateur le déduire du seul champ `applied`.
    // `routingApplied` gate ce bloc entier : absent (tout appelant qui n'a
    // pas encore ce champ, comme avant #406), aucune de ces lignes
    // n'apparaît.
    if (routingApplied !== undefined) {
      lines.push(
        `  - Configuration : TaskContext v${taskContextVersion ?? '?'}, politique v${routing.input?.policyVersion ?? '?'}, catalogue v${routing.input?.catalogVersion ?? '?'}`,
      )
      // Optional dans ce bloc lui-même : absent pour tout appelant antérieur
      // à #476 qui ne fournit encore que `routingApplied` sans le détail de
      // la matrice d'activation qui l'a produit.
      if (activation) {
        lines.push(`  - Activation : \`${activation.mode}\` — ${activation.reason}`)
        // Optional flag (issue #480) : le rollback (.automation/routing-policy.yml#rollback)
        // est intervenu après que ce run a résolu sa propre activation —
        // jamais réévalué en cours de route (resolveActivation n'est appelé
        // qu'une fois par run), ce qui garantit que ce run termine sur le
        // modèle déjà retenu et qu'aucun sous-agent déjà lancé n'est
        // interrompu. Ce champ existe pour que le journal de CE run précis
        // le dise explicitement, plutôt que de laisser un opérateur le
        // déduire du seul fait que le prochain run parte en `observe`.
        if (activation.rollbackDuringRun) {
          lines.push(
            "  - ⚠️ Rollback intervenu pendant ce run : le modèle déjà retenu à l'ouverture est conservé, aucun sous-agent déjà lancé n'est interrompu — le prochain run partira en observation.",
          )
        }
      }
      lines.push(
        routingApplied
          ? '  - Modèle appliqué : oui — le sous-agent a été lancé avec ce modèle'
          : '  - Modèle appliqué : non (mode observation) — le sous-agent réel a été lancé sans override de modèle',
      )
    }
  }
  // Optional: métriques d'un run du coordinateur (issue #469,
  // doc/technical/automation-plan.md § « Le coordinateur »,
  // acceptance criterion « collectées dès cette première version ») —
  // auto-déclarées par la session, pas mesurées par ce script. Absent pour
  // tout appelant qui n'en produit pas, comme les champs optionnels ci-dessus.
  if (metrics) {
    const parts = []
    if (metrics.fixIterations !== undefined) {
      parts.push(`itérations de correction : ${metrics.fixIterations}`)
    }
    if (metrics.compactionObserved !== undefined) {
      parts.push(`compaction observée : ${metrics.compactionObserved ? 'oui' : 'non'}`)
    }
    if (metrics.usageLimitApproached !== undefined) {
      parts.push(`limite d'usage approchée : ${metrics.usageLimitApproached ? 'oui' : 'non'}`)
    }
    if (parts.length) {
      lines.push(`- Métriques : ${parts.join(', ')}`)
    }
  }
  // Optional: publie le RunMetrics d'un run (issue #477,
  // doc/technical/automation-plan.md § « Métriques ») — le pendant structuré
  // et versionné de `metrics` ci-dessus, produit par
  // scripts/run-metrics.mjs#buildRunMetrics et déjà validé contre
  // schemas/automation/run-metrics.schema.json avant d'arriver ici (un
  // enregistrement non conforme n'est jamais transmis à ce rendu). Absent
  // pour tout appelant qui n'en produit pas encore, comme les blocs
  // optionnels ci-dessus.
  if (runMetrics) {
    lines.push(
      `- Run metrics : \`${runMetrics.complete ? 'complet' : 'incomplet'}\` (routine \`${runMetrics.routine}\`, statut \`${runMetrics.outcome.status}\`)`,
    )
    if (runMetrics.durationSeconds !== null) {
      lines.push(`  - Durée : ${runMetrics.durationSeconds}s`)
    }
    if (runMetrics.complexity) {
      lines.push(`  - Complexité : \`${runMetrics.complexity.band}\` (provenance \`${runMetrics.complexity.provenance}\`)`)
    }
    if (runMetrics.risk) {
      lines.push(`  - Risque : \`${runMetrics.risk.level}\``)
    }
    if (runMetrics.routing) {
      lines.push(
        `  - Modèle proposé / réellement utilisé : \`${runMetrics.routing.proposedModel ?? '?'}\` / \`${runMetrics.routing.actualModel ?? '?'}\` (activation \`${runMetrics.routing.activationMode ?? '?'}\`)`,
      )
      if (runMetrics.routing.fallbacks?.length) {
        lines.push(`  - Fallbacks : ${runMetrics.routing.fallbacks.join(' → ')}`)
      }
    }
    lines.push(`  - Itérations de correctif : ${runMetrics.outcome.fixIterations ?? '?'}`)
    if (runMetrics.outcome.ciGreenFirstPass !== null) {
      lines.push(`  - CI verte au premier passage : ${runMetrics.outcome.ciGreenFirstPass ? 'oui' : 'non'}`)
    }
    if (runMetrics.findings) {
      lines.push(`  - Findings : fonctionnel ${runMetrics.findings.functional ?? '?'}, technique ${runMetrics.findings.technical ?? '?'}`)
    }
    if (runMetrics.usage) {
      const formatUsageFlag = (value) => (value === null ? '?' : value ? 'oui' : 'non')
      lines.push(
        `  - Usage : compaction observée ${formatUsageFlag(runMetrics.usage.compactionObserved)}, limite d'usage approchée ${formatUsageFlag(runMetrics.usage.usageLimitApproached)}`,
      )
    }
    if (runMetrics.outcome.escalation) {
      lines.push(`  - Escalade : ${runMetrics.outcome.escalation}`)
    }
    if (runMetrics.configVersions) {
      lines.push(
        `  - Versions : TaskContext v${runMetrics.configVersions.taskContext ?? '?'}, politique v${runMetrics.configVersions.routingPolicy ?? '?'}, catalogue v${runMetrics.configVersions.modelCatalog ?? '?'}`,
      )
    }
    if (!runMetrics.complete) {
      lines.push(`  - ⚠️ Enregistrement incomplet — champs manquants : ${runMetrics.missingFields.join(', ')}`)
    }
  }
  // Optional: publie le résultat d'un checkBudget (issue #478,
  // scripts/routing-budget.mjs) qui a arrêté ce run — jamais un check qui est
  // resté `ok`, ce champ n'existe que pour journaliser un dépassement, avec
  // le plafond franchi et la valeur observée déjà dans `reason`
  // (scripts/routing-budget.mjs#checkBudget les y inclut toujours). Absent
  // pour tout appelant qui n'en produit pas, comme les champs optionnels
  // ci-dessus.
  if (budget) {
    const icon = budget.status === 'exceeded' ? '⚠️' : '✅'
    lines.push(`- Budget : ${icon} \`${budget.status}\` — ${budget.reason}`)
  }
  // Optional: attribue chaque finding des deux relecteurs à corpus disjoints
  // (#470) à celui ou ceux qui l'ont rendu, et marque un finding hors corpus
  // comme tel plutôt que de le faire disparaître — c'est ce qui permet au
  // journal d'une PR d'attribuer chaque finding à son relecteur (critère
  // d'acceptation #470). Absent pour tout appelant qui n'en produit pas,
  // comme les champs optionnels ci-dessus.
  if (findings?.length) {
    lines.push('- Findings :')
    for (const finding of findings) {
      const reviewers = finding.reviewers?.join(' + ') ?? '?'
      const corpusTag = finding.corpus === 'out' ? ' _(hors corpus — exclu de l\'arbitrage)_' : ''
      lines.push(`  - **${finding.severity}** (${reviewers}) : ${finding.summary}${corpusTag}`)
    }
  }
  // Optional: nomme le ou les relecteurs manquants quand l'arbitrage (#470)
  // n'a pas pu se calculer — jamais conclu sur le seul relecteur restant.
  if (missingReviewers?.length) {
    lines.push(`- Relecteur(s) manquant(s) : ${missingReviewers.join(', ')}`)
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

// Generic idempotent-comment-by-marker mechanism, shared by every caller
// that needs a single tracked comment on an issue/PR (routine journals
// below, and `requeue-lost-events.mjs`'s stale-ownership escalation).
export async function findCommentByMarker(number, marker) {
  const comments = await listComments(number)
  return comments.find((comment) => comment.body?.startsWith(marker)) ?? null
}

async function writeComment(number, existing, body) {
  if (existing) {
    const res = await fetch(`${API_ROOT}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    })
    if (!res.ok) {
      throw new Error(`PATCH comment ${existing.id} -> ${res.status}: ${await res.text()}`)
    }
    return { commentId: existing.id, created: false }
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
  return { commentId: created.id, created: true }
}

export async function upsertMarkedComment(number, marker, body) {
  const existing = await findCommentByMarker(number, marker)
  return writeComment(number, existing, body)
}

export async function findAutomationLogComment(number, routine) {
  return findCommentByMarker(number, markerFor(routine))
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
  onlyIfRunning = false,
  validation = 'lint / typecheck / tests',
  resultUrl,
  contextUrl,
  complexity,
  routing,
  metrics,
  runMetrics,
  budget,
  findings,
  missingReviewers,
  summary,
  triggeredAt = new Date().toISOString(),
  taskContextVersion,
  routingApplied,
  activation,
  executedBy,
}) {
  const existing = await findAutomationLogComment(number, routine)
  const previous = existing ? parseAutomationLog(existing.body) : null
  const alreadyProcessed = Boolean(previous?.sha === sha && previous?.status && previous.status !== 'running')

  // `onlyIfRunning` sert à *clore* un journal laissé en `running` par un
  // appelant qui écrivait le début d'une étape sans savoir comment elle
  // finirait (#473 : le rôle « correctif » du coordinateur, dont le label
  // `automation:attempt-N` arrive avant que le sous-agent démarre). Sans
  // journal existant, ou déjà sorti de `running`, il n'y a rien à clore :
  // on ne crée pas d'entrée pour une étape qui n'a jamais eu lieu.
  if (onlyIfRunning && previous?.status !== 'running') {
    return { skipped: true, commentId: existing?.id ?? null, created: false, alreadyProcessed, previous }
  }
  // L'itération à clore est celle du journal en cours, pas celle que
  // l'appelant croit connaître : l'événement de clôture (convergence,
  // escalade) ne porte pas le numéro du tour.
  const effectiveIteration = onlyIfRunning ? (previous.iteration ?? iteration) : iteration

  const body = renderAutomationLog({
    routine,
    triggeredAt,
    sha,
    status,
    iteration: effectiveIteration,
    validation,
    resultUrl,
    contextUrl,
    complexity,
    routing,
    metrics,
    runMetrics,
    budget,
    findings,
    missingReviewers,
    summary,
    taskContextVersion,
    routingApplied,
    activation,
    executedBy,
  })

  const { commentId, created } = await writeComment(number, existing, body)
  return { commentId, created, alreadyProcessed, previous, skipped: false }
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

// La RoutingDecision (issue #404) est lue depuis son artefact JSON, même
// convention tolérante qu'au-dessus : un fichier absent ou invalide omet
// juste la ligne Routage, sans faire échouer le journal.
function loadRoutingDecision(path) {
  if (!path) return undefined
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    console.warn(`automation-log: impossible de lire l'artefact de routage "${path}" (${err.message}) — ligne omise`)
    return undefined
  }
}

// Les métriques du coordinateur (#469) viennent de variables d'env
// individuelles plutôt que d'un artefact JSON, comme complexity/routing
// ci-dessus — un run de coordinateur n'a que trois valeurs à transmettre,
// pas un document structuré à part entière. Chaque variable absente omet
// juste sa ligne (renderAutomationLog ci-dessus) ; aucune n'étant fournie,
// `metrics` reste `undefined` et la section entière est omise.
export function loadMetricsFromEnv() {
  const fixIterations = process.env.LOG_METRIC_FIX_ITERATIONS
  const compactionObserved = process.env.LOG_METRIC_COMPACTION_OBSERVED
  const usageLimitApproached = process.env.LOG_METRIC_USAGE_LIMIT_APPROACHED
  if (fixIterations === undefined && compactionObserved === undefined && usageLimitApproached === undefined) {
    return undefined
  }
  return {
    ...(fixIterations !== undefined && { fixIterations: Number(fixIterations) }),
    ...(compactionObserved !== undefined && { compactionObserved: compactionObserved === 'true' }),
    ...(usageLimitApproached !== undefined && { usageLimitApproached: usageLimitApproached === 'true' }),
  }
}

// Traçabilité (issue #494) : skill/modèle réellement exécutés, lus depuis
// l'environnement pour l'appel en ligne de commande, même convention que
// loadMetricsFromEnv ci-dessus. Contrairement à `metrics`, ce champ n'est
// jamais `undefined` en sortie : un appelant qui ne fournit ni l'une ni
// l'autre variable obtient quand même un objet, dont renderAutomationLog
// affiche les clés manquantes comme `inconnu` (§2 du contrat — donnée
// indisponible, jamais devinée), plutôt que d'omettre la ligne entière.
export function loadExecutedByFromEnv() {
  return {
    skill: process.env.LOG_EXECUTED_BY_SKILL,
    model: process.env.LOG_EXECUTED_BY_MODEL,
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
    routing: loadRoutingDecision(process.env.LOG_ROUTING_PATH),
    metrics: loadMetricsFromEnv(),
    summary: process.env.LOG_SUMMARY,
    triggeredAt: process.env.LOG_TRIGGERED_AT,
    onlyIfRunning: process.env.LOG_ONLY_IF_RUNNING === 'true',
    executedBy: loadExecutedByFromEnv(),
  })

  if (result.skipped) {
    console.log(`#${number}: aucun journal "${routine}" en cours à clore — rien à écrire`)
    return
  }

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
