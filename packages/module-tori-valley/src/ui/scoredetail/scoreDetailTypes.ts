import type { ObjectifCardSelection } from '../../domain/model/landscape'
import type { PlayerResult } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'

export type ScoreDetailMode = { type: 'Create' } | { type: 'Edit'; matchId: string }

export interface ScoreDetailState {
  players: Player[]
  results: PlayerResult[]
  mode: ScoreDetailMode
  /** Cards dealt for this match, carried through so saving records them. */
  objectifCards: ObjectifCardSelection
  error: string | undefined
  saved: boolean
}
