import type { GameType } from '../../domain/model/gameType'
import type { Trophy } from '../../domain/model/trophy'
import type { GetGameTypesUseCase } from '../../application/getGameTypesUseCase'
import type { GetTrophiesUseCase } from '../../application/getTrophiesUseCase'
import type { HallOfFameState } from './hallOfFameTypes'

export type HallOfFameAction =
  | { type: 'selectGameType'; gameTypeId: string | undefined }
  | { type: 'loaded'; trophies: Trophy[]; gameTypes: GameType[] }

export function loadHallOfFame(
  getTrophies: GetTrophiesUseCase,
  getGameTypes: GetGameTypesUseCase,
  selectedGameTypeId: string | undefined,
): { trophies: Trophy[]; gameTypes: GameType[] } {
  return {
    trophies: getTrophies.invoke(selectedGameTypeId),
    gameTypes: getGameTypes.invoke(),
  }
}

export function hallOfFameReducer(state: HallOfFameState, action: HallOfFameAction): HallOfFameState {
  switch (action.type) {
    case 'selectGameType':
      return { ...state, selectedGameTypeId: action.gameTypeId }
    case 'loaded':
      return { ...state, trophies: action.trophies, gameTypes: action.gameTypes }
  }
}
