#!/usr/bin/env node
// Contrat d'arbitrage (issue #497, tranche 1/5 de l'épic #496 — doc/
// technical/automation-plan.md §2, amendement du principe directeur).
// Avant cette tranche, chacune des six conditions d'escalade du
// coordinateur (`.claude/skills/coordinator/SKILL.md` § Escalade) mène
// directement à `automation:needs-human`. #496 insère une étape d'arbitrage
// pour les deux conditions qui sont des *jugements* (spec ambiguë,
// #497 § condition 1 ; boucle de correctif non convergée, condition 3) —
// jamais pour un fait manquant, une panne, une configuration ou un
// garde-fou volontaire (budget), qui restent toujours des escalades
// directes.
//
// Fonctions pures, zéro effet de bord, zéro appel réseau — même précédent
// que scripts/routing-activation.mjs (#476) et scripts/review-verdict.mjs
// (#470), dont ce module reprend chacun un patron exact :
// - `resolveArbitration` a les mêmes garde-fous non contournables, dans le
//   même ordre de priorité, que `scripts/routing-activation.mjs#resolveActivation` :
//   `policy.rollback === true` d'abord, puis un risque `high`, puis
//   l'absence de déclaration — un motif non couvert par `arbitration`, ou
//   la section entière absente, résout toujours "observe".
// - `applyArbitrationVerdict` est la règle d'arbitrage qui prolonge
//   `scripts/review-verdict.mjs#computeReviewVerdict` : jamais une lecture
//   libre du coordinateur, un verdict d'arbitre validé applique
//   mécaniquement une des trois issues fermées.
//
// Aucun agent, aucun skill, aucun câblage dans le coordinateur ici — T2 de
// #496. Cette tranche n'a aucun appelant en production : la matrice
// `arbitration` livrée est entièrement en "observe" (voir
// .automation/routing-policy.yml).
import { normalizeFindingSummary } from './review-verdict.mjs'

const ROUTING_POLICY_PATH = '.automation/routing-policy.yml'
const VALID_MODES = ['observe', 'apply']

// Motifs de la condition 1 (spec ambiguë) : tranchés par `arbiter-lead`, qui
// ne lit que la spec de l'issue, `doc/functional/`, le diff et les findings
// du relecteur fonctionnel — jamais la review technique.
const LEAD_MOTIFS = ['spec-ambigue', 'finding-trop-vague', 'derive-vs-spec']
// Motifs de la condition 3 (boucle de correctif non convergée) : tranchés
// par `arbiter-expert`, qui ne lit jamais la spec de l'issue.
const EXPERT_MOTIFS = ['tentatives-epuisees', 'derive-vs-review', 'validation-rouge', 'findings-contradictoires']

// Espace fermé des motifs arbitrables — les autres conditions d'escalade
// (#2 relecteur manquant, #4 sous-agent hors service, #5 routage sans
// candidat, #6 budget dépassé, row #25 possession périmée du state-machine)
// restent des escalades directes, jamais arbitrées (doc/technical/
// automation-plan.md, épique #496, tableau « Ce que l'arbitre peut arbitrer
// — et ce qu'il ne peut pas »).
export const ARBITRABLE_MOTIFS = [...LEAD_MOTIFS, ...EXPERT_MOTIFS]

// Un motif inconnu n'est jamais arbitrable par défaut — la valeur sûre est
// l'escalade humaine (issue #497, cas limite « Motif inconnu »).
export function isArbitrableMotif(motif) {
  return ARBITRABLE_MOTIFS.includes(motif)
}

// Un seul arbitre par motif, jamais les deux — la sélection est mécanique,
// jamais un choix du coordinateur (#496 § « Les deux agents et leur ligne
// de partage »).
export function selectArbiter(motif) {
  if (LEAD_MOTIFS.includes(motif)) return 'arbiter-lead'
  if (EXPERT_MOTIFS.includes(motif)) return 'arbiter-expert'
  return null
}

// Même paire que RISK_LEVELS de scripts/risk-controls.mjs (#479) : la
// catégorie Faible/Élevé d'issue-to-spec, binaire à dessein. Mirroré à la
// main plutôt qu'importé — risk-controls.mjs ne l'exporte pas, et ce n'est
// pas davantage un fichier de config externe à refléter (contrairement à
// COMPLEXITY_BANDS ci-dessous, qui reflète .automation/complexity-
// thresholds.yml) : deux constantes locales à deux valeurs fixes ne
// justifient pas une dépendance croisée entre ces modules.
const RISK_LEVELS = ['low', 'high']

