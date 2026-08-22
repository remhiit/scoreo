import { z } from 'zod'

/**
 * Immutable value object describing the dice rolled during a turn.
 * Every field is read-only — a change produces a copy.
 */
export interface LancerDes {
  readonly cranes: number
  readonly diamants: number
  readonly or: number
  readonly singes: number
  readonly perroquets: number
  readonly sabres: number
}

export const LANCER_DES_VIDE: LancerDes = {
  cranes: 0,
  diamants: 0,
  or: 0,
  singes: 0,
  perroquets: 0,
  sabres: 0,
}

/** Builds a roll, every unnamed die defaulting to 0 as the Kotlin data class did. */
export function lancerDes(valeurs: Partial<LancerDes> = {}): LancerDes {
  return { ...LANCER_DES_VIDE, ...valeurs }
}

export function totalDes(des: LancerDes): number {
  return des.cranes + des.diamants + des.or + des.singes + des.perroquets + des.sabres
}

/** Reads a die count by its HTML identifier. */
export function valeurDe(des: LancerDes, id: string): number {
  switch (id) {
    case 'skulls':
      return des.cranes
    case 'diamonds':
      return des.diamants
    case 'gold':
      return des.or
    case 'monkeys':
      return des.singes
    case 'parrots':
      return des.perroquets
    case 'sabers':
      return des.sabres
    default:
      return 0
  }
}

/** Returns a new roll with the identified die updated. */
export function avecValeur(des: LancerDes, id: string, valeur: number): LancerDes {
  switch (id) {
    case 'skulls':
      return { ...des, cranes: valeur }
    case 'diamonds':
      return { ...des, diamants: valeur }
    case 'gold':
      return { ...des, or: valeur }
    case 'monkeys':
      return { ...des, singes: valeur }
    case 'parrots':
      return { ...des, perroquets: valeur }
    case 'sabers':
      return { ...des, sabres: valeur }
    default:
      return des
  }
}

/**
 * Every die defaults to 0: kotlinx.serialization omitted default values when
 * writing, so rolls already in players' localStorage are missing those keys.
 */
export const LancerDesSchema = z.object({
  cranes: z.number().int().default(0),
  diamants: z.number().int().default(0),
  or: z.number().int().default(0),
  singes: z.number().int().default(0),
  perroquets: z.number().int().default(0),
  sabres: z.number().int().default(0),
})
