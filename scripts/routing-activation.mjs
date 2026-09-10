#!/usr/bin/env node
// Matrice d'activation du routage par sous-agent (issue #476, tranche 1/6 de
// #407 — doc/technical/automation-plan.md §5 « Passage du dry-run à
// l'activation contrôlée »). Remplace le drapeau global `dry_run` de #406
// par une résolution fine (routine × bande de complexité × niveau de
// risque) → `observe` ou `apply`, déclarée dans la section `activation` de
// `.automation/routing-policy.yml`, à côté de la section `routines` dont
// elle réutilise le même espace de noms (les clés `activation.<routine>`
// sont les mêmes noms de politique que `routing-policy.yml#routines`,
// jamais les noms de `.automation/routines.yml`). Fonction pure, zéro effet
// de bord, zéro appel réseau — même précédent que le reste de ce contrat
// (scripts/routing-dry-run.mjs, scripts/model-router.mjs), dont
// resolveRoutingDryRun est le seul appelant prévu.
//
// Trois garde-fous de sûreté, non contournables par la déclaration de la
// matrice elle-même, dans l'ordre de priorité où ils sont évalués :
// - `policy.rollback: true` (issue #480, tranche 5/6 de #407) force
//   toujours "observe", priorité la plus haute — évalué avant le garde-fou
//   de risque ci-dessous, jamais contredit par lui ni par la matrice ;
// - un risque "high" résout toujours "observe", quelle que soit la
//   déclaration — l'activation sur risque élevé a sa propre tranche, avec
//   ses propres garde-fous, hors scope ici ;
// - un triplet non déclaré résout toujours "observe" — l'absence de
//   déclaration n'active jamais rien.
//
// La matrice livrée par cette tranche déclare "observe" partout : elle ne
// change le modèle d'aucune routine, elle se contente de remplacer le
// mécanisme. Le passage réel de tel triplet à "apply" est un geste de
// configuration séparé et ultérieur.
export const ROUTING_ACTIVATION_VERSION = 1

const ROUTING_POLICY_PATH = '.automation/routing-policy.yml'
const VALID_MODES = ['observe', 'apply']
// Miroir à la main de .automation/complexity-thresholds.yml (même précédent
// que scripts/automation-dispatch.mjs#COMPLEXITY_BANDS et
// scripts/model-router.mjs#COMPLEXITY_BANDS — même sous-ensemble minimal de
// YAML, pas de dépendance croisée entre ces modules pour quatre valeurs
// fixes).
const COMPLEXITY_BANDS = ['trivial', 'standard', 'complex', 'very-complex']

function observe(reason) {
  return { mode: 'observe', reason }
}