// Un niveau absent, vide ou hors de RISK_LEVELS est traité comme "high" —
// jamais comme "low" (issue #497, cas limite « riskLevel absent ou
// illisible ») — même précédent que scripts/risk-controls.mjs#normalizeRiskLevel.
function normalizeRiskLevel(riskLevel) {
  if (RISK_LEVELS.includes(riskLevel)) return { level: riskLevel, unreadable: false }
  return { level: 'high', unreadable: true }
}

function observe(reason) {
  return { mode: 'observe', reason }
}

// Résout le mode d'un motif arbitrable contre `policy.arbitration`
// (`.automation/routing-policy.yml` déjà chargé — même convention que
// scripts/routing-activation.mjs#resolveActivation, qui reçoit la
// politique entière plutôt qu'un chemin de fichier). Revalide en défense
// en profondeur le seul motif qu'on lui demande de résoudre — la
// validation « au démarrage » de la section entière est effectuée en amont
// par scripts/automation-dispatch.mjs#validateRoutingPolicy et le job CI
// `automation-config` (même patron à deux niveaux que resolveActivation).
export function resolveArbitration(policy, { motif, riskLevel }) {
  if (!isArbitrableMotif(motif)) {
    throw new Error(`${ROUTING_POLICY_PATH}: arbitration.${motif}: motif inconnu — absent de la liste des motifs arbitrables`)
  }
  // Même défense en profondeur que resolveActivation : une valeur non
  // booléenne n'est jamais interprétée comme `false`.
  if (policy?.rollback !== undefined && typeof policy.rollback !== 'boolean') {
    throw new Error(`${ROUTING_POLICY_PATH}: rollback: doit être un booléen (valeur: ${JSON.stringify(policy.rollback)})`)
  }

  const declared = policy?.arbitration?.[motif]
  if (declared !== undefined && !VALID_MODES.includes(declared)) {
    throw new Error(
      `${ROUTING_POLICY_PATH}: arbitration.${motif}: mode inconnu "${declared}" (doit être "observe" ou "apply")`,
    )
  }

  // Priorité la plus haute (#496 § « Rollback » : « aucun nouvel
  // interrupteur » — le même rollback global force aussi l'arbitrage en
  // "observe", non contournable par la matrice ni par le garde-fou de
  // risque ci-dessous, qui ne s'applique donc jamais tant qu'il est actif.
  if (policy?.rollback === true) {
    return observe(
      `rollback actif (${ROUTING_POLICY_PATH}: rollback: true) — arbitrage forcé en "observe" pour "${motif}", quelle que soit la déclaration de la matrice ou le niveau de risque`,
    )
  }

  // Garde-fou non contournable (#496 § « Les cinq garde-fous », #3 :
  // « Risque high → toujours observe », même garde-fou que resolveActivation
  // #476) : évalué avant toute lecture de la déclaration, qui reste
  // néanmoins nommée dans la raison plutôt que silencieusement ignorée.
  const { level, unreadable } = normalizeRiskLevel(riskLevel)
  if (level === 'high') {
    const riskNote = unreadable
      ? `niveau de risque illisible (${riskLevel === undefined ? 'absent' : JSON.stringify(riskLevel)}), traité comme "high" — jamais comme "low"`
      : 'risque "high"'
    if (declared === 'apply') {
      return observe(
        `${riskNote} force "observe" — déclaration "apply" de arbitration.${motif} écartée (garde-fou risque élevé)`,
      )
    }
    return observe(`${riskNote} force toujours "observe" pour l'arbitrage, quelle que soit la déclaration de la matrice`)
  }

  if (declared === undefined) {
    if (!policy?.arbitration || Object.keys(policy.arbitration).length === 0) {
      return observe(`section "arbitration" absente ou vide de ${ROUTING_POLICY_PATH} — non déclaré vaut "observe"`)
    }
    return observe(
      `aucune déclaration "arbitration.${motif}" dans ${ROUTING_POLICY_PATH} — motif non couvert, "observe" par défaut`,
    )
  }

  return { mode: declared, reason: `arbitration.${motif} déclare "${declared}"` }
}

const VALID_VERDICTS = ['resolve', 'override', 'escalate']
const VALID_ARBITERS = ['arbiter-lead', 'arbiter-expert']

