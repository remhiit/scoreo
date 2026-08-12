import type { GameType } from '../../domain/model/gameType'
import type { PlayerDetail } from '../../application/getHeadToHeadUseCase'
import type { PlayerTrophyBadge } from '../../application/groupTrophiesByPlayer'

export interface StatsState {
  leaderboard: PlayerDetail[]
  selectedPlayerId: string | undefined
  gameTypes: GameType[]
  selectedGameTypeId: string | undefined
  trophiesByPlayer: Map<string, PlayerTrophyBadge[]>
}

export const initialStatsState: StatsState = {
  leaderboard: [],
  selectedPlayerId: undefined,
  gameTypes: [],
  selectedGameTypeId: undefined,
  trophiesByPlayer: new Map(),
}

export function selectedPlayer(state: StatsState): PlayerDetail | undefined {
  if (state.selectedPlayerId === undefined) return undefined
  return state.leaderboard.find((p) => p.playerId === state.selectedPlayerId)
}
