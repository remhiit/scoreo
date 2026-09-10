#!/usr/bin/env node
// Rapport de calibration du routage (issue #481, tranche 6/6 de #407,
// doc/technical/automation-plan.md § « Calibration du routage »).
// Confronte les enregistrements `RunMetrics` (#477) déjà publiés dans le
// journal du coordinateur à la politique de routage courante
// (`.automation/routing-policy.yml`) et **propose** des ajustements de
// poids/seuils — ne les applique jamais (principe directeur §2.2, aucune
// décision d'automatisation prise par un LLM sans validation humaine).
// Fonctions pures, zéro effet de bord, zéro appel réseau, même précédent que
// `scripts/routing-budget.mjs`/`scripts/routing-activation.mjs`, dont ce
// module ne dépend d'ailleurs pas : il consomme leur sortie (`RunMetrics`),
// jamais leur logique. Consommé par `weekly-report/SKILL.md` (R6) — jamais
// une routine ni un déclencheur séparé (hors scope de #481).
//
// `aggregateRunMetrics` groupe par le champ `routine` de chaque
// enregistrement tel quel — un nom de routine de **dispatch**
// (`.automation/routines.yml`, ex: `coordinator`), pas nécessairement
// l'espace de noms `routing-policy.yml#routines` (ex: `implement-task`),
// même distinction que `scripts/routing-budget.mjs` documente déjà pour
// `budgets.<routine>`. `proposeCalibration` cherche
// `policy.routines[group.routine]` directement : un groupe dont le nom de
// routine n'existe pas dans cet espace de noms (le cas de `coordinator`
// aujourd'hui, tant qu'aucun ticket ne réconcilie les deux espaces de noms)
// ne produit donc aucune proposition, motif nommé plutôt que deviné.
import { validateRunMetrics } from './run-metrics.mjs'

export const CALIBRATION_VERSION = 1

// Seuils de signal du moteur de calibration — arbitraires mais documentés
// (doc/automation/model-routing.md § Calibration), volontairement prudents
// pour une première version : sous `ciGreenLow`, la bande sous-performe
// (motif de durcissement du `min_score`) ; au-dessus de `ciGreenHigh` avec
// zéro escalade, elle performe assez bien pour desserrer le seuil et
// renforcer le poids du candidat déjà majoritairement proposé. Exporté pour
// que les appelants/tests le référencent plutôt que de dupliquer ces
// nombres.
export const CALIBRATION_THRESHOLDS = Object.freeze({
  minSampleSize: 5,
  ciGreenLow: 0.5,
  ciGreenHigh: 0.9,
  minScoreStep: 5,
  weightStep: 10,
})

function groupKey(routine, band) {
  return `${routine} ${band}`
}

function pickMajorityModel(counts) {
  const entries = Object.entries(counts ?? {})
  if (entries.length === 0) return null
  entries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return entries[0][0]
}

