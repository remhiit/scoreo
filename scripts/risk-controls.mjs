#!/usr/bin/env node
// Garde-fous du risque élevé (issue #479, tranche 4/6 de l'épic #407 —
// doc/technical/automation-plan.md §5). Garantit que le reste de
// l'activation progressive du routage par sous-agent (#476…#481) suppose
// acquis : quel que soit le mode d'activation résolu pour une routine, un
// changement à risque élevé ne peut jamais être fusionné automatiquement
// ni éviter la revue humaine. Fonctions pures, zéro effet de bord, zéro
// appel réseau — même précédent que scripts/routing-activation.mjs, dont
// le garde-fou "risque high" est un axe voisin mais distinct (quel modèle
// exécute la routine, jamais si son résultat peut merger seul).
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { extractClosedIssueNumbers } from './close-linked-issues.mjs'
import { extractRiskLevel } from './routing-dry-run.mjs'

// Même précédent que COMPLEXITY_BANDS, mirroré à la main dans
// scripts/automation-dispatch.mjs, scripts/model-router.mjs et
// scripts/routing-activation.mjs : trois/quatre valeurs fixes ne
// justifient pas une dépendance croisée entre ces modules.
const RISK_LEVELS = ['low', 'medium', 'high']
const ACTIVATION_MODES = ['observe', 'apply']
const ENABLED_LABEL = 'automation:enabled'

// Un niveau absent, vide ou hors de RISK_LEVELS est traité comme "high" —
// le mode le plus contraignant, jamais le plus permissif (issue #479, cas
// limite « section Catégorie de risque absente ou illisible »).
// `unreadable` distingue ce repli d'un "high" réellement déclaré, pour que
// l'appelant puisse le nommer dans sa raison plutôt que de le confondre
// avec une déclaration explicite.
function normalizeRiskLevel(riskLevel) {
  if (RISK_LEVELS.includes(riskLevel)) return { level: riskLevel, unreadable: false }
  return { level: 'high', unreadable: true }
}

// Contrôles obligatoires pour un triplet (niveau de risque, mode
// d'activation résolu par scripts/routing-activation.mjs#resolveActivation,
// #476). `activationMode` ne change jamais le résultat pour "high" — le
// garde-fou du risque élevé est indépendant du routage par sous-agent,
// tranche sœur de ce ticket — il n'est accepté ici que pour que l'appelant
// puisse tracer la décision à côté du mode réellement résolu, jamais pour
// la moduler. Toute propriété étrangère de l'appelant (le modèle de
// sous-agent retenu, par exemple) est ignorée : cette fonction ne dépend
// que de riskLevel/activationMode, jamais du modèle qui exécute la routine
// (issue #479, critère d'acceptation « indépendance au modèle »).
export function requiredControls({ riskLevel, activationMode }) {
  if (activationMode !== undefined && !ACTIVATION_MODES.includes(activationMode)) {
    throw new Error(`risk-controls: mode d'activation inconnu "${activationMode}" (doit être "observe" ou "apply")`)
  }

  const { level, unreadable } = normalizeRiskLevel(riskLevel)
  const reasons = []
  if (unreadable) {
    reasons.push(
      `niveau de risque illisible (${riskLevel === undefined ? 'absent' : JSON.stringify(riskLevel)}) — traité comme "high", le mode le plus contraignant, jamais le plus permissif`,
    )
  }

  if (level === 'low') {
    reasons.push('risque "low" : contrôles standards')
    return {
      riskLevel: level,
      activationMode,
      requiresHumanReview: false,
      forbidsEnabledLabel: false,
      controls: ['standard-review'],
      reasons,
    }
  }

  if (level === 'medium') {
    reasons.push(
      'risque "medium" : revue humaine recommandée avant merge, automation:enabled reste interdit (doc/technical/automation-plan.md §5, liste blanche réservée au risque "low")',
    )
    return {
      riskLevel: level,
      activationMode,
      requiresHumanReview: true,
      forbidsEnabledLabel: true,
      controls: ['human-review-recommended'],
      reasons,
    }
  }

  reasons.push(
    'risque "high" : revue humaine obligatoire et automation:enabled interdit, quel que soit le mode d\'activation résolu pour cette routine',
  )
  return {
    riskLevel: level,
    activationMode,
    requiresHumanReview: true,
    forbidsEnabledLabel: true,
    controls: ['human-review-mandatory', 'no-automation-enabled'],
    reasons,
  }
}

