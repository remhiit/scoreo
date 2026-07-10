import type { TieBreakRule, WinCondition } from '../../domain/model/enums'
import type { GameType } from '../../domain/model/gameType'

export interface GameTypeState {
  gameTypes: GameType[]
  inputName: string
  selectedWinCondition: WinCondition
  selectedTieBreakRule: TieBreakRule
  selectedTieBreakCondition: WinCondition
  selectedTieBreakLabel: string | undefined
  selectedGameId: string | undefined
  editingGameId: string | undefined
  error: string | undefined
  archiveConfirmGameTypeId: string | undefined
}

export const initialGameTypeState: GameTypeState = {
  gameTypes: [],
  inputName: '',
  selectedWinCondition: 'HIGHEST_SCORE',
  selectedTieBreakRule: 'NONE',
  selectedTieBreakCondition: 'HIGHEST_SCORE',
  selectedTieBreakLabel: undefined,
  selectedGameId: undefined,
  editingGameId: undefined,
  error: undefined,
  archiveConfirmGameTypeId: undefined,
}
