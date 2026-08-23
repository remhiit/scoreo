import { MilleSabordsModuleDataSchema, replayPartie } from '../../application/moduleResult'
import { calculerScore } from '../../domain/calculateurScore'
import { avecValeur, totalDes, valeurDe, LANCER_DES_VIDE } from '../../domain/lancerDes'
import type { EvenementCoup } from '../../domain/modeles'
import type { Partie } from '../../domain/partie'
import {
  MilleSabordsDraftSchema,
  DRAFT_VERSION,
  type MilleSabordsAction,
  type MilleSabordsDraft,
  type MilleSabordsState,
} from './milleSabordsModuleTypes'

/** What `reinitialiserTour` cleared between two coups in the Kotlin app. */
const TOUR_VIERGE = {
  des: LANCER_DES_VIDE,
  carte: 'none',
  scoreManuel: '0',
  multiplicateur: 1,
} as const

/** Matches Kotlin's `String.toIntOrNull()`: digits only, no whitespace, no decimals. */
function versEntier(valeur: string): number | undefined {
  return /^-?\d+$/.test(valeur) ? Number(valeur) : undefined
}

export function etatVierge(playerIds: readonly string[]): MilleSabordsState {
  return {
    joueurs: [...playerIds],
    historique: [],
    tab: 'calc',
    finDemandee: false,
    confirmationAbandon: false,
    ...TOUR_VIERGE,
  }
}

/**
 * Reads a persisted payload — a draft, or the `moduleData` of a match being
 * reopened — without ever trusting it.
 *
 * The host stores both opaquely, so what comes back may have been written by an
 * older version of this module, hand-edited, or truncated by a browser that ran
 * out of quota. Anything the schema rejects yields `undefined`, and the caller
 * starts a clean game rather than rendering half a state.
 */
function lireCharge(charge: unknown): Omit<MilleSabordsDraft, 'version'> | undefined {
  const brouillon = MilleSabordsDraftSchema.safeParse(charge)
  if (brouillon.success) return brouillon.data

  // A reopened match carries only the game itself — no turn was in progress
  // when it was saved.
  const sauvegarde = MilleSabordsModuleDataSchema.safeParse(charge)
  if (!sauvegarde.success) return undefined
  return {
    joueurs: sauvegarde.data.joueurs,
    historique: sauvegarde.data.historique,
    tab: 'calc',
    finDemandee: false,
    ...TOUR_VIERGE,
  }
}

function memeTable(restaures: readonly string[], playerIds: readonly string[]): boolean {
  return (
    restaures.length === playerIds.length && restaures.every((id, index) => id === playerIds[index])
  )
}

/**
 * Restores a game in progress, or starts a fresh one.
 *
 * A payload is only reused when it was recorded for exactly these players, in
 * this order: scores are attributed by player id inside the coups, so replaying
 * a history against a different table would credit points to nobody and quietly
 * change everyone's total.
 */
export function etatInitial(playerIds: readonly string[], charge: unknown): MilleSabordsState {
  const restaure = lireCharge(charge)
  if (restaure === undefined || !memeTable(restaure.joueurs, playerIds)) {
    return etatVierge(playerIds)
  }
  const attables = new Set(playerIds)
  if (restaure.historique.some((coup) => !attables.has(coup.joueur))) {
    return etatVierge(playerIds)
  }
  return {
    joueurs: [...playerIds],
    historique: restaure.historique,
    tab: restaure.tab,
    des: restaure.des,
    carte: restaure.carte,
    scoreManuel: restaure.scoreManuel,
    multiplicateur: restaure.multiplicateur,
    finDemandee: restaure.finDemandee,
    confirmationAbandon: false,
  }
}

export function versBrouillon(state: MilleSabordsState): MilleSabordsDraft {
  return {
    version: DRAFT_VERSION,
    joueurs: [...state.joueurs],
    historique: [...state.historique],
    tab: state.tab,
    des: state.des,
    carte: state.carte,
    scoreManuel: state.scoreManuel,
    multiplicateur: state.multiplicateur,
    finDemandee: state.finDemandee,
  }
}