// Valide un verdict d'arbitre contre le contrat documenté par
// schemas/automation/arbitration-verdict.schema.json — un verdict hors
// schéma, hors énumération, ou simplement pas un objet, est refusé (issue
// #497, critère d'acceptation). `instruction` n'est requis que pour
// `resolve`, `overriddenFinding` que pour `override` — jamais l'inverse
// (un `resolve` sans instruction ne débloque rien, un `override` sans
// cible ne désigne rien à écarter).
export function validateArbitrationVerdict(reply) {
  if (!reply || typeof reply !== 'object' || Array.isArray(reply)) {
    return { valid: false, errors: ['le verdict doit être un objet'] }
  }

  const errors = []
  if (!VALID_VERDICTS.includes(reply.verdict)) {
    errors.push(`verdict: doit être "resolve", "override" ou "escalate" (valeur: ${JSON.stringify(reply.verdict)})`)
  }
  if (!isArbitrableMotif(reply.motif)) {
    errors.push(`motif: "${reply.motif}" n'est pas un motif arbitrable`)
  }
  if (!VALID_ARBITERS.includes(reply.arbiter)) {
    errors.push(`arbiter: doit être "arbiter-lead" ou "arbiter-expert" (valeur: ${JSON.stringify(reply.arbiter)})`)
  }
  if (typeof reply.reasoning !== 'string' || reply.reasoning.trim().length === 0) {
    errors.push('reasoning: champ requis manquant')
  }
  if (typeof reply.sameModelAsRun !== 'boolean') {
    errors.push('sameModelAsRun: doit être un booléen')
  }
  if (reply.verdict === 'resolve' && (typeof reply.instruction !== 'string' || reply.instruction.trim().length === 0)) {
    errors.push('instruction: requis pour un verdict "resolve"')
  }
  if (
    reply.verdict === 'override' &&
    (typeof reply.overriddenFinding !== 'string' || reply.overriddenFinding.trim().length === 0)
  ) {
    errors.push('overriddenFinding: requis pour un verdict "override"')
  }

  return { valid: errors.length === 0, errors }
}

// Applique un verdict d'arbitre validé au `reviewVerdict` en cours (sortie
// de scripts/review-verdict.mjs#computeReviewVerdict) — jamais une
// interprétation du texte libre du verdict, une fonction pure sur un espace
// de sortie fermé (issue #497, critère d'acceptation).
//
// `resolve` → un tour de correctif supplémentaire, portant l'instruction de
// l'arbitre. `escalate` → l'escalade continue, enrichie de l'analyse de
// l'arbitre. `override` → converge seulement si plus aucun finding
// blocking/important ne reste en corpus une fois le finding désigné
// écarté ; sinon un tour de correctif reste nécessaire (écarter un finding
// n'a jamais pour effet de faire passer les autres). Un verdict refusé par
// validateArbitrationVerdict renvoie toujours `escalate`.
export function applyArbitrationVerdict(verdict, reviewVerdict) {
  const { valid, errors } = validateArbitrationVerdict(verdict)
  if (!valid) {
    return {
      action: 'escalate',
      reason: `verdict d'arbitre invalide (${errors.join(' ; ')}) — jamais interprété comme une décision`,
      instruction: null,
    }
  }

  if (verdict.verdict === 'resolve') {
    return {
      action: 'extra-fix-round',
      reason: `arbitre ${verdict.arbiter} : resolve (motif "${verdict.motif}") — ${verdict.reasoning}`,
      instruction: verdict.instruction,
    }
  }

  if (verdict.verdict === 'escalate') {
    return {
      action: 'escalate',
      reason: `arbitre ${verdict.arbiter} : escalate (motif "${verdict.motif}") — ${verdict.reasoning}`,
      instruction: null,
    }
  }

  // override — n'écarte que le finding désigné ; les autres findings
  // blocking/important en corpus, le cas échéant, restent (issue #497, cas
  // limite « override sur un reviewVerdict qui conserve d'autres findings
  // bloquants »).
  const targetKey = normalizeFindingSummary(verdict.overriddenFinding)
  const remainingBlocking = (reviewVerdict?.findings ?? []).some(
    (finding) =>
      normalizeFindingSummary(finding.summary) !== targetKey &&
      (finding.severity === 'blocking' || finding.severity === 'important'),
  )
  if (remainingBlocking) {
    return {
      action: 'extra-fix-round',
      reason: `override du finding "${verdict.overriddenFinding}" appliqué, mais d'autres findings bloquants/importants restent en corpus — un tour de correctif reste nécessaire`,
      instruction: null,
    }
  }
  return {
    action: 'converge',
    reason: `override du finding "${verdict.overriddenFinding}" appliqué — plus aucun finding bloquant/important en corpus`,
    instruction: null,
  }
}
