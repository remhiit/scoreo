import type { PlayerResult } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'

export type ScoreDetailMode = { type: 'Create' } | { type: 'Edit'; matchId: string }

export interface ScoreDetailState {
  players: Player[]
  results: PlayerResult[]
  mode: ScoreDetailMode
  error: string | undefined
  saved: boolean
}