// Regroupe des enregistrements `RunMetrics` par routine et par bande de
// complexité (issue #481, critère d'acceptation « aggregateRunMetrics »).
// Un enregistrement illisible ou hors schéma (`validateRunMetrics` invalide,
// y compris `null`/non-objet) est ignoré, jamais agrégé même partiellement,
// et compté dans `rejected`. `since`, optionnel (ISO 8601, comparaison
// lexicographique suffisante pour ce format), limite la fenêtre sur
// `generatedAt` — un enregistrement hors fenêtre est simplement écarté,
// jamais compté comme rejeté (ce n'est pas un défaut de l'enregistrement).
//
// Un enregistrement `complete: false` (#477) reste groupé (par routine et,
// quand connue, par bande) pour que `incompleteRuns` en rende compte, mais
// n'entre jamais dans les moyennes du groupe — `complete: true` garantit
// déjà (buildRunMetrics) que `complexity`, `outcome.fixIterations` et
// `outcome.ciGreenFirstPass` sont renseignés, donc jamais null pour un
// enregistrement complet.
export function aggregateRunMetrics(records, { since = null } = {}) {
  const stats = new Map()
  let rejected = 0
  let completeRecords = 0
  let incompleteRecords = 0

  const getStats = (routine, band) => {
    const key = groupKey(routine, band)
    let entry = stats.get(key)
    if (!entry) {
      entry = {
        routine,
        band,
        totalRuns: 0,
        incompleteRuns: 0,
        ciGreenCount: 0,
        fixIterationsSum: 0,
        escalatedCount: 0,
        proposedModels: {},
        actualModels: {},
      }
      stats.set(key, entry)
    }
    return entry
  }

  for (const record of Array.isArray(records) ? records : []) {
    const { valid } = validateRunMetrics(record)
    if (!valid) {
      rejected += 1
      continue
    }
    if (since && record.generatedAt < since) {
      continue
    }

    const band = record.complexity?.band ?? 'unknown'
    const entry = getStats(record.routine, band)

    if (!record.complete) {
      incompleteRecords += 1
      entry.incompleteRuns += 1
      continue
    }

    completeRecords += 1
    entry.totalRuns += 1
    if (record.outcome.ciGreenFirstPass) entry.ciGreenCount += 1
    entry.fixIterationsSum += record.outcome.fixIterations
    if (record.outcome.escalation !== null) entry.escalatedCount += 1

    const proposedModel = record.routing?.proposedModel
    if (proposedModel) entry.proposedModels[proposedModel] = (entry.proposedModels[proposedModel] ?? 0) + 1
    const actualModel = record.routing?.actualModel
    if (actualModel) entry.actualModels[actualModel] = (entry.actualModels[actualModel] ?? 0) + 1
  }

  const groups = [...stats.values()]
    .sort((a, b) => a.routine.localeCompare(b.routine) || a.band.localeCompare(b.band))
    .map(({ ciGreenCount, fixIterationsSum, escalatedCount, ...rest }) => ({
      ...rest,
      ciGreenFirstPassRate: rest.totalRuns > 0 ? ciGreenCount / rest.totalRuns : null,
      avgFixIterations: rest.totalRuns > 0 ? fixIterationsSum / rest.totalRuns : null,
      escalatedRate: rest.totalRuns > 0 ? escalatedCount / rest.totalRuns : null,
    }))

  return {
    since,
    rejected,
    completeRecords,
    incompleteRecords,
    // Jamais des moyennes calculées sur zéro run (issue #481, critère
    // d'acceptation « période sans aucun enregistrement complet ») : ce
    // drapeau dit explicitement qu'aucun groupe ci-dessus ne porte de
    // moyenne exploitable, plutôt que de laisser un lecteur le déduire de
    // `groups` étant vide ou de chaque taux étant `null`.
    insufficientData: completeRecords === 0,
    groups,
  }
}

function minScoreProposal(routine, band, { currentValue, proposedValue, metric }) {
  if (proposedValue === currentValue) return null
  return {
    configKey: `routines.${routine}.bands.${band}.min_score`,
    currentValue,
    proposedValue,
    metric,
    proposalVersion: CALIBRATION_VERSION,
  }
}