// Résout le mode d'activation d'un triplet contre `policy.activation`
// (`.automation/routing-policy.yml` déjà chargé — même forme que reçue par
// scripts/model-router.mjs#routeModel). `routine` doit être une clé de
// `policy.routines` (la validation « au démarrage » de la matrice entière —
// mode/routine/bande — est aussi effectuée en amont, à la config, par
// scripts/automation-dispatch.mjs#validateRoutingPolicy et le job CI
// `automation-config` ; cette fonction revalide en défense en profondeur le
// seul triplet qu'on lui demande de résoudre, avec le même message
// nommant le fichier et la clé fautive).
export function resolveActivation(policy, { routine, band, riskLevel }) {
  if (!routine || typeof routine !== 'string' || !policy?.routines?.[routine]) {
    throw new Error(`${ROUTING_POLICY_PATH}: routines.${routine}: routine inconnue — absente de "routines"`)
  }
  if (!COMPLEXITY_BANDS.includes(band)) {
    throw new Error(
      `${ROUTING_POLICY_PATH}: activation.${routine}.${band}: bande inconnue — absente de .automation/complexity-thresholds.yml`,
    )
  }
  // Défense en profondeur (issue #480) : même validation que
  // scripts/automation-dispatch.mjs#validateRoutingPolicy, revalidée ici
  // pour le seul appel qu'on lui demande de résoudre — une valeur non
  // booléenne n'est jamais interprétée comme `false`.
  if (policy?.rollback !== undefined && typeof policy.rollback !== 'boolean') {
    throw new Error(`${ROUTING_POLICY_PATH}: rollback: doit être un booléen (valeur: ${JSON.stringify(policy.rollback)})`)
  }

  // Structurellement avant les deux garde-fous booléens ci-dessous (rollback,
  // puis risque high) et non contournable par eux : une matrice incohérente
  // échoue toujours bruyamment, y compris sous rollback actif ou risque high
  // — jamais résolue implicitement en "observe" pour la faire disparaître.
  // Même position relative que le garde-fou risque high avant #480 ; en
  // pratique inatteignable dans une politique mergée, puisque le même refus
  // est déjà posé en amont par scripts/automation-dispatch.mjs#validateRoutingPolicy
  // et le job CI `automation-config` avant qu'un triplet ne puisse être résolu ici.
  const declared = policy?.activation?.[routine]?.[band]
  if (declared !== undefined && !VALID_MODES.includes(declared)) {
    throw new Error(
      `${ROUTING_POLICY_PATH}: activation.${routine}.${band}: mode inconnu "${declared}" (doit être "observe" ou "apply")`,
    )
  }

  // Garde-fou de priorité la plus haute (issue #480, critère d'acceptation
  // « aucune déclaration de la matrice ne peut le contredire ») : évalué
  // avant même le garde-fou de risque ci-dessous, qui ne s'applique donc
  // jamais tant que le rollback est actif — la `reason` cite toujours le
  // rollback plutôt qu'une règle qui n'a pas eu l'occasion de trancher.
  if (policy?.rollback === true) {
    return observe(
      `rollback actif (${ROUTING_POLICY_PATH}: rollback: true) — tous les triplets forcés en "observe", quelle que soit la déclaration de la matrice ou le niveau de risque`,
    )
  }

  // Garde-fou non contournable (issue #476, critère d'acceptation « un
  // risque high résout toujours observe ») : évalué avant toute lecture de
  // la déclaration pour piloter la décision, mais la déclaration écartée
  // reste nommée dans la raison plutôt que silencieusement ignorée.
  if (riskLevel === 'high') {
    if (declared === 'apply') {
      return observe(
        `risque "high" force "observe" — déclaration "apply" de activation.${routine}.${band} écartée (garde-fou risque élevé, tranche propre à venir)`,
      )
    }
    return observe(
      'risque "high" force toujours "observe" dans cette tranche, quelle que soit la déclaration de la matrice',
    )
  }

  if (declared === undefined) {
    if (!policy?.activation || Object.keys(policy.activation).length === 0) {
      return observe(`section "activation" absente ou vide de ${ROUTING_POLICY_PATH} — non déclaré vaut "observe"`)
    }
    return observe(
      `aucune déclaration "activation.${routine}.${band}" dans ${ROUTING_POLICY_PATH} — triplet non couvert, "observe" par défaut`,
    )
  }

  return { mode: declared, reason: `activation.${routine}.${band} déclare "${declared}"` }
}

// Détecte la transition « rollback intervenu pendant ce run » (issue #490,
// suivi explicite de #480 — voir doc/automation/model-routing.md §
// « Rollback » / « Run en vol : le journal le signale explicitement »).
// `openedRollback` est la valeur de `policy.rollback` capturée à l'ouverture
// du journal (.claude/skills/coordinator/SKILL.md § « Routage » étape 5,
// `rollbackAtOpen`) ; `closedRollback` est la même valeur relue depuis le
// disque à la fermeture (§ « Converged » étape 4 / § Escalade étape 3).
// Fonction pure, contrôle à deux points (pas une surveillance continue) :
// ne détecte que la transition faux/absent → vrai, jamais un rollback déjà
// actif à l'ouverture (`true → true`, déjà couvert par la `reason` de
// resolveActivation ci-dessus, pas par ce champ) ni une oscillation
// `false → true → false` entièrement résorbée avant la fermeture — limite
// connue, documentée dans doc/automation/model-routing.md § « Rollback ».
export function detectRollbackDuringRun(openedRollback, closedRollback) {
  return !openedRollback && closedRollback === true
}