// Refuse la combinaison `automation:enabled` + risque interdisant ce label,
// sur une combinaison de labels réelle plutôt que sur une déclaration — le
// même contrôle que `requiredControls` ci-dessus, appliqué à ce qu'une PR
// porte effectivement. Couvre aussi bien le re-contrôle du coordinateur
// avant de poser le label lui-même que le job de garde CI
// (.github/workflows/risk-controls.yml, job `risk-controls`) qui refuse la
// combinaison même quand `automation:enabled` a été posé à la main par un
// humain (issue #479, cas limite « posé à la main sur une PR à risque
// élevé ») : le seul cas qui ne bloque jamais est l'absence du label
// lui-même — un risque non vérifiable est toujours traité comme "high" par
// `requiredControls`, jamais comme "rien à vérifier".
export function checkEnabledLabelAllowed({ labels, riskLevel, issueNumber }) {
  const hasEnabledLabel = (labels ?? []).includes(ENABLED_LABEL)
  if (!hasEnabledLabel) {
    return { allowed: true, reason: `${ENABLED_LABEL} absent — rien à vérifier` }
  }

  const { forbidsEnabledLabel, riskLevel: level, reasons } = requiredControls({ riskLevel })
  const issueRef = issueNumber ? `#${issueNumber}` : "l'issue liée"
  if (forbidsEnabledLabel) {
    return {
      allowed: false,
      reason: `${ENABLED_LABEL} interdit : ${issueRef} est à risque "${level}" — ${reasons.join(' ; ')}`,
    }
  }
  return { allowed: true, reason: `${ENABLED_LABEL} autorisé : ${issueRef} est à risque "${level}"` }
}

// Point d'entrée du job de garde CI : lit la PR de l'événement
// `pull_request` courant, et — seulement si elle porte `automation:enabled`
// — résout le risque de chaque issue qu'elle referme (`Closes #N`) pour
// vérifier la combinaison. Une issue introuvable ou dont la section
// `## Catégorie de risque` ne peut pas être lue résout `undefined`, que
// `checkEnabledLabelAllowed`/`requiredControls` traitent déjà comme "high"
// — jamais un skip silencieux : l'absence de preuve du contraire bloque, ne
// laisse jamais passer.
async function main() {
  const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf-8'))
  const pr = payload.pull_request
  if (!pr) {
    console.log('risk-controls: pas de pull_request dans le payload, rien à vérifier.')
    return
  }

  const labels = (pr.labels ?? []).map((label) => label.name)
  if (!labels.includes(ENABLED_LABEL)) {
    console.log(`risk-controls: PR #${pr.number} sans ${ENABLED_LABEL}, rien à vérifier.`)
    return
  }

  const issueNumbers = extractClosedIssueNumbers(pr.body)
  if (issueNumbers.length === 0) {
    console.error(
      `::error::risk-controls: PR #${pr.number} porte ${ENABLED_LABEL} sans référence "Closes #N" — risque non vérifiable, traité comme "high"`,
    )
    process.exitCode = 1
    return
  }

  const GH_TOKEN = process.env.GH_TOKEN
  const REPO_OWNER = process.env.REPO_OWNER
  const REPO_NAME = process.env.REPO_NAME
  const API_ROOT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
  const headers = {
    Authorization: `Bearer ${GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  let failed = false
  for (const issueNumber of issueNumbers) {
    const res = await fetch(`${API_ROOT}/issues/${issueNumber}`, { headers })
    const issueBody = res.ok ? (await res.json()).body : undefined
    const riskLevel = extractRiskLevel(issueBody)?.level
    const result = checkEnabledLabelAllowed({ labels, riskLevel, issueNumber })
    if (!result.allowed) {
      console.error(`::error::risk-controls: ${result.reason}`)
      failed = true
    } else {
      console.log(`risk-controls: ${result.reason}`)
    }
  }

  if (failed) process.exitCode = 1
}

// GITHUB_EVENT_PATH est posé à chaque étape de chaque job Actions, y
// compris `pnpm test` — même garde qu'ailleurs (scripts/close-linked-
// issues.mjs, #161) pour que l'import de ce module par son propre fichier
// de test ne lance jamais main().
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
