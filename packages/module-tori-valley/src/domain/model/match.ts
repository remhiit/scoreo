import {
  emptyObjectifPoints,
  LANDSCAPE_TYPES,
  type ObjectifCardSelection,
  type ObjectifPoints,
} from './landscape'
import {
  emptyObjectifInputs,
  emptyObjectifManual,
  type ObjectifInputsByLandscape,
  type ObjectifManualFlags,
} from './objectifCard'
import { emptyToriiCounts, scoreTorii, type ToriiCounts } from './torii'

/** VP for the highest-value unclaimed Parchemin token; 0 means none taken (rulebook p.6). */
export const PARCHEMIN_VALUES = [0, 3, 4, 5] as const
export type ParcheminValue = (typeof PARCHEMIN_VALUES)[number]

/** VP for holding the Pinceau token at end of game (rulebook p.7). */
export const PINCEAU_BONUS = 2

export interface PlayerResult {
  playerId: string
  toriiCounts: ToriiCounts
  parcheminValue: ParcheminValue
  hasPinceau: boolean
  /**
   * Points per landscape — the authoritative total, whether computed from
   * `objectifInputs` or typed by hand. `scorePlayerResult` reads only this.
   */
  objectifPoints: ObjectifPoints
  /** The counts `objectifPoints` was computed from, kept so edit mode shows them back. */
  objectifInputs: ObjectifInputsByLandscape
  /** Landscapes whose total was typed by hand instead of computed. */
  objectifManual: ObjectifManualFlags
}

export function emptyPlayerResult(playerId: string): PlayerResult {
  return {
    playerId,
    toriiCounts: emptyToriiCounts(),
    parcheminValue: 0,
    hasPinceau: false,
    objectifPoints: emptyObjectifPoints(),
    objectifInputs: emptyObjectifInputs(),
    objectifManual: emptyObjectifManual(),
  }
}

/** Total VP for one player: Torī series + Parchemin + Pinceau + Objectif cards (rulebook p.7). */
export function scorePlayerResult(result: PlayerResult): number {
  const toriiScore = scoreTorii(result.toriiCounts)
  const objectifScore = LANDSCAPE_TYPES.reduce((sum, type) => sum + result.objectifPoints[type], 0)
  const pinceauScore = result.hasPinceau ? PINCEAU_BONUS : 0
  return toriiScore + result.parcheminValue + pinceauScore + objectifScore
}

export interface Match {
  id: string
  playedAt: number
  playerIds: string[]
  results: PlayerResult[]
  /** Which Objectif card variant was dealt per landscape for this match. */
  objectifCards: ObjectifCardSelection
}

/**
 * Winner(s) of a finished match: highest total score; ties broken by most
 * Torī held, then by whoever holds the Pinceau; unresolved ties are shared
 * (rulebook p.7).
 */
export function matchWinners(match: Match): string[] {
  if (match.results.length === 0) return []
  const scored = match.results.map((result) => ({
    playerId: result.playerId,
    score: scorePlayerResult(result),
    toriiCount: Object.values(result.toriiCounts).reduce((sum, count) => sum + count, 0),
    hasPinceau: result.hasPinceau,
  }))
  const topScore = Math.max(...scored.map((s) => s.score))
  let contenders = scored.filter((s) => s.score === topScore)
  if (contenders.length > 1) {
    const topTorii = Math.max(...contenders.map((s) => s.toriiCount))
    contenders = contenders.filter((s) => s.toriiCount === topTorii)
  }
  if (contenders.length > 1) {
    const pinceauHolder = contenders.filter((s) => s.hasPinceau)
    if (pinceauHolder.length > 0) contenders = pinceauHolder
  }
  return contenders.map((s) => s.playerId)
}
