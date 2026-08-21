import type { GameType } from '../../domain/model/gameType'
import type { Trophy } from '../../domain/model/trophy'

export interface HallOfFameState {
  trophies: Trophy[]
  gameTypes: GameType[]
  selectedGameTypeId: string | undefined
}

export const initialHallOfFameState: HallOfFameState = {
  trophies: [],
  gameTypes: [],
  selectedGameTypeId: undefined,
}
