import type { GameType } from '../../domain/model/gameType'
import type { PlayerDetail } from '../../application/getHeadToHeadUseCase'

export interface StatsState {
  leaderboard: PlayerDetail[]
  selectedPlayerId: string | undefined
  gameTypes: GameType[]
  selectedGameTypeId: string | undefined
}

export const initialStatsState: StatsState = {
  leaderboard: [],
  selectedPlayerId: undefined,
  gameTypes: [],
  selectedGameTypeId: undefined,
}

export function selectedPlayer(state: StatsState): PlayerDetail | undefined {
  if (state.selectedPlayerId === undefined) return undefined
  return state.leaderboard.find((p) => p.playerId === state.selectedPlayerId)
}
