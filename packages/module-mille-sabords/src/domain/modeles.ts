import { z } from 'zod'
import { LancerDesSchema, type LancerDes } from './lancerDes'

/**
 * The `type` discriminant is the on-disk one: kotlinx.serialization wrote the
 * sealed-class discriminator under that key, so the values below are the ones
 * already sitting in players' localStorage and must not be renamed.
 */
export interface CoupCalculateur {
  readonly type: 'calculateur'
  readonly joueur: string
  readonly carte: string
  readonly des: LancerDes
  readonly score: number
  readonly details: string
  readonly bust: boolean
  readonly ileCranes: boolean
  /** Negative, per opponent; 0 otherwise. */
  readonly penaliteIle: number
  readonly magiquePirate: boolean
}

export interface CoupManuel {
  readonly type: 'manuel'
  readonly joueur: string
  /** Value entered before the multiplier. */
  readonly scoreEntre: number
  /** 1 or 2. */
  readonly multiplicateur: number
  /** scoreEntre × multiplicateur. */
  readonly score: number
}

export interface CoupIleCranes {
  readonly type: 'ile'
  readonly joueur: string
  readonly nombreCranes: number
  /** Negative. */
  readonly penaliteParAdversaire: number
  readonly multiplicateur: number
}

export type EvenementCoup = CoupCalculateur | CoupManuel | CoupIleCranes

/**
 * Net contribution of this move to player [nom]'s score.
 * An island penalty hits the opponents, never the player who rolled it.
 */
export function contributionPour(coup: EvenementCoup, nom: string): number {
  switch (coup.type) {
    case 'calculateur':
      return coup.joueur === nom ? coup.score : coup.ileCranes ? coup.penaliteIle : 0
    case 'manuel':
      return coup.joueur === nom ? coup.score : 0
    case 'ile':
      return coup.joueur !== nom ? coup.penaliteParAdversaire : 0
  }
}

export const CoupCalculateurSchema = z.object({
  type: z.literal('calculateur'),
  joueur: z.string(),
  carte: z.string(),
  des: LancerDesSchema,
  score: z.number().int(),
  details: z.string(),
  bust: z.boolean(),
  ileCranes: z.boolean(),
  penaliteIle: z.number().int(),
  magiquePirate: z.boolean(),
})

export const CoupManuelSchema = z.object({
  type: z.literal('manuel'),
  joueur: z.string(),
  scoreEntre: z.number().int(),
  multiplicateur: z.number().int(),
  score: z.number().int(),
})

export const CoupIleCranesSchema = z.object({
  type: z.literal('ile'),
  joueur: z.string(),
  nombreCranes: z.number().int(),
  penaliteParAdversaire: z.number().int(),
  multiplicateur: z.number().int(),
})

export const EvenementCoupSchema = z.discriminatedUnion('type', [
  CoupCalculateurSchema,
  CoupManuelSchema,
  CoupIleCranesSchema,
])

/** Value object returned by the CalculateurScore service. */
export interface ResultatScore {
  readonly score: number
  readonly details: string
  readonly bust: boolean
  readonly ileCranes: boolean
  readonly nombreCranes: number
  readonly penaliteIle: number
  readonly magiquePirate: boolean
}

/** A player's final score at the end of a game. */
export interface ResultatJoueur {
  readonly nom: string
  readonly score: number
  readonly indexCouleur: number
}

export const ResultatJoueurSchema = z.object({
  nom: z.string(),
  score: z.number().int(),
  indexCouleur: z.number().int(),
})

/** Snapshot of a finished game, kept in the history. */
export interface PartieTerminee {
  /** Unique identifier (crypto.randomUUID in the browser). */
  readonly uuid: string
  readonly horodatage: number
  /** Sorted by descending score. */
  readonly classement: readonly ResultatJoueur[]
  readonly nombreManches: number
  readonly magiquePirate: boolean
  /** Full history (event sourcing). */
  readonly coups: readonly EvenementCoup[]
}

/** The defaults mirror the Kotlin ones: older snapshots simply lack those keys. */
export const PartieTermineeSchema = z.object({
  uuid: z.string().default(''),
  horodatage: z.number().int(),
  classement: z.array(ResultatJoueurSchema),
  nombreManches: z.number().int(),
  magiquePirate: z.boolean().default(false),
  coups: z.array(EvenementCoupSchema).default([]),
})
