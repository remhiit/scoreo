import type { GameType } from '../../domain/model/gameType'
import type { Match } from '../../domain/model/match'
import type { Player } from '../../domain/model/player'

export interface MatchDisplay {
  match: Match
  gameType: GameType | undefined
  players: Record<string, Player>
  playerLabels: Record<string, string>
  winners: string[]
  dateFormatted: string
  isTieBreakIndeterminate: boolean
}

export interface HistoryState {
  displays: MatchDisplay[]
  deleteConfirmMatchId: string | undefined
  /** undefined = all games */
  selectedGameTypeFilter: string | undefined
  error: string | undefined
}

export const initialHistoryState: HistoryState = {
  displays: [],
  deleteConfirmMatchId: undefined,
  selectedGameTypeFilter: undefined,
  error: undefined,
}