// Propose des ajustements de poids/seuils de `.automation/routing-policy.yml`
// à partir d'un agrégat déjà produit par `aggregateRunMetrics` (issue #481,
// critère d'acceptation « proposeCalibration ») — jamais appliqués, jamais
// une écriture de fichier : chaque proposition porte la clé de config visée,
// sa valeur actuelle (lue dans `policy`), la valeur proposée, la mesure qui
// la motive et un identifiant de version de proposition
// (`CALIBRATION_VERSION`, le format de ce type de proposition, pas un
// numéro unique par proposition).
//
// Deux garde-fous, chacun consigné dans `skipped` avec son motif plutôt que
// silencieusement omis : un groupe sous `minSampleSize` (par défaut
// `CALIBRATION_THRESHOLDS.minSampleSize`) ne produit aucune proposition —
// jamais de calibration sur un échantillon trop mince — et un groupe dont
// aucun signal ne dépasse les seuils de `CALIBRATION_THRESHOLDS` ne produit
// aucune proposition non plus, avec un motif qui le dit explicitement
// plutôt que d'omettre la section (issue #481, comportement d'erreur
// « aucun ajustement justifié »).
export function proposeCalibration(aggregate, policy, { minSampleSize = CALIBRATION_THRESHOLDS.minSampleSize } = {}) {
  const proposals = []
  const skipped = []

  for (const group of aggregate?.groups ?? []) {
    const { routine, band, totalRuns, ciGreenFirstPassRate, escalatedRate, proposedModels } = group

    if (totalRuns < minSampleSize) {
      skipped.push({
        routine,
        band,
        reason: `échantillon insuffisant (${totalRuns} run(s) complet(s), sous le seuil ${minSampleSize}) — pas de calibration sur un échantillon trop mince`,
      })
      continue
    }

    if (band === 'unknown') {
      skipped.push({ routine, band, reason: 'bande de complexité inconnue pour ce groupe — aucune politique associable' })
      continue
    }

    const bandPolicy = policy?.routines?.[routine]?.bands?.[band]
    if (!bandPolicy) {
      skipped.push({
        routine,
        band,
        reason: `aucune politique de routage pour la routine "${routine}" / bande "${band}" dans .automation/routing-policy.yml`,
      })
      continue
    }

    const groupProposals = []
    // Distingue « aucun signal » de « signal détecté mais min_score déjà à
    // sa borne, rien de plus à proposer » — sans ça, ce second cas retombe
    // sur le motif générique ci-dessous et masque le vrai signal détecté
    // (retour de revue sur #492).
    let minScoreAtBound = null

    if (ciGreenFirstPassRate < CALIBRATION_THRESHOLDS.ciGreenLow) {
      const proposedValue = Math.min(100, bandPolicy.min_score + CALIBRATION_THRESHOLDS.minScoreStep)
      const metric = `CI verte au premier passage : ${Math.round(ciGreenFirstPassRate * 100)}% sur ${totalRuns} runs complets (sous ${Math.round(CALIBRATION_THRESHOLDS.ciGreenLow * 100)}%)`
      const proposal = minScoreProposal(routine, band, { currentValue: bandPolicy.min_score, proposedValue, metric })
      if (proposal) {
        groupProposals.push(proposal)
      } else {
        minScoreAtBound = `${metric}, mais min_score est déjà au plafond (${bandPolicy.min_score}) — rien à durcir davantage`
      }
    } else if (ciGreenFirstPassRate > CALIBRATION_THRESHOLDS.ciGreenHigh && escalatedRate === 0) {
      const proposedValue = Math.max(0, bandPolicy.min_score - CALIBRATION_THRESHOLDS.minScoreStep)
      const metric = `CI verte au premier passage : ${Math.round(ciGreenFirstPassRate * 100)}% sur ${totalRuns} runs complets, aucune escalade (au-dessus de ${Math.round(CALIBRATION_THRESHOLDS.ciGreenHigh * 100)}%)`
      const proposal = minScoreProposal(routine, band, { currentValue: bandPolicy.min_score, proposedValue, metric })
      if (proposal) {
        groupProposals.push(proposal)
      } else {
        minScoreAtBound = `${metric}, mais min_score est déjà au plancher (${bandPolicy.min_score}) — rien à desserrer davantage`
      }

      // Renforce le candidat déjà majoritairement proposé quand la bande
      // performe très bien — jamais l'inverse : ce moteur ne propose aucun
      // affaiblissement de poids, seulement consolider ce qui marche déjà.
      const majorityModel = pickMajorityModel(proposedModels)
      const candidateEntries = Object.entries(bandPolicy.candidates ?? {})
      const candidateEntry = majorityModel && candidateEntries.length > 1 ? candidateEntries.find(([, c]) => c.model === majorityModel) : null
      if (candidateEntry) {
        const [candidateKey, candidate] = candidateEntry
        const proposedWeight = Math.min(100, candidate.weight + CALIBRATION_THRESHOLDS.weightStep)
        if (proposedWeight !== candidate.weight) {
          groupProposals.push({
            configKey: `routines.${routine}.bands.${band}.candidates.${candidateKey}.weight`,
            currentValue: candidate.weight,
            proposedValue: proposedWeight,
            metric: `Modèle proposé majoritaire "${majorityModel}" (${proposedModels[majorityModel]}/${totalRuns} runs), CI verte ${Math.round(ciGreenFirstPassRate * 100)}%, aucune escalade`,
            proposalVersion: CALIBRATION_VERSION,
          })
        }
      }
    }

    if (groupProposals.length === 0) {
      skipped.push({
        routine,
        band,
        reason:
          minScoreAtBound ??
          `aucun ajustement justifié par les données (CI verte ${Math.round(ciGreenFirstPassRate * 100)}%, escalade ${Math.round(escalatedRate * 100)}% sur ${totalRuns} runs)`,
      })
    } else {
      proposals.push(...groupProposals)
    }
  }

  return { version: CALIBRATION_VERSION, proposals, skipped }
}