export function partieDeLEtat(state: MilleSabordsState): Partie {
  return replayPartie(state.joueurs, state.historique)
}

/** Whose turn it is — the seat the aggregate points at, never a stored index. */
export function joueurActuel(state: MilleSabordsState): string {
  return state.joueurs[partieDeLEtat(state).indexJoueurActuel]
}

/** True once the game is over: the last round was played, Magie Pirate, or the players stopped. */
export function estFinie(state: MilleSabordsState, partie: Partie): boolean {
  return state.finDemandee || partie.estTerminee()
}

function enregistrerCoup(state: MilleSabordsState, coup: EvenementCoup): MilleSabordsState {
  return { ...state, historique: [...state.historique, coup], ...TOUR_VIERGE }
}

export function milleSabordsModuleReducer(
  state: MilleSabordsState,
  action: MilleSabordsAction,
): MilleSabordsState {
  switch (action.type) {
    case 'selectTab':
      return { ...state, tab: action.tab }

    case 'changeDie': {
      // A hand can only ever hold eight dice, and a count cannot go negative.
      const suivant = valeurDe(state.des, action.de) + action.delta
      const total = totalDes(state.des) + action.delta
      if (suivant < 0 || suivant > 8 || total < 0 || total > 8) return state
      return { ...state, des: avecValeur(state.des, action.de, suivant) }
    }

    case 'selectCard':
      return { ...state, carte: action.carte }

    case 'submitCalcScore': {
      const resultat = calculerScore(state.des, state.carte)
      return enregistrerCoup(state, {
        type: 'calculateur',
        joueur: joueurActuel(state),
        carte: state.carte,
        des: state.des,
        score: resultat.score,
        details: resultat.details,
        bust: resultat.bust,
        ileCranes: resultat.ileCranes,
        penaliteIle: resultat.penaliteIle,
        magiquePirate: resultat.magiquePirate,
      })
    }

    case 'updateManualScore':
      return { ...state, scoreManuel: action.value }

    case 'quickScore': {
      // The quick buttons add up, so a hand worth several bonuses is entered by
      // tapping each of them rather than doing the arithmetic.
      const actuel = versEntier(state.scoreManuel) ?? 0
      return { ...state, scoreManuel: String(actuel + action.points) }
    }

    case 'toggleMultiplier':
      return { ...state, multiplicateur: state.multiplicateur === 1 ? 2 : 1 }

    case 'resetManualScore':
      return { ...state, scoreManuel: '0', multiplicateur: 1 }

    case 'submitManualScore': {
      const saisi = versEntier(state.scoreManuel)
      if (saisi === undefined) return state
      return enregistrerCoup(state, {
        type: 'manuel',
        joueur: joueurActuel(state),
        scoreEntre: saisi,
        multiplicateur: state.multiplicateur,
        score: saisi * state.multiplicateur,
      })
    }

    case 'quickSkullIsland':
      return enregistrerCoup(state, {
        type: 'ile',
        joueur: joueurActuel(state),
        nombreCranes: action.cranes,
        penaliteParAdversaire: -(action.cranes * 100) * state.multiplicateur,
        multiplicateur: state.multiplicateur,
      })

    case 'undoLast': {
      if (state.historique.length === 0) return state
      const partie = partieDeLEtat(state)
      partie.annulerDernier()
      return {
        ...state,
        historique: [...partie.historique],
        // Undoing is how a mis-tapped final coup is taken back, so it also
        // cancels an early stop the players had asked for.
        finDemandee: false,
        ...TOUR_VIERGE,
      }
    }

    case 'requestEnd':
      return { ...state, finDemandee: true }

    case 'resumeGame':
      return { ...state, finDemandee: false }

    case 'showAbandonConfirm':
      return { ...state, confirmationAbandon: true }

    case 'dismissAbandonConfirm':
      return { ...state, confirmationAbandon: false }
  }
}
