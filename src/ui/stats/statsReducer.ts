import type { GameType } from '../../domain/model/gameType'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetHeadToHeadUseCase, PlayerDetail } from '../../application/getHeadToHeadUseCase'
import type { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import { groupTrophiesByPlayer, type PlayerTrophyBadge } from '../../application/groupTrophiesByPlayer'
import type { StatsState } from './statsTypes'

export type StatsAction =
  | { type: 'selectPlayer'; playerId: string }
  | { type: 'backToLeaderboard' }
  | { type: 'selectGameType'; gameTypeId: string | undefined }
  | {
      type: 'loaded'
      leaderboard: PlayerDetail[]
      gameTypes: GameType[]
      trophiesByPlayer: Map<string, PlayerTrophyBadge[]>
    }

/**
 * Mirrors StatsHandler.refresh(): recomputes the leaderboard/gameTypes/badges
 * for the current filter and resets any player selection, since a fresh
 * load (initial mount or a game type change) always returns to the
 * leaderboard.
 */
export function loadStats(
  getHeadToHead: GetHeadToHeadUseCase,
  getGameTypes: GetGameTypesUseCase,
  getTrophies: GetTrophiesUseCase,
  selectedGameTypeId: string | undefined,
): { leaderboard: PlayerDetail[]; gameTypes: GameType[]; trophiesByPlayer: Map<string, PlayerTrophyBadge[]> } {
  return {
    leaderboard: getHeadToHead.invoke(selectedGameTypeId),
    gameTypes: getGameTypes.invoke(),
    trophiesByPlayer: groupTrophiesByPlayer(getTrophies.invoke(selectedGameTypeId)),
  }
}

export function statsReducer(state: StatsState, action: StatsAction): StatsState {
  switch (action.type) {
    case 'selectPlayer':
      return { ...state, selectedPlayerId: action.playerId }
    case 'backToLeaderboard':
      return { ...state, selectedPlayerId: undefined }
    case 'selectGameType':
      return { ...state, selectedGameTypeId: action.gameTypeId }
    case 'loaded':
      return {
        ...state,
        leaderboard: action.leaderboard,
        gameTypes: action.gameTypes,
        trophiesByPlayer: action.trophiesByPlayer,
        selectedPlayerId: undefined,
      }
  }
}
